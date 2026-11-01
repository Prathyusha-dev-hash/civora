/**
 * Complaint intake pipeline:
 *   files stored -> complaint persisted -> translation -> image verification,
 *   redaction, embedding -> severity -> duplicate detection -> master incident /
 *   work order -> department + SLA -> notifications -> audit.
 *
 * The complaint and its files are committed BEFORE any AI call, so an AI
 * outage never loses a submission. processComplaint() is safe to re-run and is
 * used at startup to finish complaints interrupted by a crash.
 */
const { Complaint, Evidence, MasterIncident, WorkOrder, AiAnalysis, nextId } = require('../models');
const { CATEGORIES, LANGUAGES, EVIDENCE_KIND, WORK_ORDER_TO_COMPLAINT_STATUS } = require('../config/constants');
const { config } = require('../config/env');
const ai = require('./ai.client');
const aiCache = require('./aiCache');
const { storeEvidence, readEvidenceBuffer, deleteEvidence } = require('./evidence.service');
const routing = require('./routing.service');
const duplicates = require('./duplicate.service');
const { ruleBasedSeverity } = require('./fallback.service');
const notifications = require('./notification.service');
const audit = require('./audit.service');
const { validateCoordinates } = require('../utils/gis.utils');
const { ApiError } = require('../utils/http');
const { Validator, clampStr, parseMaybeJson } = require('../utils/validate');

const baseLang = (code) => (code ? String(code).split('-')[0].toLowerCase() : 'en');

/**
 * Normalises JSON or multipart submissions (frontend toCreateIncidentDTO shape).
 */
function parseSubmission(body) {
  const location = parseMaybeJson(body.location, null) || {};
  const lat = Number(location.lat ?? body.lat ?? body.location_lat);
  const lng = Number(location.lng ?? body.lng ?? body.location_lng);
  const originalText = clampStr(body.original_text ?? body.original_description ?? body.description ?? '', 5000);
  const language = baseLang(body.original_language || 'en');
  const inputMethod = body.input_method === 'audio' ? 'audio' : 'text';
  let redactedIds = parseMaybeJson(body.redacted_evidence_ids, null);
  if (!redactedIds && typeof body.redacted_evidence_ids === 'string') redactedIds = body.redacted_evidence_ids.split(',');

  const v = new Validator();
  v.check(CATEGORIES.includes(body.category), 'category', `must be one of ${CATEGORIES.join(', ')}`);
  v.check(LANGUAGES.includes(language), 'original_language', `must be one of ${LANGUAGES.join(', ')}`);
  const coord = validateCoordinates(lat, lng);
  v.check(coord.isValid, 'location', coord.message || 'lat/lng required');
  if (inputMethod === 'text') v.check(originalText.length >= 10, 'original_text', 'must be at least 10 characters');
  v.throwIfInvalid('Complaint submission is invalid.');

  return {
    category: body.category,
    inputMethod,
    originalLanguage: language,
    originalText,
    transcriptionStatus: body.transcription_status,
    location: { lat: coord.latitude, lng: coord.longitude },
    address: clampStr(location.address ?? body.address ?? '', 300),
    ward: clampStr(location.ward ?? body.ward ?? '', 80),
    redactedEvidenceIds: Array.isArray(redactedIds) ? redactedIds.filter(Boolean).map(String).slice(0, 10) : [],
  };
}

