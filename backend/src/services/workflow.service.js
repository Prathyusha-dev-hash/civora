/**
 * Work-order lifecycle and citizen sign-off.
 * Invariant (spec §7.1): AI verification never closes a ticket. Only the
 * reporting citizen's confirmation moves an incident to CLOSED_VERIFIED.
 */
const crypto = require('crypto');
const { Complaint, WorkOrder, MasterIncident, Department, Notification } = require('../models');
const { ROLES, AUTHORITY_SETTABLE_STATUSES, WORK_ORDER_TO_COMPLAINT_STATUS, EVIDENCE_KIND } = require('../config/constants');
const ai = require('./ai.client');
const aiCache = require('./aiCache');
const { storeEvidence, readEvidenceBuffer } = require('./evidence.service');
const routing = require('./routing.service');
const notifications = require('./notification.service');
const audit = require('./audit.service');
const { refFilter } = require('./complaint.query');
const { ApiError } = require('../utils/http');

const TRANSITIONS = {
  ASSIGNED: ['EN_ROUTE', 'IN_PROGRESS', 'ESCALATED'],
  EN_ROUTE: ['IN_PROGRESS', 'ESCALATED', 'ASSIGNED'],
  IN_PROGRESS: ['EN_ROUTE', 'ESCALATED'],
  ESCALATED: ['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS'],
  PENDING_VERIFICATION: [],
  RESOLVED: [],
};

function woRef(ref) {
  return /^WO-/i.test(String(ref)) ? { workOrderNumber: String(ref).toUpperCase() } : refFilter(ref);
}

async function loadWorkOrderFor(user, ref) {
  const wo = await WorkOrder.findOne(woRef(ref));
  if (!wo) throw ApiError.notFound(`Work order ${ref} was not found.`);
  if (user.role !== ROLES.ADMIN && String(wo.department) !== String(user.department?._id || user.department)) {
    throw ApiError.forbidden('This work order belongs to another department.');
  }
  return wo;
}

/** Mirrors a work-order status onto the master incident and every linked citizen complaint. */
async function syncLinked(wo, { actor = null, note = '', complaintStatus = null } = {}) {
  const target = complaintStatus || WORK_ORDER_TO_COMPLAINT_STATUS[wo.status];
  await MasterIncident.updateOne({ _id: wo.masterIncident }, { $set: { status: wo.status, ...(wo.status === 'RESOLVED' ? { closedAt: new Date() } : {}) } });
  const complaints = await Complaint.find({ masterIncident: wo.masterIncident });
  for (const c of complaints) {
    c.pushStatus(target, actor?._id || null, note);
    c.slaDeadline = wo.slaDeadline;
    c.assignedDepartment = wo.department;
    await c.save();
  }
  return complaints;
}

async function updateStatus({ user, ref, status, officerName, req }) {
  const wo = await loadWorkOrderFor(user, ref);
  if (!AUTHORITY_SETTABLE_STATUSES.includes(status)) {
    throw ApiError.unprocessable(`Status must be one of ${AUTHORITY_SETTABLE_STATUSES.join(', ')}. Resolution requires proof upload and citizen sign-off.`);
  }
  if (wo.status === status) return wo;
  if (!TRANSITIONS[wo.status]?.includes(status)) throw ApiError.conflict(`Cannot move work order from ${wo.status} to ${status}.`);

  const previous = wo.status;
  wo.status = status;
  if (['EN_ROUTE', 'IN_PROGRESS'].includes(status) && !wo.assignedTo) {
    wo.assignedTo = user._id;
    wo.leadOfficer = officerName && officerName !== 'Officer In-Charge' ? officerName : user.name;
  }
  wo.log('STATUS_CHANGED', user.name, `${previous} -> ${status}`);
  await wo.save();
  const complaints = await syncLinked(wo, { actor: user, note: `Work order ${previous} -> ${status}` });

  if (['EN_ROUTE', 'IN_PROGRESS'].includes(status) && previous === 'ASSIGNED') {
    for (const c of complaints) {
      await notifications.toUser(c.reporter, {
        type: 'WORK_STARTED',
        title: `Work has started on ${c.ticketNumber}`,
        message: `${wo.leadOfficer || 'A field crew'} is now handling your complaint.`,
        params: { complaintId: c.ticketNumber },
        complaint: c._id,
        ticketNumber: c.ticketNumber,
        linkUrl: `/citizen?ticketId=${c.ticketNumber}`,
        actionType: 'VIEW_TICKET',
      });
    }
  }
  await audit.record({ actor: user, action: 'WORK_ORDER_STATUS_CHANGED', entityType: 'WorkOrder', entityId: wo._id, ticketNumber: complaints.find((c) => c.isPrimary)?.ticketNumber, previousState: previous, newState: status, req });
  return wo;
}

