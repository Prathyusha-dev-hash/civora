/**
 * Incident Domain Service
 * 
 * Handles all complaint intake, ticket lookups, community upvoting, and citizen feedback sign-off.
 */

import { httpClient } from '../http/httpClient';
import { ENDPOINTS } from '../../config/endpoints';
import { toUIIncident, toCreateIncidentFormData } from '../mappers/incident.mapper';

const SUBMIT_TIMEOUT_MS = 120000;

export class IncidentService {
  /**
   * Fetches incidents list with optional filters.
   */
  static async getIncidents(params = {}) {
    const response = await httpClient.get(ENDPOINTS.INCIDENTS.BASE, params);
    const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
    return list.map(toUIIncident);
  }

  /**
   * Retrieves single incident by its ID or ticket reference number.
   */
  static async getIncidentById(id) {
    if (!id) return null;

    const response = await httpClient.get(ENDPOINTS.INCIDENTS.BY_ID(id));
    const data = response?.data || response;
    return data ? toUIIncident(data) : null;
  }

  /**
   * Submits a new citizen complaint.
   */
  static async createIncident(incidentData) {

    // Files are uploaded with the complaint; AI analysis + routing run server-side before the response
    const response = await httpClient.postFormData(ENDPOINTS.INCIDENTS.BASE, toCreateIncidentFormData(incidentData), { timeout: SUBMIT_TIMEOUT_MS });
    const data = response?.data || response;
    return toUIIncident(data);
  }

  /**
   * Adds community support ("upvote") to an existing incident to prevent duplicate tickets.
   */
  static async supportIncident(id) {
    const response = await httpClient.post(ENDPOINTS.INCIDENTS.SUPPORT(id));
    return response?.data || response;
  }

  /**
   * Citizen post-resolution feedback (Confirm or Dispute).
   */
  static async submitCitizenFeedback(id, { confirmed, feedbackNotes }) {
    const response = await httpClient.post(ENDPOINTS.INCIDENTS.FEEDBACK(id), {
      confirmed: Boolean(confirmed),
      feedback_notes: feedbackNotes || undefined,
    });
    return response?.data || response;
  }
}

export default IncidentService;