async function submitComplaint({ user, body, files = {}, req }) {
  const input = parseSubmission(body);
  const imageFiles = files.images || [];
  const audioFile = (files.audio || [])[0] || null;

  if (imageFiles.length > config.storage.maxImagesPerComplaint) {
    throw ApiError.unprocessable(`At most ${config.storage.maxImagesPerComplaint} images per complaint.`);
  }
  if (input.inputMethod === 'audio' && !audioFile) {
    throw ApiError.unprocessable('Voice complaints must include the original audio recording.', [{ field: 'audio', issue: 'required' }]);
  }

  const created = [];
  let complaint;
  let aiTranscript = null;
  try {
    for (const file of imageFiles) {
      created.push(await storeEvidence(file, { kind: EVIDENCE_KIND.IMAGE, uploadedBy: user._id, visibility: 'RESTRICTED' }));
    }
    const audio = audioFile ? await storeEvidence(audioFile, { kind: EVIDENCE_KIND.AUDIO, uploadedBy: user._id, visibility: 'RESTRICTED' }) : null;
    if (audio) created.push(audio);

    const staged = input.redactedEvidenceIds.length
      ? await Evidence.find({ _id: { $in: input.redactedEvidenceIds }, status: 'STAGED', uploadedBy: user._id, kind: EVIDENCE_KIND.REDACTED_IMAGE })
      : [];

    let originalText = input.originalText;
    let transcriptionStatus = 'none';
    if (audio) {
      aiTranscript = aiCache.get(aiCache.key('transcribe', audio.sha256));
      if (!originalText) {
        // Client did not send a transcript: transcribe server-side
        try {
          aiTranscript = await ai.transcribe(audioFile.buffer, audio.mimeType, input.originalLanguage);
          originalText = aiTranscript.transcript;
        } catch (err) {
          throw ApiError.unavailable(`Speech transcription is unavailable (${err.message}). Please type your complaint or try again.`);
        }
      }
      transcriptionStatus = 'transcribed';
      if (!originalText || originalText.trim().length < 3) throw ApiError.unprocessable('No speech could be transcribed from the recording.');
    }

    complaint = await Complaint.create({
      ticketNumber: await nextId('CIV'),
      reporter: user._id,
      category: input.category,
      inputMethod: input.inputMethod,
      originalLanguage: input.originalLanguage,
      originalText,
      transcriptionStatus,
      translationStatus: input.originalLanguage === 'en' ? 'NOT_APPLICABLE' : 'PENDING',
      location: { type: 'Point', coordinates: [input.location.lng, input.location.lat] },
      address: input.address,
      ward: input.ward,
      images: created.filter((e) => e.kind === EVIDENCE_KIND.IMAGE).map((e) => e._id),
      redactedImages: staged.map((e) => e._id),
      audio: audio ? audio._id : null,
      supporters: [user._id],
      statusHistory: [{ status: 'SUBMITTED', by: user._id, note: 'Complaint submitted by citizen' }],
    });
  } catch (err) {
    for (const ev of created) await deleteEvidence(ev);
    throw err;
  }

  await Evidence.updateMany(
    { _id: { $in: [...complaint.images, ...complaint.redactedImages, complaint.audio].filter(Boolean) } },
    { $set: { complaint: complaint._id, status: 'ATTACHED' } }
  );
  await audit.record({ actor: user, action: 'COMPLAINT_SUBMITTED', entityType: 'Complaint', entityId: complaint._id, ticketNumber: complaint.ticketNumber, newState: 'SUBMITTED', metadata: { images: complaint.images.length, audio: Boolean(complaint.audio), language: complaint.originalLanguage }, req });

  try {
    await processComplaint(complaint._id, { aiTranscript });
  } catch (err) {
    // The complaint is already persisted; recoverPendingComplaints() retries it on next startup
    console.error(`[Pipeline] Processing failed for ${complaint.ticketNumber}:`, err);
    await audit.record({ action: 'PIPELINE_ERROR', entityType: 'Complaint', entityId: complaint._id, ticketNumber: complaint.ticketNumber, notes: err.message });
  }
  return complaint._id;
}

/* ------------------------------------------------------------------ */

async function runTranslation(c, errors) {
  if (c.originalLanguage === 'en') {
    return { text: c.originalText, status: 'NOT_APPLICABLE', metadata: null, source: 'original' };
  }
  const cacheKey = aiCache.key('translate', c.originalLanguage, c.originalText);
  try {
    const result = aiCache.get(cacheKey) || (await ai.translate(c.originalText, c.originalLanguage, 'en'));
    aiCache.set(cacheKey, result);
    return { text: result.translated_text, status: 'TRANSLATED', metadata: result.metadata, source: 'gemini' };
  } catch (err) {
    errors.push({ stage: 'translation', message: err.message });
    return { text: null, status: 'FAILED', metadata: null, source: null };
  }
}

