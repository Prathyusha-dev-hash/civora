const crypto = require('crypto');
const { config } = require('../config/env');
const { runMaintenance } = require('../services/maintenance.service');
const { recoverPendingComplaints } = require('../services/incident.pipeline');
const { ApiError, ok, asyncHandler } = require('../utils/http');

function authorised(req) {
  if (!config.cronSecret) return false;
  const given = Buffer.from(req.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${config.cronSecret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/**
 * GET /api/v1/internal/maintenance
 * Serverless replacement for the in-process timer: SLA alerts, staged-upload cleanup,
 * translation retries and recovery of complaints interrupted mid-pipeline.
 */
const maintenance = asyncHandler(async (req, res) => {
  if (!authorised(req)) throw ApiError.notFound();
  const result = await runMaintenance();
  await recoverPendingComplaints().catch((err) => console.error('[Pipeline] Recovery error:', err.message));
  ok(res, result);
});

module.exports = { maintenance };
