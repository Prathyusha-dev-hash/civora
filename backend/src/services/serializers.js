/**
 * Maps persisted documents to the JSON shapes consumed by the Civora frontend
 * mappers (src/services/mappers/*). Field names follow BACKEND_INTEGRATION_SPEC.md.
 * Signed file URLs are only produced for files the viewer may access.
 */
const { signedFileUrl } = require('../storage/signedUrl');
const { STAFF_ROLES } = require('../config/constants');

const idOf = (v) => (v && v._id ? String(v._id) : v ? String(v) : null);
const deptName = (d) => (d && typeof d === 'object' ? d.name : null);
const iso = (d) => (d ? new Date(d).toISOString() : null);

function serializeUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    department: deptName(user.department) || (user.role === 'CITIZEN' ? 'Civic Resident' : null),
    phone: user.phone || '',
    address: user.address || '',
    created_at: iso(user.createdAt),
    is_sandbox: false,
  };
}

function isStaff(viewer) {
  return Boolean(viewer && STAFF_ROLES.includes(viewer.role));
}

function canSeeRestricted(viewer, complaint) {
  if (!viewer) return false;
  if (isStaff(viewer)) return true;
  return idOf(complaint.reporter) === String(viewer._id);
}

function evidenceUrl(ev, viewer, complaint) {
  if (!ev || typeof ev !== 'object') return null;
  if (ev.visibility === 'RESTRICTED' && !canSeeRestricted(viewer, complaint)) return null;
  return signedFileUrl(ev._id);
}

function evidenceSummary(ev, viewer, complaint) {
  const url = evidenceUrl(ev, viewer, complaint);
  if (!url) return null;
  return { id: String(ev._id), kind: ev.kind, url, mime_type: ev.mimeType, size_bytes: ev.sizeBytes, created_at: iso(ev.createdAt) };
}

function isOverdue(deadline, status) {
  return Boolean(deadline && new Date(deadline) < new Date() && !['CLOSED_VERIFIED', 'RESOLVED', 'PENDING_VERIFICATION'].includes(status));
}

/**
 * Complaint ("incident" in the frontend contract).
 * @param {object} c complaint with images/redactedImages/audio/assignedDepartment/masterIncident populated where available
 * @param {object|null} viewer authenticated user or null (public)
 * @param {{ workOrder?: object, linkedReports?: object[], analysis?: object }} extra
 */
