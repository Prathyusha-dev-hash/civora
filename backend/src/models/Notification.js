const mongoose = require('mongoose');

const ObjectId = mongoose.Schema.Types.ObjectId;

const notificationSchema = new mongoose.Schema(
  {
    // Exactly one targeting mode is used: a user, a department, or a role
    recipientUser: { type: ObjectId, ref: 'User', default: null, index: true },
    recipientDepartment: { type: ObjectId, ref: 'Department', default: null, index: true },
    recipientRole: { type: String, default: null, index: true },

    type: { type: String, required: true },
    priority: { type: String, enum: ['INFO', 'ACTION_REQUIRED', 'URGENT'], default: 'INFO' },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },

    complaint: { type: ObjectId, ref: 'Complaint', default: null },
    ticketNumber: { type: String, default: null },
    workOrder: { type: ObjectId, ref: 'WorkOrder', default: null },
    linkUrl: { type: String, default: null },

    actionRequired: { type: Boolean, default: false },
    actionType: { type: String, default: null },
    status: { type: String, default: null },

    // Department/role notifications are shared; per-user read state is tracked here
    readBy: [{ type: ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

notificationSchema.index({ recipientUser: 1, createdAt: -1 });
notificationSchema.index({ recipientDepartment: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
