const mongoose = require('mongoose');
const { WORK_ORDER_STATUS, SEVERITY_LEVELS } = require('../config/constants');

const ObjectId = mongoose.Schema.Types.ObjectId;

const workOrderSchema = new mongoose.Schema(
  {
    workOrderNumber: { type: String, required: true, unique: true },
    masterIncident: { type: ObjectId, ref: 'MasterIncident', required: true, unique: true },
    primaryComplaint: { type: ObjectId, ref: 'Complaint', required: true },
    department: { type: ObjectId, ref: 'Department', required: true, index: true },
    status: { type: String, enum: Object.values(WORK_ORDER_STATUS), default: 'ASSIGNED', index: true },
    priority: { type: String, enum: SEVERITY_LEVELS, default: 'MODERATE' },
    assignedTo: { type: ObjectId, ref: 'User', default: null },
    assignedCrew: { type: String, default: '' },
    leadOfficer: { type: String, default: '' },
    slaDeadline: { type: Date, default: null, index: true },

    progressNotes: [
      {
        note: { type: String, required: true, maxlength: 2000 },
        author: { type: String, default: '' },
        authorUser: { type: ObjectId, ref: 'User', default: null },
        timestamp: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    escalations: [
      {
        reason: String,
        fromDepartment: { type: ObjectId, ref: 'Department' },
        toDepartment: { type: ObjectId, ref: 'Department' },
        by: { type: ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    resolution: {
      proofEvidence: { type: ObjectId, ref: 'Evidence', default: null },
      notes: { type: String, default: '' },
      submittedBy: { type: ObjectId, ref: 'User', default: null },
      submittedAt: { type: Date, default: null },
      aiVerification: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    citizenSignOff: {
      confirmed: { type: Boolean, default: null },
      feedbackNotes: { type: String, default: null },
      by: { type: ObjectId, ref: 'User', default: null },
      at: { type: Date, default: null },
    },
    activityTimeline: [
      {
        action: String,
        actor: String,
        detail: String,
        timestamp: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    resolvedAt: { type: Date, default: null },
    slaBreachNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

workOrderSchema.index({ department: 1, status: 1, slaDeadline: 1 });

workOrderSchema.methods.log = function log(action, actor, detail = '') {
  this.activityTimeline.push({ action, actor: actor || 'System', detail, timestamp: new Date() });
};

module.exports = mongoose.model('WorkOrder', workOrderSchema);
