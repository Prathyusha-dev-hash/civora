const mongoose = require('mongoose');
const { Complaint, WorkOrder, AiAnalysis } = require('../models');
const { ROLES, AUTHORITY_ROLES } = require('../config/constants');

const POPULATE = [
  { path: 'images', select: 'kind mimeType sizeBytes visibility perceptualHash createdAt originalName' },
  { path: 'redactedImages', select: 'kind mimeType sizeBytes visibility createdAt' },
  { path: 'audio', select: 'kind mimeType sizeBytes visibility createdAt' },
  { path: 'assignedDepartment', select: 'name code' },
  { path: 'masterIncident', select: 'incidentNumber complaintCount duplicateCount severityLevel severityScore status workOrder title' },
  { path: 'reporter', select: 'name email' },
];

function refFilter(ref) {
  return mongoose.isValidObjectId(ref) && String(ref).length === 24 ? { _id: ref } : { ticketNumber: String(ref).trim().toUpperCase() };
}

/** Restricts listings to what each role may see. */
function scopeFor(user) {
  if (!user) return null;
  if (user.role === ROLES.ADMIN) return {};
  if (AUTHORITY_ROLES.includes(user.role)) return { assignedDepartment: user.department?._id || user.department || null };
  return { reporter: user._id };
}

async function loadComplaint(ref) {
  return Complaint.findOne(refFilter(ref)).populate(POPULATE);
}

/**
 * Loads everything needed to render a complaint for a given viewer.
 */
async function loadComplaintView(ref, viewer) {
  const c = await loadComplaint(ref);
  if (!c) return null;
  const extra = {};
  if (c.masterIncident?.workOrder) extra.workOrder = await WorkOrder.findById(c.masterIncident.workOrder).lean();
  const isStaff = viewer && viewer.role !== ROLES.CITIZEN;
  if (isStaff && c.masterIncident) {
    extra.linkedReports = await Complaint.find({ masterIncident: c.masterIncident._id }).sort({ createdAt: 1 }).lean();
  }
  if (isStaff && c.latestAnalysis) extra.analysis = await AiAnalysis.findById(c.latestAnalysis).lean();
  return { complaint: c, extra };
}

module.exports = { POPULATE, refFilter, scopeFor, loadComplaint, loadComplaintView };
