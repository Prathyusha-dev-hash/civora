#!/usr/bin/env node
/**
 * Seeds departments and staff accounts without starting the server.
 *   cd backend && npm run seed
 * The server runs the same seed on every start; this is for provisioning ahead of time.
 * Existing accounts are never overwritten, unless you pass --reset-staff-passwords:
 *   npm run seed -- --reset-staff-passwords
 */
const { assertConfig } = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const { runSeed, resetStaffPasswords } = require('../src/utils/seed');

(async () => {
  try {
    assertConfig();
    await connectDB();
    await runSeed();
    if (process.argv.includes('--reset-staff-passwords')) await resetStaffPasswords();
  } catch (err) {
    console.error(`[Seed] Failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB().catch(() => {});
  }
})();