async function analyzeImages(c, englishText, errors) {
  if (!c.images.length) return null;
  try {
    const payload = await Promise.all(c.images.map(async (ev) => ({ id: String(ev._id), mimeType: ev.mimeType, buffer: await readEvidenceBuffer(ev) })));
    const res = await ai.analyzeImages(payload, { category: c.category, description: englishText });
    res.images = res.images.map((f) => ({ ...f, evidence_id: String(c.images[f.index]?._id || '') }));
    return res;
  } catch (err) {
    errors.push({ stage: 'image_verification', message: err.message });
    return null;
  }
}

async function redactImages(c, errors) {
  // Skip if the citizen already produced redacted versions via the preview step
  if (!c.images.length || c.redactedImages.length) return [];
  const out = [];
  for (const ev of c.images) {
    try {
      const res = await ai.redactImage(await readEvidenceBuffer(ev), ev.mimeType);
      const redacted = await storeEvidence(
        { buffer: Buffer.from(res.image_base64, 'base64'), originalname: `redacted-${ev.originalName || 'image'}.jpg`, fieldname: 'redacted' },
        { kind: EVIDENCE_KIND.REDACTED_IMAGE, complaint: c._id, uploadedBy: ev.uploadedBy, visibility: 'PUBLIC', derivedFrom: ev._id }
      );
      out.push({ evidence: redacted, faces: res.faces_detected, plates: res.license_plates_detected });
    } catch (err) {
      errors.push({ stage: 'redaction', message: err.message });
    }
  }
  return out;
}

async function embedText(text, errors) {
  if (!text) return null;
  try {
    const res = await ai.embedTexts([text]);
    return { vector: res.embeddings[0], model: res.model };
  } catch (err) {
    errors.push({ stage: 'embedding', message: err.message });
    return null;
  }
}

async function assessSeverity(c, englishText, imageResult, errors) {
  try {
    const res = await ai.assessSeverity({
      category: c.category,
      description: englishText || c.originalText,
      original_language: c.originalLanguage,
      image_findings: imageResult?.images || [],
      address: c.address,
      linked_report_count: 1,
    });
    return res;
  } catch (err) {
    errors.push({ stage: 'severity', message: err.message });
    return ruleBasedSeverity(c.category, englishText || c.originalText);
  }
}

function titleFor(c, englishText, imageResult) {
  const issue = imageResult?.images?.find((f) => f.is_relevant)?.detected_issue;
  const base = issue || (englishText || c.originalText).split(/[.!?\n]/)[0];
  const trimmed = base.length > 70 ? `${base.slice(0, 67)}...` : base;
  return c.address ? `${trimmed} - ${c.address.slice(0, 60)}` : trimmed;
}

