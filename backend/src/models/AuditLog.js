const mongoose = require('mongoose');

/**
 * Append-only audit trail. Update/delete operations are blocked at the model level.
 */
const auditLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: 'System' },
    actorRole: { type: String, default: 'SYSTEM' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String, default: null },
    ticketNumber: { type: String, default: null, index: true },
    previousState: { type: String, default: null },
    newState: { type: String, default: null },
    notes: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
  },
  { versionKey: false }
);

auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

const block = function blockMutation(next) {
  next(new Error('Audit logs are immutable.'));
};
['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete'].forEach((op) =>
  auditLogSchema.pre(op, block)
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
