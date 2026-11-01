/**
 * Domain constants shared by models, services and controllers.
 * Values mirror the Civora frontend contract (BACKEND_INTEGRATION_SPEC.md).
 */

const ROLES = Object.freeze({
  CITIZEN: 'CITIZEN',
  FIELD_OFFICER: 'AUTHORITY_FIELD_OFFICER',
  SUPERVISOR: 'AUTHORITY_SUPERVISOR',
  ADMIN: 'CITY_ADMIN',
});

const AUTHORITY_ROLES = [ROLES.FIELD_OFFICER, ROLES.SUPERVISOR];
const STAFF_ROLES = [...AUTHORITY_ROLES, ROLES.ADMIN];

// Category ids used by the frontend report wizard
const CATEGORIES = ['roads', 'water', 'sanitation', 'lighting', 'safety', 'traffic', 'parks', 'other'];

/**
 * Seeded municipal departments. `categories` drives automatic routing.
 */
const DEPARTMENTS = [
  { code: 'ROADS', name: 'Roadways & Infrastructure', categories: ['roads', 'safety', 'traffic'] },
  { code: 'WATER', name: 'Water & Sanitation Board', categories: ['water'] },
  { code: 'SANITATION', name: 'Public Health & Sanitation', categories: ['sanitation'] },
  { code: 'POWER', name: 'Power & Grid Authority', categories: ['lighting'] },
  { code: 'PARKS', name: 'Parks & Recreation', categories: ['parks'] },
  { code: 'PWSU', name: 'Public Works Specialist Unit', categories: [] },
  { code: 'GENERAL', name: 'Municipal Operations', categories: ['other'] },
];

const SEVERITY_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

const COMPLAINT_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  ESCALATED: 'ESCALATED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  CLOSED_VERIFIED: 'CLOSED_VERIFIED',
  DISPUTED_REWORK_REQUIRED: 'DISPUTED_REWORK_REQUIRED',
});

const WORK_ORDER_STATUS = Object.freeze({
  ASSIGNED: 'ASSIGNED',
  EN_ROUTE: 'EN_ROUTE',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  RESOLVED: 'RESOLVED',
  ESCALATED: 'ESCALATED',
});

// Statuses an authority may set directly via PATCH /work-orders/:id/status
const AUTHORITY_SETTABLE_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'ESCALATED'];

// Mapping from work-order status to the status shown on linked citizen complaints
const WORK_ORDER_TO_COMPLAINT_STATUS = {
  ASSIGNED: 'ASSIGNED',
  EN_ROUTE: 'IN_PROGRESS',
  IN_PROGRESS: 'IN_PROGRESS',
  ESCALATED: 'ESCALATED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  RESOLVED: 'CLOSED_VERIFIED',
};

const OPEN_COMPLAINT_STATUSES = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'PENDING_VERIFICATION', 'DISPUTED_REWORK_REQUIRED'];

const EVIDENCE_KIND = Object.freeze({
  IMAGE: 'IMAGE',
  REDACTED_IMAGE: 'REDACTED_IMAGE',
  AUDIO: 'AUDIO',
  RESOLUTION_PROOF: 'RESOLUTION_PROOF',
});

const LANGUAGES = ['en', 'hi', 'bn', 'gu', 'kn', 'ml', 'mr', 'pa', 'ta', 'te', 'ur'];

module.exports = {
  ROLES,
  AUTHORITY_ROLES,
  STAFF_ROLES,
  CATEGORIES,
  DEPARTMENTS,
  SEVERITY_LEVELS,
  COMPLAINT_STATUS,
  WORK_ORDER_STATUS,
  AUTHORITY_SETTABLE_STATUSES,
  WORK_ORDER_TO_COMPLAINT_STATUS,
  OPEN_COMPLAINT_STATUSES,
  EVIDENCE_KIND,
  LANGUAGES,
};