function serializeComplaint(c, viewer = null, extra = {}) {
  if (!c) return null;
  const images = (c.images || []).map((e) => evidenceSummary(e, viewer, c)).filter(Boolean);
  const redacted = (c.redactedImages || []).map((e) => evidenceSummary(e, viewer, c)).filter(Boolean);
  const audioUrl = evidenceUrl(c.audio, viewer, c);
  const master = c.masterIncident && typeof c.masterIncident === 'object' ? c.masterIncident : null;
  const wo = extra.workOrder || null;
  const staff = isStaff(viewer);
  const lat = c.location?.coordinates?.[1];
  const lng = c.location?.coordinates?.[0];

  const out = {
    id: c.ticketNumber,
    complaint_id: c.ticketNumber,
    ticket_number: c.ticketNumber,
    ticketNumber: c.ticketNumber,
    category: c.category,
    status: c.status,
    severity_level: c.severityLevel,
    severity_score: c.severityScore,
    target_sla_hours: c.targetSlaHours,
    sla_deadline: iso(c.slaDeadline),
    is_overdue: isOverdue(c.slaDeadline, c.status),
    assigned_department: deptName(c.assignedDepartment),

    input_method: c.inputMethod,
    original_language: c.originalLanguage,
    original_text: c.originalText,
    description: c.originalText,
    english_translation: c.englishTranslation,
    translated_description: c.englishTranslation,
    transcription_status: c.transcriptionStatus,
    translation_status: c.translationStatus,
    translation_metadata: c.translationMetadata || null,
    has_audio: Boolean(c.audio),
    original_audio_reference: audioUrl,
    audio_url: audioUrl,

    location: { lat, lng, address: c.address || '', ward: c.ward || '' },
    has_image: (c.images || []).length > 0,
    is_redacted: redacted.length > 0,
    // Public viewers only ever receive redacted imagery
    original_image_url: images[0]?.url || null,
    redacted_image_url: redacted[0]?.url || null,
    images,
    redacted_images: redacted,

    support_count: c.supportCount,
    citizen_confirmed: c.citizenFeedback?.confirmed === true,
    citizen_feedback_notes: c.citizenFeedback?.notes || null,
    status_history: (c.statusHistory || []).map((s) => ({ status: s.status, at: iso(s.at), note: s.note || '' })),

    ai_status: c.aiStatus,
    needs_review: c.needsReview,
    review_reasons: c.reviewReasons || [],

    master_incident_id: master ? master.incidentNumber : null,
    is_primary_report: c.isPrimary,
    duplicate_count: master ? master.duplicateCount : 0,
    linked_report_count: master ? master.complaintCount : 1,
    duplicate_score: c.duplicateScore,

    work_order_id: wo ? wo.workOrderNumber : null,
    resolution_proof_url: wo?.resolution?.proofEvidence ? signedFileUrl(idOf(wo.resolution.proofEvidence)) : null,
    resolution_notes: wo?.resolution?.notes || '',
    ai_verification: wo?.resolution?.aiVerification || null,

    created_at: iso(c.createdAt),
    updated_at: iso(c.updatedAt),
    is_sandbox: false,
  };

  if (staff) {
    out.reporter = c.reporter && typeof c.reporter === 'object' ? { id: String(c.reporter._id), name: c.reporter.name, email: c.reporter.email } : null;
    if (extra.linkedReports) {
      out.linked_reports = extra.linkedReports.map((r) => ({
        ticket_number: r.ticketNumber,
        is_primary: r.isPrimary,
        status: r.status,
        original_language: r.originalLanguage,
        original_text: r.originalText,
        english_translation: r.englishTranslation,
        input_method: r.inputMethod,
        duplicate_score: r.duplicateScore,
        support_count: r.supportCount,
        created_at: iso(r.createdAt),
      }));
    }
    if (extra.analysis) out.ai_analysis = serializeAnalysis(extra.analysis);
  }
  return out;
}

function serializeAnalysis(a) {
  if (!a) return null;
  return {
    status: a.status,
    provider: a.provider,
    models: a.models,
    transcription: a.transcription,
    translation: a.translation,
    image_verification: a.imageVerification,
    severity: a.severity,
    routing: a.routing,
    duplicate: a.duplicate,
    errors: a.stageErrors,
    duration_ms: a.durationMs,
    created_at: iso(a.createdAt),
  };
}

/**
 * Work order in the shape of toUIWorkOrder (frontend authority.mapper.js).
 * Expects masterIncident, primaryComplaint (with media), department populated.
 */
