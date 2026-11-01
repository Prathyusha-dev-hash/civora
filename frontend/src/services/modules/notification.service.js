/**
 * Role-Based Notification Service
 * 
 * Manages notification retrieval, read/unread states, and citizen resolution confirmation/dispute actions
 * for both Development Sandbox mode and production backend integration.
 */

import { httpClient } from '../http/httpClient';
import { ENDPOINTS } from '../../config/endpoints';
import { toUINotifications, toUINotification } from '../mappers/notification.mapper';
import { AuthService } from './auth.service';

export class NotificationService {
  /**
   * Retrieves notifications scoped to the current authenticated user and role.
   */
  static async getNotifications(filters = {}) {
    const session = AuthService.getSession();
    const user = session?.user;

    if (!user) {
      return [];
    }


    const params = {
      unread_only: filters.unreadOnly || filters.unread_only || undefined,
      action_required: filters.actionRequired || filters.action_required || undefined,
      type: filters.type,
      page: filters.page,
      limit: filters.limit,
    };
    const response = await httpClient.get(ENDPOINTS.NOTIFICATIONS.BASE, params);
    const data = response?.data || response;
    return toUINotifications(Array.isArray(data) ? data : data.notifications);
  }

  /**
   * Retrieves the unread notification count for the active user.
   */
  static async getUnreadCount() {
    const notifications = await this.getNotifications({ unreadOnly: true });
    return notifications.filter((n) => !n.read).length;
  }

  /**
   * Marks a single notification as read.
   */
  static async markAsRead(id) {
    if (!id) return null;

    const response = await httpClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    const data = response?.data || response;
    return toUINotification(data);
  }

  /**
   * Marks all notifications for the active user as read.
   */
  static async markAllAsRead() {
    const session = AuthService.getSession();
    const user = session?.user;

    if (!user) return { success: false };


    const response = await httpClient.post(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    return response?.data || response;
  }

  /**
   * Citizen confirms reported resolution.
   * Directly closes the complaint (CLOSED_VERIFIED) and dispatches confirmation notifications.
   */
  static async confirmResolution(complaintId, notes = '') {
    const response = await httpClient.post(ENDPOINTS.INCIDENTS.FEEDBACK(complaintId), {
      confirmed: true,
      feedback_notes: notes || 'Citizen confirmed resolution: Issue resolved satisfactorily.',
    });
    return response?.data || response;
  }

  /**
   * Citizen disputes reported resolution.
   * Returns complaint for rework (DISPUTED_REWORK_REQUIRED) and dispatches dispute alerts.
   */
  static async disputeResolution(complaintId, reason = '') {
    const response = await httpClient.post(ENDPOINTS.INCIDENTS.FEEDBACK(complaintId), {
      confirmed: false,
      feedback_notes: reason || 'Problem persists, resolution disputed.',
    });
    return response?.data || response;
  }
}

export default NotificationService;