async function addProgressNote({ user, ref, note, req }) {
  const text = String(note || '').trim();
  if (text.length < 2) throw ApiError.unprocessable('Progress note is required.');
  const wo = await loadWorkOrderFor(user, ref);
  wo.progressNotes.push({ note: text.slice(0, 2000), author: user.name, authorUser: user._id, timestamp: new Date() });
  wo.log('PROGRESS_NOTE', user.name, text.slice(0, 140));
  await wo.save();
  await audit.record({ actor: user, action: 'WORK_ORDER_NOTE_ADDED', entityType: 'WorkOrder', entityId: wo._id, notes: text.slice(0, 500), req });
  return wo;
}

async function escalate({ user, ref, reason, targetDepartment, req }) {
  const why = String(reason || '').trim();
  if (why.length < 5) throw ApiError.unprocessable('An escalation reason is required.');
  const wo = await loadWorkOrderFor(user, ref);
  if (['RESOLVED', 'PENDING_VERIFICATION'].includes(wo.status)) throw ApiError.conflict(`Cannot escalate a work order in ${wo.status}.`);

  let target = null;
  if (targetDepartment) {
    target = await Department.findOne({ $or: [{ name: targetDepartment }, { code: String(targetDepartment).toUpperCase() }] });
    if (!target) throw ApiError.unprocessable(`Unknown department "${targetDepartment}".`);
  }
  const from = wo.department;
  const previous = wo.status;
  wo.status = 'ESCALATED';
  wo.escalations.push({ reason: why, fromDepartment: from, toDepartment: target?._id || from, by: user._id, at: new Date() });
  if (target && String(target._id) !== String(from)) {
    wo.department = target._id;
    wo.assignedTo = null;
    await MasterIncident.updateOne({ _id: wo.masterIncident }, { $set: { department: target._id } });
  }
  wo.log('ESCALATED', user.name, `${why}${target ? ` -> ${target.name}` : ''}`);
  await wo.save();
  const complaints = await syncLinked(wo, { actor: user, note: `Escalated: ${why}` });
  const ticket = complaints.find((c) => c.isPrimary)?.ticketNumber;

  if (target) {
    await notifications.toDepartment(target._id, {
      type: 'ESCALATION_RECEIVED',
      priority: 'URGENT',
      title: `Escalated work order ${wo.workOrderNumber}`,
      message: why,
      params: { workOrderId: wo.workOrderNumber, complaintId: ticket },
      workOrder: wo._id,
      ticketNumber: ticket,
      linkUrl: '/authority',
    });
  }
  await notifications.toAdmins({
    type: 'ESCALATION',
    priority: 'URGENT',
    title: `Work order ${wo.workOrderNumber} escalated`,
    message: why,
    params: { workOrderId: wo.workOrderNumber, complaintId: ticket },
    workOrder: wo._id,
    ticketNumber: ticket,
    linkUrl: '/admin',
  });
  await audit.record({ actor: user, action: 'WORK_ORDER_ESCALATED', entityType: 'WorkOrder', entityId: wo._id, ticketNumber: ticket, previousState: previous, newState: 'ESCALATED', notes: why, metadata: { toDepartment: target?.name || null }, req });
  return wo;
}

/**
 * Runs AI before/after verification for a resolution photo, reusing a result
 * computed moments earlier by /ai/verify-resolution for the same image.
 */
async function verifyResolutionImage({ wo, buffer, mimeType }) {
  const key = aiCache.key('verify', String(wo.primaryComplaint), crypto.createHash('sha256').update(buffer).digest('hex'));
  const cached = aiCache.get(key);
  if (cached) return cached;
  const primary = await Complaint.findById(wo.primaryComplaint).populate('images');
  const beforeEv = primary?.images?.[0];
  const result = await ai.verifyResolution({
    before: beforeEv ? { buffer: await readEvidenceBuffer(beforeEv), mimeType: beforeEv.mimeType } : null,
    after: { buffer, mimeType },
    category: primary?.category,
    description: primary?.englishTranslation || primary?.originalText,
  });
  aiCache.set(key, result);
  return result;
}

