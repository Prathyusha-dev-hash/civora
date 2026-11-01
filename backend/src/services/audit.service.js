const { AuditLog } = require('../models');

/**
 * Appends an audit record. Audit failures are logged loudly but do not abort
 * the business operation that already committed.
 */
async function record({ actor = null, action, entityType, entityId = null, ticketNumber = null, previousState = null, newState = null, notes = '', metadata = null, req = null }) {
  try {
    await AuditLog.create({
      actor: actor?._id || null,
      actorName: actor?.name || 'System',
      actorRole: actor?.role || 'SYSTEM',
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      ticketNumber,
      previousState,
      newState,
      notes,
      metadata,
      ip: req?.ip || null,
    });
  } catch (err) {
    console.error(`[Audit] Failed to record ${action} on ${entityType}:${entityId}:`, err.message);
  }
}

module.exports = { record };
