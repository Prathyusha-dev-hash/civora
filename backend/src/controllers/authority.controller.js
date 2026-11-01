const { WorkOrder, Complaint, Department } = require('../models');
const { ROLES } = require('../config/constants');
const workflow = require('../services/workflow.service');
const { serializeWorkOrder } = require('../services/serializers');
const { ok, asyncHandler } = require('../utils/http');

const WO_POPULATE = [
  { path: 'primaryComplaint', populate: [{ path: 'images' }, { path: 'redactedImages' }, { path: 'audio' }] },
  { path: 'masterIncident', select: 'incidentNumber title complaintCount duplicateCount severityLevel severityScore address status' },
  { path: 'department', select: 'name code' },
  { path: 'assignedTo', select: 'name' },
];

async function render(wo, user, { withLinked = false } = {}) {
  await wo.populate(WO_POPULATE);
  const linkedReports = withLinked ? await Complaint.find({ masterIncident: wo.masterIncident._id }).sort({ createdAt: 1 }).lean() : [];
  return serializeWorkOrder(wo, user, { linkedReports });
}

/** GET /authority/work-orders — department queue (admins see all, optionally filtered). */
const listWorkOrders = async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.ADMIN) {
    if (req.query.department) {
      const d = await Department.findOne({ $or: [{ name: req.query.department }, { code: String(req.query.department).toUpperCase() }] });
      filter.department = d?._id || null;
    }
  } else {
    filter.department = req.user.department?._id || null;
  }
  if (req.query.status && req.query.status !== 'ALL') filter.status = String(req.query.status);
  if (req.query.priority && req.query.priority !== 'ALL') filter.priority = String(req.query.priority);

  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
  const page = Math.max(1, Number(req.query.page) || 1);
  const [items, total] = await Promise.all([
    WorkOrder.find(filter).sort({ slaDeadline: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate(WO_POPULATE),
    WorkOrder.countDocuments(filter),
  ]);
  ok(res, items.map((wo) => serializeWorkOrder(wo, req.user)), 200, { total, page, limit });
};

const getWorkOrder = async (req, res) => {
  const wo = await workflow.loadWorkOrderFor(req.user, req.params.id);
  ok(res, await render(wo, req.user, { withLinked: true }));
};

const getTimeline = async (req, res) => {
  const wo = await workflow.loadWorkOrderFor(req.user, req.params.id);
  ok(res, wo.activityTimeline.map((a) => ({ timestamp: a.timestamp, action: a.action, actor: a.actor, detail: a.detail })));
};

const updateStatus = async (req, res) => {
  const wo = await workflow.updateStatus({ user: req.user, ref: req.params.id, status: String(req.body.status || ''), officerName: req.body.officer_name, req });
  ok(res, await render(wo, req.user, { withLinked: true }));
};

const addProgress = async (req, res) => {
  const wo = await workflow.addProgressNote({ user: req.user, ref: req.params.id, note: req.body.note, req });
  ok(res, await render(wo, req.user, { withLinked: true }));
};

const escalate = async (req, res) => {
  const wo = await workflow.escalate({ user: req.user, ref: req.params.id, reason: req.body.reason, targetDepartment: req.body.target_department, req });
  ok(res, await render(wo, req.user, { withLinked: true }));
};

/** POST /authority/work-orders/:id/resolution-proof  multipart { resolution_image, notes } */
const submitProof = async (req, res) => {
  const file = req.files?.resolution_image?.[0] || req.files?.proof_image?.[0];
  const wo = await workflow.submitResolutionProof({ user: req.user, ref: req.params.id, file, notes: req.body.notes, req });
  ok(res, await render(wo, req.user, { withLinked: true }));
};

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  listWorkOrders: wrap(listWorkOrders),
  getWorkOrder: wrap(getWorkOrder),
  getTimeline: wrap(getTimeline),
  updateStatus: wrap(updateStatus),
  addProgress: wrap(addProgress),
  escalate: wrap(escalate),
  submitProof: wrap(submitProof),
};
