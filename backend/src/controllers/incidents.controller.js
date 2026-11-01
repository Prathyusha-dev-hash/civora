const { Complaint, WorkOrder } = require('../models');
const { CATEGORIES, ROLES, STAFF_ROLES } = require('../config/constants');
const { config } = require('../config/env');
const pipeline = require('../services/incident.pipeline');
const duplicates = require('../services/duplicate.service');
const ai = require('../services/ai.client');
const aiCache = require('../services/aiCache');
const audit = require('../services/audit.service');
const workflow = require('../services/workflow.service');
const { serializeComplaint } = require('../services/serializers');
const { POPULATE, refFilter, scopeFor, loadComplaintView } = require('../services/complaint.query');
const { validateCoordinates } = require('../utils/gis.utils');
const { ApiError, ok, asyncHandler } = require('../utils/http');
const { clampStr, parseBool } = require('../utils/validate');

/** POST /incidents (multipart or JSON) */
const createIncident = asyncHandler(async (req, res) => {
  const id = await pipeline.submitComplaint({ user: req.user, body: req.body, files: req.files || {}, req });
  const view = await loadComplaintView(id, req.user);
  ok(res, serializeComplaint(view.complaint, req.user, view.extra), 201);
});

/** GET /incidents — scoped by role. */
const listIncidents = asyncHandler(async (req, res) => {
  const filter = { ...scopeFor(req.user) };
  const { status, category, severity, needs_review: needsReview } = req.query;
  if (status) filter.status = String(status);
  if (category && CATEGORIES.includes(category)) filter.category = category;
  if (severity) filter.severityLevel = String(severity).toUpperCase();
  if (needsReview !== undefined) filter.needsReview = parseBool(needsReview);

  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
  const page = Math.max(1, Number(req.query.page) || 1);
  const [items, total] = await Promise.all([
    Complaint.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate(POPULATE),
    Complaint.countDocuments(filter),
  ]);
  const woIds = items.map((c) => c.masterIncident?.workOrder).filter(Boolean);
  const wos = await WorkOrder.find({ _id: { $in: woIds } }).lean();
  const woById = Object.fromEntries(wos.map((w) => [String(w._id), w]));
  ok(
    res,
    items.map((c) => serializeComplaint(c, req.user, { workOrder: woById[String(c.masterIncident?.workOrder)] })),
    200,
    { total, page, limit }
  );
});

/**
 * GET /incidents/:id — public ticket tracking. Anonymous viewers receive only
 * redacted imagery and no reporter details; staff also get linked reports + AI analysis.
 */
const getIncident = asyncHandler(async (req, res) => {
  const view = await loadComplaintView(req.params.id, req.user);
  if (!view) throw ApiError.notFound(`Complaint ${req.params.id} was not found.`);
  const c = view.complaint;
  if (req.user && req.user.role !== ROLES.ADMIN && STAFF_ROLES.includes(req.user.role)) {
    // Authorities may only open complaints routed to their department
    const deptId = String(req.user.department?._id || '');
    if (String(c.assignedDepartment?._id || '') !== deptId) throw ApiError.forbidden('This complaint is assigned to another department.');
  }
  ok(res, serializeComplaint(c, req.user, view.extra));
});

/** POST /incidents/duplicates/check — pre-submission duplicate lookup. */
const checkDuplicates = asyncHandler(async (req, res) => {
  const lat = Number(req.body.lat ?? req.body.location?.lat);
  const lng = Number(req.body.lng ?? req.body.location?.lng);
  const coord = validateCoordinates(lat, lng);
  if (!coord.isValid) throw ApiError.unprocessable(coord.message, [{ field: 'lat/lng', issue: 'invalid' }]);
  const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'other';
  const lang = String(req.body.originalLanguage || req.body.original_language || 'en').split('-')[0];
  let text = clampStr(req.body.englishTranslation || req.body.english_translation || '', 5000);
  const original = clampStr(req.body.description || req.body.original_text || '', 5000);

  if (!text && original && lang !== 'en') {
    const key = aiCache.key('translate', lang, original);
    try {
      const tr = aiCache.get(key) || (await ai.translate(original, lang, 'en'));
      aiCache.set(key, tr);
      text = tr.translated_text;
    } catch {
      text = original;
    }
  }
  text = text || original;

  let embedding = null;
  if (text) {
    try {
      embedding = (await ai.embedTexts([text])).embeddings[0];
    } catch {
      embedding = null; // falls back to word-overlap similarity
    }
  }

  const candidates = await duplicates.evaluate({ text, embedding, imageHashes: [], category, lat: coord.latitude, lng: coord.longitude });
  const likely = candidates.filter((x) => x.isDuplicate || x.scores.combined >= config.duplicates.threshold * 0.85).slice(0, 3);
  const data = likely.map((x) => ({
    id: x.primary.ticketNumber,
    complaint_id: x.primary.ticketNumber,
    ticket_number: x.primary.ticketNumber,
    master_incident_id: x.master.incidentNumber,
    category: x.primary.category,
    original_text: x.primary.originalText,
    english_translation: x.primary.englishTranslation,
    original_language: x.primary.originalLanguage,
    input_method: x.primary.inputMethod,
    has_audio: Boolean(x.primary.audio),
    similarity_score: Math.round(x.scores.combined * 100),
    distance_meters: x.scores.distanceMeters,
    approx_location: `${x.scores.distanceMeters}m away`,
    status: x.master.status,
    support_count: x.master.complaintCount,
    created_at: x.primary.createdAt,
    is_sandbox: false,
  }));
  ok(res, { has_duplicates: data.length > 0, duplicates: data });
});

/** POST /incidents/:id/support — a citizen endorses an existing complaint instead of filing a new one. */
const supportIncident = asyncHandler(async (req, res) => {
  const c = await Complaint.findOne(refFilter(req.params.id));
  if (!c) throw ApiError.notFound(`Complaint ${req.params.id} was not found.`);
  const updated = await Complaint.findOneAndUpdate(
    { _id: c._id, supporters: { $ne: req.user._id } },
    { $addToSet: { supporters: req.user._id }, $inc: { supportCount: 1 } },
    { new: true }
  );
  if (updated) {
    await audit.record({ actor: req.user, action: 'COMPLAINT_SUPPORTED', entityType: 'Complaint', entityId: c._id, ticketNumber: c.ticketNumber, newState: String(updated.supportCount), req });
  }
  ok(res, { success: true, alreadySupported: !updated, updatedSupportCount: (updated || c).supportCount });
});

/** POST /incidents/:id/feedback — citizen confirms or disputes a reported resolution. */
const submitFeedback = asyncHandler(async (req, res) => {
  const result = await workflow.citizenFeedback({ user: req.user, ref: req.params.id, confirmed: parseBool(req.body.confirmed), notes: clampStr(req.body.feedback_notes || req.body.feedbackNotes || '', 2000), req });
  ok(res, result);
});

module.exports = { createIncident, listIncidents, getIncident, checkDuplicates, supportIncident, submitFeedback };
