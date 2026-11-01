const bcrypt = require('bcryptjs');
const { Department, User } = require('../models');
const { DEPARTMENTS, ROLES } = require('../config/constants');
const { config } = require('../config/env');

/**
 * Staff accounts cannot self-register (public registration is citizen-only),
 * so the initial authority/admin accounts are provisioned here. Emails match the
 * quick-login cards on the Civora login page. Passwords come from the
 * environment and existing accounts are never overwritten.
 */
const STAFF_ACCOUNTS = [
  { name: 'Commissioner V. Verma', email: 'admin@civora.gov', role: ROLES.ADMIN, dept: null },
  { name: 'Inspector R. Sharma', email: 'officer.sharma@civora.gov', role: ROLES.FIELD_OFFICER, dept: 'ROADS' },
  { name: 'Supervisor A. Patel', email: 'inspector.patel@civora.gov', role: ROLES.SUPERVISOR, dept: 'WATER' },
  { name: 'Roads Supervisor K. Iyer', email: 'roads.supervisor@civora.gov', role: ROLES.SUPERVISOR, dept: 'ROADS' },
  { name: 'Sanitation Supervisor M. Khan', email: 'sanitation.supervisor@civora.gov', role: ROLES.SUPERVISOR, dept: 'SANITATION' },
  { name: 'Power Supervisor S. Das', email: 'power.supervisor@civora.gov', role: ROLES.SUPERVISOR, dept: 'POWER' },
  { name: 'Parks Supervisor L. Menon', email: 'parks.supervisor@civora.gov', role: ROLES.SUPERVISOR, dept: 'PARKS' },
  { name: 'Operations Supervisor P. Rao', email: 'operations.supervisor@civora.gov', role: ROLES.SUPERVISOR, dept: 'GENERAL' },
  { name: 'Specialist Unit Lead T. Nair', email: 'pwsu.lead@civora.gov', role: ROLES.SUPERVISOR, dept: 'PWSU' },
];

async function seedDepartments() {
  for (const d of DEPARTMENTS) {
    await Department.updateOne(
      { code: d.code },
      { $set: { name: d.name, categories: d.categories, isActive: true } },
      { upsert: true }
    );
  }
}

async function seedAccounts() {
  const depts = await Department.find({}).lean();
  const byCode = Object.fromEntries(depts.map((d) => [d.code, d._id]));
  let created = 0;

  if (config.seed.staffPassword) {
    const hash = await bcrypt.hash(config.seed.staffPassword, 10);
    for (const s of STAFF_ACCOUNTS) {
      const res = await User.updateOne(
        { email: s.email },
        { $setOnInsert: { name: s.name, email: s.email, role: s.role, department: s.dept ? byCode[s.dept] : null, passwordHash: hash } },
        { upsert: true }
      );
      created += res.upsertedCount || 0;
    }
  } else {
    console.warn('[Seed] SEED_STAFF_PASSWORD not set: authority/admin accounts were not provisioned.');
  }

  if (config.seed.demoCitizenPassword) {
    const hash = await bcrypt.hash(config.seed.demoCitizenPassword, 10);
    const res = await User.updateOne(
      { email: 'citizen@civora.org' },
      { $setOnInsert: { name: 'Aditi Rao', email: 'citizen@civora.org', role: ROLES.CITIZEN, address: 'Indiranagar', passwordHash: hash } },
      { upsert: true }
    );
    created += res.upsertedCount || 0;
  }
  return created;
}

async function runSeed() {
  await seedDepartments();
  const created = await seedAccounts();
  console.log(`[Seed] Departments ensured (${DEPARTMENTS.length}); new accounts created: ${created}`);
}

/**
 * Explicit opt-in (npm run seed -- --reset-staff-passwords): sets the seeded staff
 * accounts to SEED_STAFF_PASSWORD and ends their sessions. Only these known emails are touched.
 */
async function resetStaffPasswords() {
  if (!config.seed.staffPassword) throw new Error('SEED_STAFF_PASSWORD is not set.');
  const hash = await bcrypt.hash(config.seed.staffPassword, 10);
  const res = await User.updateMany(
    { email: { $in: STAFF_ACCOUNTS.map((s) => s.email) } },
    { $set: { passwordHash: hash }, $inc: { tokenVersion: 1 } }
  );
  console.log(`[Seed] Staff passwords reset to SEED_STAFF_PASSWORD: ${res.modifiedCount} account(s).`);
}

module.exports = { runSeed, resetStaffPasswords, STAFF_ACCOUNTS };
