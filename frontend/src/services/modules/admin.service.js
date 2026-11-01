/**
 * Admin Governance Domain Service
 */

import { httpClient } from '../http/httpClient';
import { ENDPOINTS } from '../../config/endpoints';
import {
  toUIAdminOverview,
  toUIHotspots,
  toUIDepartmentMetrics,
  toUIAuditLogs,
} from '../mappers/admin.mapper';

export class AdminService {
  /**
   * Citywide executive summary KPIs.
   */
  static async getOverview() {
    const response = await httpClient.get(ENDPOINTS.ADMIN.OVERVIEW);
    const data = response?.data || response;
    return toUIAdminOverview(data);
  }

  /**
   * Ward-by-ward infrastructure failure hotspots.
   */
  static async getHotspots() {
    const response = await httpClient.get(ENDPOINTS.ADMIN.HOTSPOTS);
    const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
    return toUIHotspots(list);
  }

  /**
   * Department MTTR and SLA resolution velocity benchmarks.
   */
  static async getDepartmentMetrics() {
    const response = await httpClient.get(ENDPOINTS.ADMIN.DEPARTMENT_METRICS);
    const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
    return toUIDepartmentMetrics(list);
  }

  /**
   * Tamper-evident civic audit logs.
   */
  static async getAuditLogs(params = {}) {
    const response = await httpClient.get(ENDPOINTS.ADMIN.AUDIT_LOGS, params);
    const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
    return toUIAuditLogs(list);
  }
}

export default AdminService;