async function submitResolutionProof({ user, ref, file, notes, req }) {
  if (!file) throw ApiError.unprocessable('A resolution photo (resolution_image) is required.', [{ field: 'resolution_image', issue: 'required' }]);
  const wo = await loadWorkOrderFor(user, ref);
  if (['RESOLVED', 'PENDING_VERIFICATION'].includes(wo.status)) throw ApiError.conflict(`Work order is already ${wo.status}.`);

  const proof = await storeEvidence(file, { kind: EVIDENCE_KIND.RESOLUTION_PROOF, workOrder: wo._id, uploadedBy: user._id, visibility: 'PUBLIC' });

  let verification = null;
  let aiError = null;
  try {
    const v = await verifyResolutionImage({ wo, buffer: file.buffer, mimeType: proof.mimeType });
    verification = {
      verified: v.verified,
      confidenceScore: v.confidence_score,
      structuralMatchNotes: v.structural_match_notes,
      damageResolvedNotes: v.damage_resolved_notes,
      passedInspectionCriteria: v.passed_inspection_criteria,
      failedInspectionCriteria: v.failed_inspection_criteria,
      requiresSupervisoryReview: v.requires_supervisory_review,
      model: v.model,
    };
  } catch (err) {
    aiError = err.message;
    verification = { verified: false, confidenceScore: 0, requiresSupervisoryReview: true, error: `AI verification unavailable: ${err.message}` };
  }

  const previous = wo.status;
  wo.resolution = { proofEvidence: proof._id, notes: String(notes || '').slice(0, 2000), submittedBy: user._id, submittedAt: new Date(), aiVerification: verification };
  wo.status = 'PENDING_VERIFICATION';
  wo.log('RESOLUTION_SUBMITTED', user.name, `Proof uploaded. AI: ${verification.verified ? 'verified' : 'not verified'} (${verification.confidenceScore}%). Awaiting citizen confirmation.`);
  await wo.save();
  const complaints = await syncLinked(wo, { actor: user, note: 'Resolution submitted; awaiting citizen confirmation' });
  const primary = complaints.find((c) => c.isPrimary) || complaints[0];
  const beforeEvidence = primary?.redactedImages?.[0] || null;

  for (const c of complaints) {
    await notifications.toUser(c.reporter, {
      type: 'RESOLUTION_SUBMITTED',
      priority: 'ACTION_REQUIRED',
      title: `Please confirm the repair for ${c.ticketNumber}`,
      message: `The department reported this issue as resolved${verification.confidenceScore ? ` (AI photo check ${verification.confidenceScore}%)` : ''}. Review the photos and confirm or dispute.`,
      params: { complaintId: c.ticketNumber, workOrderId: wo.workOrderNumber, confidence: verification.confidenceScore, proofEvidenceId: String(proof._id), originalEvidenceId: beforeEvidence ? String(beforeEvidence) : null, masterIncident: String(wo.masterIncident) },
      complaint: c._id,
      ticketNumber: c.ticketNumber,
      workOrder: wo._id,
      linkUrl: `/citizen?ticketId=${c.ticketNumber}`,
      actionRequired: true,
      actionType: 'VERIFY_RESOLUTION',
      status: 'PENDING_CONFIRMATION',
    });
  }
  await audit.record({ actor: user, action: 'RESOLUTION_SUBMITTED', entityType: 'WorkOrder', entityId: wo._id, ticketNumber: primary?.ticketNumber, previousState: previous, newState: 'PENDING_VERIFICATION', notes: aiError ? `AI verification failed: ${aiError}` : `AI confidence ${verification.confidenceScore}%`, req });
  return wo;
}

