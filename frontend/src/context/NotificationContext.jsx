import { useState, useEffect, useCallback, useMemo } from 'react';
import { NotificationContext } from './notification-context';
import { NotificationService } from '../services/modules/notification.service';
import { useAuth } from './useAuth';

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await NotificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('[NotificationContext] Failed to load notifications:', err);
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated || !user) {
      return () => {
        isMounted = false;
      };
    }

    NotificationService.getNotifications()
      .then((data) => {
        if (isMounted) {
          setNotifications(data || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[NotificationContext] Failed to load notifications:', err);
          setError(err.message || 'Failed to fetch notifications');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  const activeNotifications = useMemo(() => {
    return isAuthenticated && user ? notifications : [];
  }, [isAuthenticated, user, notifications]);

  const markAsRead = useCallback(async (id) => {
    if (!id) return;
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error('[NotificationContext] Failed to mark notification as read:', err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
    } catch (err) {
      console.error('[NotificationContext] Failed to mark all notifications as read:', err);
      throw err;
    }
  }, []);

  const confirmResolution = useCallback(
    async (complaintId, notes = '') => {
      try {
        setIsLoading(true);
        await NotificationService.confirmResolution(complaintId, notes);
        await refreshNotifications();
      } catch (err) {
        console.error('[NotificationContext] Failed to confirm resolution:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshNotifications]
  );

  const disputeResolution = useCallback(
    async (complaintId, reason = '') => {
      try {
        setIsLoading(true);
        await NotificationService.disputeResolution(complaintId, reason);
        await refreshNotifications();
      } catch (err) {
        console.error('[NotificationContext] Failed to dispute resolution:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshNotifications]
  );

  const unreadCount = useMemo(() => {
    return activeNotifications.filter((n) => !n.read).length;
  }, [activeNotifications]);

  const actionRequiredCount = useMemo(() => {
    return activeNotifications.filter((n) => n.actionRequired && !n.read).length;
  }, [activeNotifications]);

  const value = useMemo(
    () => ({
      notifications: activeNotifications,
      unreadCount,
      actionRequiredCount,
      isLoading,
      error,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      confirmResolution,
      disputeResolution,
    }),
    [
      activeNotifications,
      unreadCount,
      actionRequiredCount,
      isLoading,
      error,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      confirmResolution,
      disputeResolution,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
