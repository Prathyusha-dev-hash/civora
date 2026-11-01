/**
 * Frontend-facing AI endpoints used during the report wizard (preview step).
 * Results are cached by content hash so the final submission reuses them.
 */
const crypto = require('crypto');
const ai = require('../services/ai.client');
const aiCache = require('../services/aiCache');
const routing = require('../services/routing.service');
const workflow = require('../services/workflow.service');
const { storeEvidence, sniffType } = require('../services/evidence.service');
const { ruleBasedSeverity } = require('../services/fallback.service');
const { signedFileUrl } = require('../storage/signedUrl');
const { Complaint, WorkOrder } = require('../models');
const { refFilter } = require('../services/complaint.query');
const { CATEGORIES, EVIDENCE_KIND, LANGUAGES } = require('../config/constants');
const { config } = require('../config/env');
const { ApiError, ok, asyncHandler } = require('../utils/http');
const { clampStr } = require('../utils/validate');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const baseLang = (c) => (c ? String(c).split('-')[0].toLowerCase() : null);

function requireFile(file, family, field) {
  if (!file?.buffer?.length) throw ApiError.unprocessable(`${field} file is required.`, [{ field, issue: 'required' }]);
  const type = sniffType(file.buffer);
  if (!type || type.family !== family) throw ApiError.unprocessable(`Unsupported ${family} format.`, [{ field, issue: 'INVALID_FILE_TYPE' }]);
  return type;
}

function asAiError(err) {
  if (err instanceof ApiError) return err;
  return new ApiError(err.status === 422 ? 422 : 503, err.code || 'AI_SERVICE_UNAVAILABLE', err.message);
}

// Citizen-facing wording for provider failures; the raw provider message is logged, never returned
const FRIENDLY_AI_ERRORS = {
  AI_RATE_LIMITED: 'Photo analysis is busy right now. Please try again in a minute.',
  AI_TIMEOUT: 'Photo analysis took too long. Please try again.',
};

function asCitizenAiError(err, label) {
  if (err instanceof ApiError) return err;
  if (err.status === 422) return new ApiError(422, err.code || 'INVALID_INPUT', err.message);
  console.error(`[AI] ${label} failed (${err.code || 'ERROR'}): ${err.message}`);
  const message = FRIENDLY_AI_ERRORS[err.code] || 'Photo analysis is temporarily unavailable. You can still submit your complaint; officers will review the photo.';
  return new ApiError(503, err.code || 'AI_SERVICE_UNAVAILABLE', message);
}

/** Keeps only the fields the severity model reads from client-supplied photo findings. */
function sanitizeImageFindings(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, config.storage.maxImagesPerComplaint).map((f, index) => ({
    index,
    detected_issue: clampStr(f?.detected_issue, 120),
    visual_severity: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(f?.visual_severity) ? f.visual_severity : 'MODERATE',
    is_relevant: Boolean(f?.is_relevant),
  }));
}

/** POST /ai/transcribe  multipart { audio, language } */
const transcribe = asyncHandler(async (req, res) => {
  const file = req.files?.audio?.[0];
  const type = requireFile(file, 'audio', 'audio');
  const key = aiCache.key('transcribe', sha256(file.buffer));
  try {
    const result = aiCache.get(key) || (await ai.transcribe(file.buffer, type.mime, req.body.language));
    aiCache.set(key, result);
    if (result.is_speech === false || !result.transcript) throw ApiError.unprocessable('No intelligible speech was detected. Please record again closer to the microphone.');
    ok(res, {
      transcript: result.transcript,
      confidence: result.confidence,
      language: result.detected_language,
      detected_language: result.detected_language,
      english_translation: result.english_translation,
    });
  } catch (err) {
    throw asAiError(err);
  }
});

/** POST /ai/translate  { text, source_language, target_language } */
const translate = asyncHandler(async (req, res) => {
  const text = clampStr(req.body.text, 5000);
  const src = baseLang(req.body.source_language || req.body.sourceLanguage);
  const tgt = baseLang(req.body.target_language || req.body.targetLanguage) || 'en';
  if (!text) throw ApiError.unprocessable('text is required.', [{ field: 'text', issue: 'required' }]);
  if (src && !LANGUAGES.includes(src)) throw ApiError.unprocessable(`Unsupported source language "${src}".`);
  const key = aiCache.key('translate', src || '', text);
  try {
    const result = (tgt === 'en' && aiCache.get(key)) || (await ai.translate(text, src, tgt));
    if (tgt === 'en') aiCache.set(key, result);
    ok(res, result);
  } catch (err) {
    throw asAiError(err);
  }
});

/**
 * POST /ai/redact-pii  multipart { image }
 * Stores the blurred copy as STAGED evidence; the submission attaches it via redacted_evidence_ids.
 */
