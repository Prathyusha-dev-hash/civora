const express = require('express');
const { requireAuth, optionalAuth, requireRole } = require('../../middleware/auth.middleware');
const { upload } = require('../../middleware/upload.middleware');
const { ROLES, AUTHORITY_ROLES, STAFF_ROLES } = require('../../config/constants');
const auth = require('../../controllers/auth.controller');
const files = require('../../controllers/files.controller');
const incidents = require('../../controllers/incidents.controller');
const aiCtl = require('../../controllers/ai.controller');
const authority = require('../../controllers/authority.controller');
const admin = require('../../controllers/admin.controller');
const notifications = require('../../controllers/notifications.controller');

const router = express.Router();

// ---- Authentication
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.post('/auth/forgot-password', auth.forgotPassword);
router.post('/auth/reset-password', auth.resetPassword);
router.get('/auth/me', requireAuth, auth.me);
router.post('/auth/logout', requireAuth, auth.logout);

// ---- Signed evidence file retrieval (signature is the credential)
router.get('/files/:id', files.serveFile);

// ---- Citizen incidents
const complaintUpload = upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'audio', maxCount: 1 },
]);
router.post('/incidents/duplicates/check', requireAuth, incidents.checkDuplicates);
router.post('/incidents', requireAuth, complaintUpload, incidents.createIncident);
router.get('/incidents', requireAuth, incidents.listIncidents);
router.get('/incidents/:id', optionalAuth, incidents.getIncident);
router.post('/incidents/:id/support', requireAuth, incidents.supportIncident);
router.post('/incidents/:id/feedback', requireAuth, requireRole(ROLES.CITIZEN), incidents.submitFeedback);

// ---- AI (authenticated to protect provider quota)
router.post('/ai/transcribe', requireAuth, upload.fields([{ name: 'audio', maxCount: 1 }]), aiCtl.transcribe);
router.post('/ai/translate', requireAuth, aiCtl.translate);
router.post('/ai/redact-pii', requireAuth, upload.fields([{ name: 'image', maxCount: 1 }]), aiCtl.redactPii);
router.post('/ai/assess-severity', requireAuth, aiCtl.assessSeverity);
router.post('/ai/analyze-image', requireAuth, upload.fields([{ name: 'image', maxCount: 1 }]), aiCtl.analyzeImage);
router.post('/ai/check-duplicates', requireAuth, incidents.checkDuplicates);
router.post('/ai/verify-resolution', requireAuth, requireRole(...STAFF_ROLES), upload.fields([{ name: 'resolution_image', maxCount: 1 }]), aiCtl.verifyResolution);

// ---- Authority work orders
const staffOnly = [requireAuth, requireRole(...AUTHORITY_ROLES, ROLES.ADMIN)];
router.get('/authority/work-orders', staffOnly, authority.listWorkOrders);
router.get('/authority/work-orders/:id', staffOnly, authority.getWorkOrder);
router.get('/authority/work-orders/:id/timeline', staffOnly, authority.getTimeline);
router.patch('/authority/work-orders/:id/status', staffOnly, authority.updateStatus);
router.post('/authority/work-orders/:id/progress', staffOnly, authority.addProgress);
router.post('/authority/work-orders/:id/escalate', staffOnly, authority.escalate);
router.post(
  '/authority/work-orders/:id/resolution-proof',
  staffOnly,
  upload.fields([{ name: 'resolution_image', maxCount: 1 }, { name: 'proof_image', maxCount: 1 }]),
  authority.submitProof
);

// ---- Admin analytics
const adminOnly = [requireAuth, requireRole(ROLES.ADMIN)];
router.get('/admin/overview', adminOnly, admin.overview);
router.get('/admin/hotspots', adminOnly, admin.hotspots);
router.get('/admin/metrics/departments', adminOnly, admin.departmentMetrics);
router.get('/admin/audit-logs', adminOnly, admin.auditLogs);

// ---- Notifications
router.get('/notifications', requireAuth, notifications.list);
router.patch('/notifications/:id/read', requireAuth, notifications.markRead);
router.post('/notifications/read-all', requireAuth, notifications.markAllRead);
router.post('/notifications/mark-all-read', requireAuth, notifications.markAllRead);

module.exports = router;
