/**
 * Civora Centralized API Endpoints Catalog
 * 
 * Defines all backend route paths, query parameter builders, and route parameter interpolators.
 * Keeps React UI components and service modules independent of URL structure changes.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';


export const ENDPOINTS = {
  // Authentication & Session
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Citizen Complaint Intake & Tracking
  INCIDENTS: {
    BASE: '/incidents',
    BY_ID: (id) => `/incidents/${encodeURIComponent(id)}`,
    SUPPORT: (id) => `/incidents/${encodeURIComponent(id)}/support`,
    FEEDBACK: (id) => `/incidents/${encodeURIComponent(id)}/feedback`,
    CHECK_DUPLICATES: '/incidents/duplicates/check',
  },

  // AI & Vision Inference Services
  AI: {
    TRANSCRIBE: '/ai/transcribe',
    TRANSLATE: '/ai/translate',
    REDACT_PII: '/ai/redact-pii',
    ASSESS_SEVERITY: '/ai/assess-severity',
    ANALYZE_IMAGE: '/ai/analyze-image',
    VERIFY_RESOLUTION: '/ai/verify-resolution',
  },

  // Municipal Authority & Field Operations
  AUTHORITY: {
    WORK_ORDERS: '/authority/work-orders',
    WORK_ORDER_BY_ID: (id) => `/authority/work-orders/${encodeURIComponent(id)}`,
    UPDATE_STATUS: (id) => `/authority/work-orders/${encodeURIComponent(id)}/status`,
    UPDATE_PROGRESS: (id) => `/authority/work-orders/${encodeURIComponent(id)}/progress`,
    ESCALATE: (id) => `/authority/work-orders/${encodeURIComponent(id)}/escalate`,
    SUBMIT_PROOF: (id) => `/authority/work-orders/${encodeURIComponent(id)}/resolution-proof`,
    TIMELINE: (id) => `/authority/work-orders/${encodeURIComponent(id)}/timeline`,
  },

  // Admin Oversight & Citywide Governance
  ADMIN: {
    OVERVIEW: '/admin/overview',
    HOTSPOTS: '/admin/hotspots',
    DEPARTMENT_METRICS: '/admin/metrics/departments',
    SLA_COMPLIANCE: '/admin/metrics/sla',
    AUDIT_LOGS: '/admin/audit-logs',
  },

  // Role-Based Notifications
  NOTIFICATIONS: {
    BASE: '/notifications',
    MARK_READ: (id) => `/notifications/${encodeURIComponent(id)}/read`,
    MARK_ALL_READ: '/notifications/read-all',
  },
};

export default ENDPOINTS;

