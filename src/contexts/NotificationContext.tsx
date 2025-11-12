import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Notification } from '../types/notification';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadCount,
  deleteNotification as deleteNotificationService,
  realtimeNotificationService
} from '@/services/notificationService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  refreshNotifications: () => void;
  requestNotificationPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Load notifications when user changes
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      setupRealtimeSubscription();
      
      // Fallback: Poll for notifications every 30 seconds if real-time fails
      const pollInterval = setInterval(() => {
        console.log('🔍 Polling for new notifications...');
        loadNotifications();
      }, 30000);

      return () => {
        // Cleanup realtime subscriptions
        if (user?.id) {
          realtimeNotificationService.unsubscribeFromUserNotifications(user.id);
        }
        clearInterval(pollInterval);
      };
    } else {
      setNotifications([]);
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user?.id) {
      console.log('No user ID available for loading notifications');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Loading notifications for user:', user.id);
      const data = await getUserNotifications(user.id);
      console.log('Loaded notifications:', data);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Set empty array on error to prevent undefined state
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user?.id) {
      console.log('🔍 No user ID available for real-time subscription');
      return;
    }

    console.warn('⚠️ Real-time notification subscriptions disabled (Supabase removed)');
    return;

    /* OLD SUPABASE CODE - REMOVED
    console.log('🔍 Setting up real-time subscription for user:', user.id);

    // Use the enhanced realtime service
    const subscription = realtimeNotificationService.subscribeToUserNotifications(user.id, (payload) => {
      console.log('🔔 Real-time notification received:', payload);
      
      if (payload.eventType === 'INSERT') {
        const newNotification: Notification = {
          id: payload.new.id,
          userId: payload.new.user_id,
          type: payload.new.type as any,
          title: payload.new.title,
          message: payload.new.message,
          read: payload.new.read,
          createdAt: new Date(payload.new.created_at),
          actionUrl: payload.new.action_url,
          metadata: payload.new.metadata || {}
        };
        console.log('🔔 Adding new notification to state:', newNotification);
        setNotifications(prev => [newNotification, ...prev]);
        
        // Show browser notification if permission is granted
        if (Notification.permission === 'granted') {
          new Notification(newNotification.title, {
            body: newNotification.message,
            icon: '/favicon.ico'
          });
        }
      } else if (payload.eventType === 'UPDATE') {
        console.log('🔔 Updating notification:', payload.new.id);
        setNotifications(prev => 
          prev.map(n => 
            n.id === payload.new.id 
              ? { ...n, read: payload.new.read, metadata: payload.new.metadata || {} }
              : n
          )
        );
      } else if (payload.eventType === 'DELETE') {
        console.log('🔔 Deleting notification:', payload.old.id);
        setNotifications(prev => 
          prev.filter(n => n.id !== payload.old.id)
        );
      }
    });

    if (!subscription) {
      console.warn('⚠️ Failed to set up real-time subscription');
    } else {
      console.log('✅ Real-time subscription established');
    }
    */
  };

  const markAsRead = async (id: string) => {
    try {
      const success = await markNotificationAsRead(id);
      if (success) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      const updatedCount = await markAllNotificationsAsRead(user.id);
      if (updatedCount > 0) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const success = await deleteNotificationService(id);
      if (success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const refreshNotifications = async () => {
    await loadNotifications();
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    requestNotificationPermission,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};