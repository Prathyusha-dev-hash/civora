import { createContext } from 'react';

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  actionRequiredCount: 0,
  isLoading: false,
  error: null,
  refreshNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  confirmResolution: async () => {},
  disputeResolution: async () => {},
});

export default NotificationContext;

