/**
 * Background housekeeping: SLA breach alerts and cleanup of abandoned staged uploads.
 */
const { WorkOrder, Evidence, Complaint } = require('../models');
const { deleteEvidence } = require('./evidence.service');
const notifications = require('./notification.service');
const audit = require('./audit.service');
const ai = require('./ai.client');

async function flagSlaBreaches() {
  const now = new Date();
  const breached = await WorkOrder.find({
    status: { $nin: ['RESOLVED', 'PENDING_VERIFICATION'] },
    slaDeadline: { $ne: null, $lt: now },
    slaBreachNotifiedAt: null,
  }).limit(100);
  for (const wo of breached) {
    wo.slaBreachNotifiedAt = now;
    wo.log('SLA_BREACHED', 'Civora SLA Monitor', `Deadline ${wo.slaDeadline.toISOString()} passed while ${wo.status}.`);
    await wo.save();
    const primary = await Complaint.findById(wo.primaryComplaint).select('ticketNumber');
    const data = {
      type: 'SLA_BREACH',
      priority: 'URGENT',
      title: `SLA breached: ${wo.workOrderNumber}`,
      message: `${wo.priority} work order passed its SLA deadline while ${wo.status}.`,
      params: { workOrderId: wo.workOrderNumber, complaintId: primary?.ticketNumber },
      workOrder: wo._id,
      ticketNumber: primary?.ticketNumber,
    };
    await notifications.toDepartment(wo.department, { ...data, linkUrl: '/authority' });
    await notifications.toAdmins({ ...data, linkUrl: '/admin' });
    await audit.record({ action: 'SLA_BREACHED', entityType: 'WorkOrder', entityId: wo._id, ticketNumber: primary?.ticketNumber, newState: wo.status });
  }
  return breached.length;
}

/**
 * Retries English translation (and the embedding derived from it) for complaints
 * submitted while the AI service was down. The original text is never touched.
 */
async function retryFailedTranslations(limit = 20) {
  const pending = await Complaint.find({ translationStatus: 'FAILED', masterIncident: { $ne: null } }).sort({ createdAt: 1 }).limit(limit);
  let fixed = 0;
  for (const c of pending) {
    try {
      const tr = await ai.translate(c.originalText, c.originalLanguage, 'en');
      c.englishTranslation = tr.translated_text;
      c.translationStatus = 'TRANSLATED';
      c.translationMetadata = tr.metadata;
      try {
        c.textEmbedding = (await ai.embedTexts([tr.translated_text])).embeddings[0];
      } catch {
        /* embedding is optional for an already-routed complaint */
      }
      c.reviewReasons = c.reviewReasons.filter((r) => r !== 'TRANSLATION_FAILED');
      c.needsReview = c.reviewReasons.length > 0;
      await c.save();
      await audit.record({ action: 'TRANSLATION_RETRIED', entityType: 'Complaint', entityId: c._id, ticketNumber: c.ticketNumber, newState: 'TRANSLATED' });
      fixed += 1;
    } catch {
      break; // AI still unavailable; try again next cycle
    }
  }
  return fixed;
}

async function cleanupStagedEvidence(maxAgeHours = 24) {
  const old = await Evidence.find({ status: 'STAGED', createdAt: { $lt: new Date(Date.now() - maxAgeHours * 3600000) } }).limit(200);
  for (const ev of old) await deleteEvidence(ev);
  return old.length;
}

function startMaintenance(intervalMs = 10 * 60 * 1000) {
  const run = async () => {
    try {
      const breaches = await flagSlaBreaches();
      const cleaned = await cleanupStagedEvidence();
      const translated = await retryFailedTranslations();
      if (breaches || cleaned || translated) console.log(`[Maintenance] SLA breaches flagged: ${breaches}; staged files removed: ${cleaned}; translations recovered: ${translated}`);
    } catch (err) {
      console.error('[Maintenance] Run failed:', err.message);
    }
  };
  run();
  return setInterval(run, intervalMs).unref();
}

module.exports = { flagSlaBreaches, cleanupStagedEvidence, retryFailedTranslations, startMaintenance };
