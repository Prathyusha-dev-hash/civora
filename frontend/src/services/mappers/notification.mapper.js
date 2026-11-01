/**
 * Notification Service Data Mapper
 * 
 * Maps backend Notification DTOs to UI presentation models.
 */

export function toUINotification(dto) {
  if (!dto) return null;

  return {
    id: dto.id || dto.notification_id || `NOTIF-${Date.now()}`,
    type: dto.type || 'INFO',
    priority: dto.priority || 'INFO', // 'INFO' | 'ACTION_REQUIRED' | 'URGENT'
    title: dto.title || 'Notification',
    titleKey: dto.title_key || dto.titleKey || null,
    message: dto.message || '',
    messageKey: dto.message_key || dto.messageKey || null,
    params: dto.params || {},
    complaintId: dto.complaint_id || dto.complaintId || null,
    workOrderId: dto.work_order_id || dto.workOrderId || null,
    linkUrl: dto.link_url || dto.linkUrl || null,
    actionRequired: Boolean(dto.action_required ?? dto.actionRequired ?? false),
    actionType: dto.action_type || dto.actionType || null, // 'VERIFY_RESOLUTION' | 'VIEW_TICKET' | 'VIEW_WORK_ORDER'
    status: dto.status || (dto.action_required ? 'PENDING_CONFIRMATION' : 'RESOLVED'), // 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'DISPUTED'
    read: Boolean(dto.read ?? false),
    readAt: dto.read_at || dto.readAt || null,
    createdAt: dto.created_at || dto.createdAt || new Date().toISOString(),
    originalImageUrl: dto.original_image_url || dto.originalImageUrl || null,
    resolutionProofUrl: dto.resolution_proof_url || dto.resolutionProofUrl || null,
    aiConfidence: Number(dto.ai_confidence ?? dto.aiConfidence ?? 0),
    recipientUserId: dto.recipient_user_id || dto.recipientUserId || null,
    recipientEmail: dto.recipient_email || dto.recipientEmail || null,
    recipientRole: dto.recipient_role || dto.recipientRole || null,
    recipientDepartment: dto.recipient_department || dto.recipientDepartment || null,
    isSandbox: Boolean(dto.is_sandbox ?? false),
  };
}

export function toUINotifications(dtos) {
  if (!Array.isArray(dtos)) return [];
  return dtos.map(toUINotification).filter(Boolean);
}

export default {
  toUINotification,
  toUINotifications,
};