async function citizenFeedback({ user, ref, confirmed, notes, req }) {
  const complaint = await Complaint.findOne(refFilter(ref));
  if (!complaint) throw ApiError.notFound(`Complaint ${ref} was not found.`);
  if (String(complaint.reporter) !== String(user._id)) throw ApiError.forbidden('Only the citizen who filed this complaint can confirm or dispute its resolution.');
  if (complaint.status !== 'PENDING_VERIFICATION') throw ApiError.conflict(`Complaint is ${complaint.status}; there is no resolution awaiting your confirmation.`);

  const wo = await WorkOrder.findOne({ masterIncident: complaint.masterIncident });
  if (!wo) throw ApiError.notFound('Work order for this complaint was not found.');
  const now = new Date();
  complaint.citizenFeedback = { confirmed, notes: notes || null, at: now };
  await complaint.save();
  wo.citizenSignOff = { confirmed, feedbackNotes: notes || null, by: user._id, at: now };

  await Notification.updateMany(
    { type: 'RESOLUTION_SUBMITTED', workOrder: wo._id, actionRequired: true },
    { $set: { actionRequired: false, status: confirmed ? 'CONFIRMED' : 'DISPUTED' } }
  );

  if (confirmed) {
    wo.status = 'RESOLVED';
    wo.resolvedAt = now;
    wo.log('CITIZEN_CONFIRMED', user.name, notes || 'Citizen confirmed the repair.');
    await wo.save();
    const complaints = await syncLinked(wo, { actor: user, note: 'Resolution confirmed by citizen', complaintStatus: 'CLOSED_VERIFIED' });
    for (const c of complaints) {
      await notifications.toUser(c.reporter, { type: 'RESOLUTION_CONFIRMED', title: `${c.ticketNumber} closed`, message: 'The resolution was confirmed by a reporting citizen. Thank you!', params: { complaintId: c.ticketNumber }, complaint: c._id, ticketNumber: c.ticketNumber, linkUrl: `/citizen?ticketId=${c.ticketNumber}` });
    }
    await notifications.toDepartment(wo.department, { type: 'CITIZEN_CONFIRMED', title: `Citizen confirmed ${wo.workOrderNumber}`, message: notes || 'Repair accepted.', params: { workOrderId: wo.workOrderNumber, complaintId: complaint.ticketNumber }, workOrder: wo._id, ticketNumber: complaint.ticketNumber, linkUrl: '/authority' });
    const hours = ((now - wo.createdAt) / 3600000).toFixed(1);
    await audit.record({ actor: user, action: 'RESOLUTION_CONFIRMED', entityType: 'WorkOrder', entityId: wo._id, ticketNumber: complaint.ticketNumber, previousState: 'PENDING_VERIFICATION', newState: 'CLOSED_VERIFIED', notes: `Closed after ${hours}h`, metadata: { resolutionHours: Number(hours) }, req });
    return { success: true, status: 'CLOSED_VERIFIED', work_order_status: 'RESOLVED' };
  }

  wo.status = 'IN_PROGRESS';
  if (routing.severityRank(wo.priority) < routing.severityRank('HIGH')) wo.priority = 'HIGH';
  wo.resolution.aiVerification = { ...(wo.resolution.aiVerification || {}), disputedByCitizen: true };
  wo.log('CITIZEN_DISPUTED', user.name, notes || 'Citizen reported the problem is not fixed.');
  await wo.save();
  const complaints = await syncLinked(wo, { actor: user, note: 'Resolution disputed by citizen', complaintStatus: 'DISPUTED_REWORK_REQUIRED' });
  const disputes = await WorkOrder.countDocuments({ _id: wo._id, 'activityTimeline.action': 'CITIZEN_DISPUTED' });
  for (const c of complaints) {
    await notifications.toUser(c.reporter, { type: 'RESOLUTION_DISPUTED', title: `${c.ticketNumber} reopened for rework`, message: 'A reporting citizen disputed the repair. The department has been asked to redo the work.', params: { complaintId: c.ticketNumber }, complaint: c._id, ticketNumber: c.ticketNumber, linkUrl: `/citizen?ticketId=${c.ticketNumber}` });
  }
  await notifications.toDepartment(wo.department, { type: 'REWORK_REQUESTED', priority: 'URGENT', title: `Rework required: ${wo.workOrderNumber}`, message: notes || 'Citizen reports the problem persists.', params: { workOrderId: wo.workOrderNumber, complaintId: complaint.ticketNumber }, workOrder: wo._id, ticketNumber: complaint.ticketNumber, linkUrl: '/authority' });
  await notifications.toAdmins({ type: 'REPEATED_DISPUTES', priority: 'URGENT', title: `Resolution disputed on ${wo.workOrderNumber}`, message: notes || 'Citizen disputed the reported repair.', params: { workOrderId: wo.workOrderNumber, complaintId: complaint.ticketNumber, disputes }, workOrder: wo._id, ticketNumber: complaint.ticketNumber, linkUrl: '/admin' });
  await audit.record({ actor: user, action: 'RESOLUTION_DISPUTED', entityType: 'WorkOrder', entityId: wo._id, ticketNumber: complaint.ticketNumber, previousState: 'PENDING_VERIFICATION', newState: 'DISPUTED_REWORK_REQUIRED', notes, req });
  return { success: true, status: 'DISPUTED_REWORK_REQUIRED', work_order_status: 'IN_PROGRESS' };
}

module.exports = { loadWorkOrderFor, updateStatus, addProgressNote, escalate, submitResolutionProof, verifyResolutionImage, citizenFeedback, woRef };