const redactPii = asyncHandler(async (req, res) => {
  const file = req.files?.image?.[0];
  const type = requireFile(file, 'image', 'image');
  let result;
  try {
    result = await ai.redactImage(file.buffer, type.mime);
  } catch (err) {
    throw asAiError(err);
  }
  const staged = await storeEvidence(
    { buffer: Buffer.from(result.image_base64, 'base64'), originalname: `redacted-${file.originalname || 'image'}.jpg`, fieldname: 'image' },
    { kind: EVIDENCE_KIND.REDACTED_IMAGE, status: 'STAGED', uploadedBy: req.user._id, visibility: 'PUBLIC' }
  );
  ok(res, {
    redacted: true,
    redacted_image_url: signedFileUrl(staged._id),
    redacted_evidence_id: String(staged._id),
    faces_detected: result.faces_detected,
    license_plates_detected: result.license_plates_detected,
    processing_time_ms: result.processing_time_ms,
  });
});

/** POST /ai/assess-severity  { category, description, location } — preview for the citizen. */
const assessSeverity = asyncHandler(async (req, res) => {
  const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'other';
  const description = clampStr(req.body.description, 5000);
  if (description.length < 3) throw ApiError.unprocessable('description is required.', [{ field: 'description', issue: 'required' }]);
  let result;
  try {
    result = await ai.assessSeverity({
      category,
      description,
      address: clampStr(req.body.location?.address || '', 300),
      image_findings: sanitizeImageFindings(req.body.image_findings),
      linked_report_count: 1,
    });
  } catch {
    result = ruleBasedSeverity(category, description);
  }
  const dept = await routing.departmentForCategory(category);
  ok(res, {
    severity_level: result.severity_level,
    score: result.score,
    factors: result.factors,
    explanation: result.explanation,
    suggested_department: dept.name,
    target_sla_hours: routing.slaHoursFor(result.severity_level),
    method: result.method || 'gemini',
    is_fallback: result.method === 'RULE_BASED_FALLBACK',
  });
});

/**
 * POST /ai/analyze-image  multipart { image, category, description } — citizen preview.
 * Nothing is stored; the submitted complaint is analysed again server-side as the record of truth.
 */
const analyzeImage = asyncHandler(async (req, res) => {
  const file = req.files?.image?.[0];
  const type = requireFile(file, 'image', 'image');
  if (file.buffer.length > config.storage.maxImageBytes) {
    throw new ApiError(413, 'FILE_TOO_LARGE', `Image exceeds the ${Math.round(config.storage.maxImageBytes / 1048576)}MB limit.`);
  }
  const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'other';
  const description = clampStr(req.body.description, 1500);
  const key = aiCache.key('analyze-image', sha256(file.buffer), category, description);

  let result;
  try {
    result = aiCache.get(key) || (await ai.analyzeImages([{ buffer: file.buffer, mimeType: type.mime, id: 'preview' }], { category, description }));
  } catch (err) {
    throw asCitizenAiError(err, 'Image analysis');
  }
  const finding = result.images?.[0];
  if (!finding) throw new ApiError(503, 'AI_EMPTY_RESULT', 'Photo analysis returned no result. Please try again.');
  aiCache.set(key, result);

  // Department and SLA come from the routing table, never from the model
  const isIssue = finding.status === 'CIVIC_ISSUE';
  const dept = isIssue ? await routing.departmentForCategory(finding.suggested_category) : null;
  ok(res, {
    status: finding.status,
    is_civic_issue: finding.is_civic_issue,
    is_relevant: finding.is_relevant,
    matches_category: finding.matches_category,
    quality_ok: finding.quality_ok,
    issue_type: finding.issue_type,
    detected_issue: finding.detected_issue,
    description: finding.description,
    visible_observations: finding.visible_observations || [],
    evidence: finding.evidence || [],
    uncertainties: finding.uncertainties || [],
    warnings: finding.warnings || [],
    suggested_category: finding.suggested_category,
    suggested_department: dept?.name || null,
    visual_severity: isIssue ? finding.visual_severity : null,
    target_sla_hours: isIssue ? routing.slaHoursFor(finding.visual_severity) : null,
    confidence: finding.confidence,
    image_findings: result.images,
    model: result.model,
    disclaimer: 'AI suggestion based only on what is visible in the photo. Officers confirm the actual severity on site.',
  });
});

/** POST /ai/verify-resolution  multipart { incident_id, resolution_image } — authority preview. */
const verifyResolution = asyncHandler(async (req, res) => {
  const file = req.files?.resolution_image?.[0];
  const type = requireFile(file, 'image', 'resolution_image');
  const ref = req.body.work_order_id || req.body.incident_id;
  if (!ref) throw ApiError.unprocessable('incident_id or work_order_id is required.');

  let wo;
  if (/^WO-/i.test(ref)) {
    wo = await workflow.loadWorkOrderFor(req.user, ref);
  } else {
    const c = await Complaint.findOne(refFilter(ref));
    if (!c) throw ApiError.notFound(`Complaint ${ref} was not found.`);
    const found = await WorkOrder.findOne({ masterIncident: c.masterIncident });
    if (!found) throw ApiError.notFound('No work order exists for this complaint yet.');
    wo = await workflow.loadWorkOrderFor(req.user, found.workOrderNumber);
  }
  try {
    const v = await workflow.verifyResolutionImage({ wo, buffer: file.buffer, mimeType: type.mime });
    ok(res, v);
  } catch (err) {
    throw asAiError(err);
  }
});

module.exports = { transcribe, translate, redactPii, assessSeverity, analyzeImage, verifyResolution };