function serializeWorkOrder(wo, viewer, { linkedReports = [] } = {}) {
  if (!wo) return null;
  const c = wo.primaryComplaint && typeof wo.primaryComplaint === 'object' ? wo.primaryComplaint : {};
  const master = wo.masterIncident && typeof wo.masterIncident === 'object' ? wo.masterIncident : {};
  const firstImage = (c.images || [])[0];
  const firstRedacted = (c.redactedImages || [])[0];
  const audioUrl = c.audio && typeof c.audio === 'object' ? signedFileUrl(c.audio._id) : null;
  const lat = c.location?.coordinates?.[1];
  const lng = c.location?.coordinates?.[0];

  return {
    id: wo.workOrderNumber,
    work_order_id: wo.workOrderNumber,
    incident_id: c.ticketNumber,
    ticket_number: c.ticketNumber,
    master_incident_id: master.incidentNumber || null,
    title: master.title || `${c.category || 'Civic'} repair order`,
    category: c.category,
    input_method: c.inputMethod,
    original_language: c.originalLanguage,
    original_text: c.originalText,
    english_translation: c.englishTranslation,
    translation_status: c.translationStatus,
    translation_metadata: c.translationMetadata || null,
    has_audio: Boolean(c.audio),
    original_audio_reference: audioUrl,
    audio_url: audioUrl,
    priority: wo.priority,
    severity_score: master.severityScore,
    status: wo.status,
    assigned_crew: wo.assignedCrew || 'Unassigned crew',
    lead_officer: wo.leadOfficer || (wo.assignedTo && wo.assignedTo.name) || 'Unassigned',
    department: deptName(wo.department),
    location: { lat, lng, address: c.address || master.address || '', ward: c.ward || '' },
    sla_deadline: iso(wo.slaDeadline),
    is_overdue: isOverdue(wo.slaDeadline, wo.status),
    original_image_url: firstImage ? signedFileUrl(idOf(firstImage)) : firstRedacted ? signedFileUrl(idOf(firstRedacted)) : null,
    redacted_image_url: firstRedacted ? signedFileUrl(idOf(firstRedacted)) : null,
    resolution_proof_url: wo.resolution?.proofEvidence ? signedFileUrl(idOf(wo.resolution.proofEvidence)) : null,
    resolution_notes: wo.resolution?.notes || '',
    ai_verification: wo.resolution?.aiVerification
      ? {
          verified: wo.resolution.aiVerification.verified,
          confidence_score: wo.resolution.aiVerification.confidenceScore,
          notes: [wo.resolution.aiVerification.damageResolvedNotes, wo.resolution.aiVerification.structuralMatchNotes].filter(Boolean).join(' '),
          requires_supervisory_review: wo.resolution.aiVerification.requiresSupervisoryReview,
        }
      : null,
    citizen_sign_off: { confirmed: wo.citizenSignOff?.confirmed === true, feedbackNotes: wo.citizenSignOff?.feedbackNotes || null },
    progress_notes: (wo.progressNotes || []).map((n) => ({ timestamp: iso(n.timestamp), author: n.author, note: n.note })),
    activity_timeline: (wo.activityTimeline || []).map((a) => ({ timestamp: iso(a.timestamp), action: a.action, actor: a.actor, detail: a.detail })),
    duplicate_count: master.duplicateCount || 0,
    linked_report_count: master.complaintCount || 1,
    linked_reports: linkedReports.map((r) => ({
      ticket_number: r.ticketNumber,
      is_primary: r.isPrimary,
      original_language: r.originalLanguage,
      original_text: r.originalText,
      english_translation: r.englishTranslation,
      created_at: iso(r.createdAt),
    })),
    created_at: iso(wo.createdAt),
    updated_at: iso(wo.updatedAt),
    is_sandbox: false,
  };
}

function serializeNotification(n, viewer) {
  const readBy = (n.readBy || []).map(String);
  const read = viewer ? readBy.includes(String(viewer._id)) : false;
  return {
    id: String(n._id),
    recipient_user_id: idOf(n.recipientUser),
    recipient_role: n.recipientRole,
    recipient_department: deptName(n.recipientDepartment) || idOf(n.recipientDepartment),
    type: n.type,
    priority: n.priority,
    title: n.title,
    message: n.message,
    params: n.params || {},
    complaint_id: n.ticketNumber,
    work_order_id: n.params?.workOrderId || null,
    original_image_url: n.params?.originalEvidenceId ? signedFileUrl(n.params.originalEvidenceId) : null,
    resolution_proof_url: n.params?.proofEvidenceId ? signedFileUrl(n.params.proofEvidenceId) : null,
    ai_confidence: n.params?.confidence ?? 0,
    link_url: n.linkUrl,
    action_required: n.actionRequired,
    action_type: n.actionType,
    status: n.status,
    read,
    read_at: null,
    created_at: iso(n.createdAt),
    is_sandbox: false,
  };
}

module.exports = { serializeUser, serializeComplaint, serializeAnalysis, serializeWorkOrder, serializeNotification, isStaff, canSeeRestricted };
