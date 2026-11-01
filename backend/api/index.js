/**
 * Vercel serverless entry point. Every request is rewritten here (see vercel.json).
 * Local development keeps using src/server.js (npm start).
 *
 * Differences from the long-running server:
 *  - The DB connection, seed and storage init happen once per warm instance.
 *  - The 10-minute maintenance timer is replaced by Vercel Cron (/api/v1/internal/maintenance)
 *    plus a traffic-driven run at most every 10 minutes, claimed atomically in MongoDB.
 */
const { waitUntil } = require('@vercel/functions');
const { assertConfig } = require('../src/config/env');
const { connectDB } = require('../src/config/db');
const { runSeed } = require('../src/utils/seed');
const { getStorage } = require('../src/storage');
const { Counter } = require('../src/models/Counter');
const { runMaintenance } = require('../src/services/maintenance.service');
const { recoverPendingComplaints } = require('../src/services/incident.pipeline');
const app = require('../src/app');

const MAINTENANCE_EVERY_MS = 10 * 60 * 1000;
let ready = null;

function init() {
  if (!ready) {
    ready = (async () => {
      assertConfig();
      await connectDB();
      await runSeed();
      await getStorage().init();
    })().catch((err) => {
      ready = null; // retry on the next request instead of caching the failure
      throw err;
    });
  }
  return ready;
}

/** Runs maintenance if no instance has done so in the last 10 minutes. */
async function maybeRunMaintenance() {
  const now = Date.now();
  const claimed = await Counter.findOneAndUpdate(
    { _id: 'maintenance-last-run', seq: { $lt: now - MAINTENANCE_EVERY_MS } },
    { $set: { seq: now } },
    { new: true }
  ).catch(() => null);
  if (!claimed) {
    // First run ever: create the marker (a duplicate-key race just means another instance won)
    const created = await Counter.create({ _id: 'maintenance-last-run', seq: now }).catch(() => null);
    if (!created) return;
  }
  await runMaintenance();
  await recoverPendingComplaints().catch((err) => console.error('[Pipeline] Recovery error:', err.message));
}

module.exports = async (req, res) => {
  try {
    await init();
  } catch (err) {
    console.error('[Civora Backend] Startup failed:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: false, error: { code: 'SERVICE_STARTING', message: 'The service could not start. Please try again shortly.' } }));
  }
  if (!req.url.includes('/internal/maintenance')) waitUntil(maybeRunMaintenance().catch(() => {}));
  return app(req, res);
};