async function createMasterIncident(c, { level, score, title }) {
  const dept = await routing.departmentForCategory(c.category);
  const hours = routing.slaHoursFor(level);
  const deadline = routing.deadlineFrom(c.createdAt, hours);

  const master = await MasterIncident.create({
    incidentNumber: await nextId('MI'),
    category: c.category,
    title,
    primaryComplaint: c._id,
    location: c.location,
    address: c.address,
    department: dept._id,
    severityLevel: level,
    severityScore: score,
    status: 'ASSIGNED',
    firstReportedAt: c.createdAt,
    lastReportedAt: c.createdAt,
  });
  const wo = new WorkOrder({
    workOrderNumber: await nextId('WO'),
    masterIncident: master._id,
    primaryComplaint: c._id,
    department: dept._id,
    priority: level,
    slaDeadline: deadline,
    status: 'ASSIGNED',
  });
  wo.log('WORK_ORDER_CREATED', 'Civora Triage', `Auto-routed to ${dept.name} with ${level} priority (SLA ${hours}h).`);
  await wo.save();
  master.workOrder = wo._id;
  await master.save();

  c.masterIncident = master._id;
  c.isPrimary = true;
  c.assignedDepartment = dept._id;
  c.targetSlaHours = hours;
  c.slaDeadline = deadline;
  c.pushStatus('ASSIGNED', null, `Assigned to ${dept.name}`);

  await notifications.toDepartment(dept._id, {
    type: 'NEW_WORK_ORDER',
    priority: level === 'CRITICAL' ? 'URGENT' : 'INFO',
    title: `New ${level} work order ${wo.workOrderNumber}`,
    message: `${title} (ticket ${c.ticketNumber}). SLA ${hours}h.`,
    params: { workOrderId: wo.workOrderNumber, complaintId: c.ticketNumber, category: c.category },
    complaint: c._id,
    ticketNumber: c.ticketNumber,
    workOrder: wo._id,
    linkUrl: '/authority',
    actionType: 'VIEW_WORK_ORDER',
  });
  if (level === 'CRITICAL') {
    await notifications.toAdmins({
      type: 'CRITICAL_INCIDENT',
      priority: 'URGENT',
      title: `Critical incident ${master.incidentNumber}`,
      message: `${title} routed to ${dept.name}.`,
      params: { complaintId: c.ticketNumber, workOrderId: wo.workOrderNumber },
      complaint: c._id,
      ticketNumber: c.ticketNumber,
      linkUrl: '/admin',
    });
  }
  await audit.record({ action: 'MASTER_INCIDENT_CREATED', entityType: 'MasterIncident', entityId: master._id, ticketNumber: c.ticketNumber, newState: master.incidentNumber });
  await audit.record({ action: 'WORK_ORDER_CREATED', entityType: 'WorkOrder', entityId: wo._id, ticketNumber: c.ticketNumber, newState: 'ASSIGNED', notes: `${wo.workOrderNumber} -> ${dept.name}, ${level}, SLA ${hours}h` });
  return { master, workOrder: wo, department: dept, linked: false };
}

async function linkToMasterIncident(c, match, { level, score }) {
  const master = match.master;
  const wo = await WorkOrder.findById(master.workOrder);

  master.complaintCount += 1;
  master.duplicateCount = master.complaintCount - 1;
  master.lastReportedAt = new Date();
  // Repeated independent reports raise urgency (community signal), never lower it
  const boosted = Math.min(10, Math.max(master.severityScore, score) + Math.min(1.5, 0.25 * master.duplicateCount));
  const previousLevel = master.severityLevel;
  master.severityScore = Number(boosted.toFixed(1));
  master.severityLevel = routing.maxSeverity(routing.maxSeverity(master.severityLevel, level), routing.levelFromScore(boosted));
  await master.save();

  if (wo) {
    wo.log('LINKED_REPORT_ADDED', 'Civora Triage', `Duplicate report ${c.ticketNumber} linked (match ${(match.scores.combined * 100).toFixed(0)}%, ${match.scores.distanceMeters}m away). Total reports: ${master.complaintCount}.`);
    if (routing.severityRank(master.severityLevel) > routing.severityRank(wo.priority)) {
      const tighter = routing.deadlineFrom(master.firstReportedAt, routing.slaHoursFor(master.severityLevel));
      wo.log('PRIORITY_ESCALATED', 'Civora Triage', `${wo.priority} -> ${master.severityLevel} after repeated reports.`);
      wo.priority = master.severityLevel;
      if (!wo.slaDeadline || tighter < wo.slaDeadline) wo.slaDeadline = tighter;
    }
    await wo.save();
  }

  c.masterIncident = master._id;
  c.isPrimary = false;
  c.duplicateOf = match.primary._id;
  c.duplicateScore = match.scores.combined;
  c.assignedDepartment = master.department;
  c.slaDeadline = wo?.slaDeadline || null;
  c.targetSlaHours = routing.slaHoursFor(master.severityLevel);
  c.pushStatus(WORK_ORDER_TO_COMPLAINT_STATUS[wo?.status] || 'ASSIGNED', null, `Linked to existing incident ${master.incidentNumber}`);

  await notifications.toDepartment(master.department, {
    type: 'NEW_LINKED_REPORT',
    priority: 'INFO',
    title: `Another citizen reported ${wo ? wo.workOrderNumber : master.incidentNumber}`,
    message: `Report ${c.ticketNumber} was grouped with this incident. ${master.complaintCount} reports in total.`,
    params: { workOrderId: wo?.workOrderNumber, complaintId: c.ticketNumber, count: master.complaintCount },
    complaint: c._id,
    ticketNumber: c.ticketNumber,
    workOrder: wo?._id || null,
    linkUrl: '/authority',
  });
  await audit.record({ action: 'DUPLICATE_LINKED', entityType: 'Complaint', entityId: c._id, ticketNumber: c.ticketNumber, newState: master.incidentNumber, metadata: match.scores, notes: `Grouped under ${master.incidentNumber} (primary ${match.primary.ticketNumber})` });
  if (previousLevel !== master.severityLevel) {
    await audit.record({ action: 'SEVERITY_ESCALATED', entityType: 'MasterIncident', entityId: master._id, ticketNumber: match.primary.ticketNumber, previousState: previousLevel, newState: master.severityLevel, notes: 'Escalated by repeated citizen reports' });
  }
  return { master, workOrder: wo, linked: true };
}

