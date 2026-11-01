/**
 * Authority & Field Operations Domain Service
 */

import { httpClient } from '../http/httpClient';
import { ENDPOINTS } from '../../config/endpoints';
import { toUIWorkOrder } from '../mappers/authority.mapper';

export class AuthorityService {
  /**
   * Retrieves department work orders with filters (status, priority, department).
   */
  static async getWorkOrders(params = {}) {
    const response = await httpClient.get(ENDPOINTS.AUTHORITY.WORK_ORDERS, params);
    const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
    return list.map(toUIWorkOrder);
  }

  /**
   * Retrieves specific work order details by ID.
   */
  static async getWorkOrderById(id) {
    if (!id) return null;

    const response = await httpClient.get(ENDPOINTS.AUTHORITY.WORK_ORDER_BY_ID(id));
    const data = response?.data || response;
    return data ? toUIWorkOrder(data) : null;
  }

  /**
   * Updates work order status (e.g. ASSIGNED -> EN_ROUTE -> IN_PROGRESS).
   */
  static async updateStatus(id, status, officerName = 'Officer In-Charge') {
    const response = await httpClient.patch(ENDPOINTS.AUTHORITY.UPDATE_STATUS(id), {
      status,
      officer_name: officerName,
    });
    const data = response?.data || response;
    return toUIWorkOrder(data);
  }

  /**
   * Adds field technician progress note.
   */
  static async addProgressNote(id, note, author = 'Field Officer') {
    const response = await httpClient.post(ENDPOINTS.AUTHORITY.UPDATE_PROGRESS(id), {
      note,
      author,
    });
    const data = response?.data || response;
    return toUIWorkOrder(data);
  }

  /**
   * Escalates work order to supervisor or reassigns department.
   */
  static async escalateWorkOrder(id, reason, targetDepartment = null) {
    const response = await httpClient.post(ENDPOINTS.AUTHORITY.ESCALATE(id), {
      reason,
      target_department: targetDepartment,
    });
    const data = response?.data || response;
    return toUIWorkOrder(data);
  }

  /**
   * Submits post-repair resolution proof image and notes.
   */
  static async submitResolutionProof(id, { proofFile, notes }) {

    // The proof photo itself is uploaded and stored server-side (never a temporary blob URL)
    if (!proofFile) {
      throw new Error('Please attach the post-repair photo.');
    }
    const formData = new FormData();
    formData.append('resolution_image', proofFile, proofFile.name || 'resolution.jpg');
    if (notes) formData.append('notes', notes);
    const response = await httpClient.postFormData(ENDPOINTS.AUTHORITY.SUBMIT_PROOF(id), formData, { timeout: 90000 });
    const data = response?.data || response;
    return toUIWorkOrder(data);
  }
}

export default AuthorityService;

