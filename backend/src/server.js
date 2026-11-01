const { config, assertConfig } = require('./config/env');
const { connectDB } = require('./config/db');
const { runSeed } = require('./utils/seed');
const { getStorage } = require('./storage');
const { recoverPendingComplaints } = require('./services/incident.pipeline');
const { startMaintenance } = require('./services/maintenance.service');

async function start() {
  assertConfig();
  await connectDB();
  await runSeed();
  await getStorage().init();

  const app = require('./app');
  const server = app.listen(config.port, () => {
    console.log(`[Civora Backend] Listening on http://localhost:${config.port} (API: /api/v1)`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Civora Backend] Port ${config.port} is already in use (another backend still running?). Stop it or set PORT in backend/.env.`);
    } else {
      console.error(`[Civora Backend] Server error: ${err.message}`);
    }
    process.exit(1);
  });

  // Finish complaints interrupted by a previous crash, then start SLA/cleanup jobs
  recoverPendingComplaints().catch((err) => console.error('[Pipeline] Recovery error:', err.message));
  startMaintenance();

  const shutdown = (signal) => {
    console.log(`[Civora Backend] ${signal} received, shutting down...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

process.on('unhandledRejection', (err) => console.error('[Civora Backend] Unhandled rejection:', err));

start().catch((err) => {
  console.error(`[Civora Backend] Failed to start: ${err.message}`);
  process.exit(1);
});