/**
 * Runs AI analysis, duplicate grouping and routing for one complaint.
 */
async function processComplaint(complaintId, { aiTranscript = null } = {}) {
  const c = await Complaint.findById(complaintId).populate('images redactedImages audio');
  if (!c || c.masterIncident) return c;

  const started = Date.now();
  const errors = [];

  // 1. Translation (original text is never modified)
  const tr = await runTranslation(c, errors);
  c.englishTranslation = tr.text;
  c.translationStatus = tr.status;
  c.translationMetadata = tr.metadata;
  const englishText = tr.text || c.originalText;

  // 2. Image verification, PII redaction and semantic embedding in parallel
  const [imageResult, redactions, embedding] = await Promise.all([analyzeImages(c, englishText, errors), redactImages(c, errors), embedText(englishText, errors)]);
  if (redactions.length) c.redactedImages = redactions.map((r) => r.evidence._id);
  if (embedding) c.textEmbedding = embedding.vector;

  // 3. Severity
  const sev = await assessSeverity(c, englishText, imageResult, errors);
  c.severityLevel = sev.severity_level;
  c.severityScore = sev.score;

  // 4. Review flags (AI never silently rejects a citizen complaint)
  const reasons = [];
  if (imageResult && !imageResult.overall_relevant) reasons.push('IMAGE_NOT_RELEVANT');
  if (sev.is_valid_civic_complaint === false) reasons.push('POSSIBLY_NOT_CIVIC');
  if (sev.suggested_category && sev.suggested_category !== c.category && sev.category_confidence >= 0.8) reasons.push(`CATEGORY_MISMATCH:${sev.suggested_category}`);
  if (sev.method === 'RULE_BASED_FALLBACK') reasons.push('AI_UNAVAILABLE');
  if (tr.status === 'FAILED') reasons.push('TRANSLATION_FAILED');
  c.reviewReasons = reasons;
  c.needsReview = reasons.length > 0;

  // 5. Duplicate detection
  const probe = {
    text: englishText,
    embedding: embedding?.vector,
    imageHashes: c.images.map((e) => e.perceptualHash).filter(Boolean),
    category: c.category,
    lat: c.location.coordinates[1],
    lng: c.location.coordinates[0],
  };
  const candidates = await duplicates.evaluate(probe, { excludeComplaintId: c._id });
  const match = candidates.find((x) => x.isDuplicate);

  // 6. Group + route
  const outcome = match
    ? await linkToMasterIncident(c, match, { level: sev.severity_level, score: sev.score })
    : await createMasterIncident(c, { level: sev.severity_level, score: sev.score, title: titleFor(c, englishText, imageResult) });

  const deptDoc = outcome.department || { _id: outcome.master.department };
  const aiStages = ['translation', 'image_verification', 'redaction', 'embedding', 'severity'];
  const failed = new Set(errors.map((e) => e.stage));
  const anyAiSucceeded = aiStages.some((s) => !failed.has(s)) && !(failed.has('severity') && failed.has('embedding'));
  c.aiStatus = errors.length === 0 ? 'COMPLETED' : anyAiSucceeded ? 'PARTIAL' : 'FALLBACK';

  const analysis = await AiAnalysis.create({
    complaint: c._id,
    status: c.aiStatus,
    provider: 'gemini',
    models: { severity: sev.model || null, embedding: embedding?.model || null },
    transcription: c.audio
      ? { text: c.originalText, language: c.originalLanguage, source: 'citizen-reviewed', aiTranscript: aiTranscript?.transcript || null, aiConfidence: aiTranscript?.confidence ?? null }
      : null,
    translation: { text: tr.text, sourceLanguage: c.originalLanguage, status: tr.status, source: tr.source, metadata: tr.metadata },
    imageVerification: imageResult,
    severity: { level: sev.severity_level, score: sev.score, factors: sev.factors, explanation: sev.explanation, method: sev.method, suggestedCategory: sev.suggested_category, categoryConfidence: sev.category_confidence },
    routing: { category: c.category, department: String(deptDoc._id), method: 'DEPARTMENT_ROUTING_TABLE' },
    duplicate: {
      isDuplicate: Boolean(match),
      masterIncident: outcome.master.incidentNumber,
      matchedPrimary: match ? match.primary.ticketNumber : null,
      scores: match ? match.scores : null,
      candidatesEvaluated: candidates.length,
      topCandidates: candidates.slice(0, 3).map((x) => ({ incident: x.master.incidentNumber, ...x.scores, isDuplicate: x.isDuplicate })),
    },
    stageErrors: errors,
    durationMs: Date.now() - started,
  });
  c.latestAnalysis = analysis._id;
  await c.save();

  await audit.record({ action: 'AI_ANALYSIS_COMPLETED', entityType: 'Complaint', entityId: c._id, ticketNumber: c.ticketNumber, newState: c.aiStatus, notes: `Severity ${c.severityLevel} (${sev.method || 'gemini'}); ${match ? 'duplicate of ' + outcome.master.incidentNumber : 'new incident ' + outcome.master.incidentNumber}`, metadata: { errors } });

  await notifications.toUser(c.reporter, {
    type: match ? 'COMPLAINT_LINKED' : 'COMPLAINT_REGISTERED',
    priority: 'INFO',
    title: match ? `Your report ${c.ticketNumber} joined an existing incident` : `Complaint ${c.ticketNumber} registered`,
    message: match
      ? `${outcome.master.complaintCount} citizens have reported this issue. It is already with the responsible department.`
      : `Severity ${c.severityLevel}. Routed to the responsible department.`,
    params: { complaintId: c.ticketNumber, category: c.category },
    complaint: c._id,
    ticketNumber: c.ticketNumber,
    linkUrl: `/citizen?ticketId=${c.ticketNumber}`,
    actionType: 'VIEW_TICKET',
  });
  return c;
}

/**
 * Finishes complaints whose processing was interrupted (e.g. server restart).
 */
async function recoverPendingComplaints() {
  const stale = await Complaint.find({ aiStatus: 'PENDING', masterIncident: null, createdAt: { $lt: new Date(Date.now() - 30 * 1000) } }).select('_id ticketNumber').limit(50);
  for (const c of stale) {
    try {
      await processComplaint(c._id);
      console.log(`[Pipeline] Recovered interrupted complaint ${c.ticketNumber}`);
    } catch (err) {
      console.error(`[Pipeline] Recovery failed for ${c.ticketNumber}:`, err.message);
    }
  }
  return stale.length;
}

module.exports = { submitComplaint, processComplaint, recoverPendingComplaints, parseSubmission };
