const { Department } = require('../models');
const { config } = require('../config/env');
const { SEVERITY_LEVELS } = require('../config/constants');

/**
 * Resolves the responsible department for a category using the Department
 * routing table stored in MongoDB (seeded from constants, editable in the DB).
 */
async function departmentForCategory(category) {
  const dept = (await Department.findOne({ categories: category, isActive: true })) || (await Department.findOne({ code: 'GENERAL' }));
  if (!dept) throw new Error('No department configured for routing. Run the seed.');
  return dept;
}

function slaHoursFor(level) {
  return config.sla[level] ?? config.sla.MODERATE;
}

function deadlineFrom(start, hours) {
  return new Date(new Date(start).getTime() + hours * 3600 * 1000);
}

const severityRank = (level) => SEVERITY_LEVELS.indexOf(level);
const maxSeverity = (a, b) => (severityRank(a) >= severityRank(b) ? a : b);

function levelFromScore(score) {
  if (score >= 9) return 'CRITICAL';
  if (score >= 7) return 'HIGH';
  if (score >= 4) return 'MODERATE';
  return 'LOW';
}

module.exports = { departmentForCategory, slaHoursFor, deadlineFrom, severityRank, maxSeverity, levelFromScore };
