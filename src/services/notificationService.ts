// Supabase removed - using Django API only
import type { Notification, CreateNotificationData } from '../types/notification';

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// Get user notifications - DISABLED (Supabase removed, Django API not implemented yet)
export const getUserNotifications = async (userId: string, limit: number = 50): Promise<Notification[]> => {
  // TODO: Implement Django API call to fetch notifications
  console.warn('⚠️ getUserNotifications disabled - Supabase removed, Django API not implemented yet');
  return [];
  
  /* OLD SUPABASE CODE - REMOVED
  try {
    const { data, error } = await supabase
      .from('notifications' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // If notifications table doesn't exist, return empty array
      if (error.message.includes('relation "notifications" does not exist') || 
          error.message.includes('Could not find the table')) {
        console.warn('Notifications table does not exist yet. Returning empty array.');
        return [];
      }
      throw error;
    }

    return (data || []).map((notification: any) => ({
      id: notification.id,
      userId: notification.user_id,
      type: notification.type as any,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      createdAt: new Date(notification.created_at),
      actionUrl: notification.action_url,
      metadata: notification.metadata || {}
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return []; // Return empty array instead of throwing
  }
  */
};

// Mark notification as read - DISABLED (Supabase removed, Django API not implemented yet)
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  // TODO: Implement Django API call to mark notification as read
  console.warn('⚠️ markNotificationAsRead disabled - Supabase removed, Django API not implemented yet');
  return true; // Return true to avoid breaking the UI
  
  /* OLD SUPABASE CODE - REMOVED
  try {
    const { error } = await supabase
      .from('notifications' as any)
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      if (error.message.includes('relation "notifications" does not exist')) {
        console.warn('Notifications table does not exist yet.');
        return true; // Return true to avoid breaking the UI
      }
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
  */
};

// Mark all notifications as read for user - DISABLED (Supabase removed, Django API not implemented yet)
export const markAllNotificationsAsRead = async (userId: string): Promise<number> => {
  // TODO: Implement Django API call to mark all notifications as read
  console.warn('⚠️ markAllNotificationsAsRead disabled - Supabase removed, Django API not implemented yet');
  return 0;
  
  /* OLD SUPABASE CODE - REMOVED
  try {
    const { data, error } = await supabase
      .from('notifications' as any)
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
      .select('id');

    if (error) {
      if (error.message.includes('relation "notifications" does not exist')) {
        console.warn('Notifications table does not exist yet.');
        return 0;
      }
      throw error;
    }
    return data?.length || 0;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return 0;
  }
  */
};

// Create a new notification - DISABLED (Supabase removed, Django API not implemented yet)
export const createNotification = async (notificationData: CreateNotificationData): Promise<string | null> => {
  // TODO: Implement Django API call to create notification
  console.warn('⚠️ createNotification disabled - Supabase removed, Django API not implemented yet');
  return null;
  
  /* OLD SUPABASE CODE - REMOVED
  try {
    console.log('🔔 Creating notification with data:', notificationData);
    
    const insertData: any = {
      user_id: notificationData.userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      action_url: notificationData.actionUrl,
      metadata: notificationData.metadata || {}
    };

    // Only include profile_id if it's provided
    if (notificationData.profileId) {
      insertData.profile_id = notificationData.profileId;
    }

    const { data, error } = await supabase
      .from('notifications' as any)
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      if (error.message.includes('relation "notifications" does not exist')) {
        console.warn('Notifications table does not exist yet. Skipping notification creation.');
        return null;
      }
      console.error('❌ Error creating notification:', error);
      throw error;
    }
    
    console.log('✅ Notification created successfully:', (data as any).id);
    return (data as any).id;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return null;
  }
  */
};

// Delete notification - DISABLED (Supabase removed, Django API not implemented yet)
export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  // TODO: Implement Django API call to delete notification
  console.warn('⚠️ deleteNotification disabled - Supabase removed, Django API not implemented yet');
  return true; // Return true to avoid breaking the UI
  
  /* OLD SUPABASE CODE - REMOVED
  try {
    const { error } = await supabase
      .from('notifications' as any)
      .delete()
      .eq('id', notificationId);

    if (error) {
      if (error.message.includes('relation "notifications" does not exist')) {
        console.warn('Notifications table does not exist yet.');
        return true; // Return true to avoid breaking the UI
      }
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
  */
};

// Get unread count - DISABLED (Supabase removed, Django API not implemented yet)
export const getUnreadCount = async (userId: string): Promise<number> => {
  // TODO: Implement Django API call to get unread count
  console.warn('⚠️ getUnreadCount disabled - Supabase removed, Django API not implemented yet');
  return 0;
  
  /* OLD SUPABASE CODE - REMOVED
  try {
    const { count, error } = await supabase
      .from('notifications' as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      if (error.message.includes('relation "notifications" does not exist')) {
        console.warn('Notifications table does not exist yet.');
        return 0;
      }
      throw error;
    }
    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
  */
};

// Notification creation helpers for specific events
export const createConsentRequestNotification = async (
  patientUserId: string,
  patientProfileId: string,
  doctorName: string
): Promise<string | null> => {
  return createNotification({
    userId: patientUserId,
    profileId: patientProfileId,
    type: 'consent_request',
    title: 'New Consent Request',
    message: `${doctorName} has requested access to your medical records`,
    actionUrl: '/consent-management',
    metadata: { doctorName }
  });
};

export const createConsentApprovedNotification = async (
  doctorUserId: string,
  doctorProfileId: string,
  patientName: string
): Promise<string | null> => {
  return createNotification({
    userId: doctorUserId,
    profileId: doctorProfileId,
    type: 'consent_approved',
    title: 'Consent Approved',
    message: `${patientName} has approved your consent request`,
    actionUrl: '/doctor/consents',
    metadata: { patientName }
  });
};

export const createConsentDeniedNotification = async (
  doctorUserId: string,
  doctorProfileId: string,
  patientName: string
): Promise<string | null> => {
  return createNotification({
    userId: doctorUserId,
    profileId: doctorProfileId,
    type: 'consent_denied',
    title: 'Consent Denied',
    message: `${patientName} has denied your consent request`,
    actionUrl: '/doctor/consents',
    metadata: { patientName }
  });
};

export const createPrescriptionNotification = async (
  patientUserId: string,
  patientProfileId: string,
  doctorName: string,
  prescriptionTitle: string
): Promise<string | null> => {
  return createNotification({
    userId: patientUserId,
    profileId: patientProfileId,
    type: 'prescription_created',
    title: 'New Prescription',
    message: `You have a new prescription "${prescriptionTitle}" from ${doctorName}`,
    actionUrl: '/prescriptions',
    metadata: { doctorName, prescriptionTitle }
  });
};

export const createConsultationNoteNotification = async (
  patientUserId: string,
  patientProfileId: string,
  doctorName: string,
  noteTitle: string
): Promise<string | null> => {
  console.log('🔔 createConsultationNoteNotification called with:', {
    patientUserId,
    patientProfileId,
    doctorName,
    noteTitle
  });
  
  const result = await createNotification({
    userId: patientUserId,
    profileId: patientProfileId,
    type: 'consultation_note_created',
    title: 'New Consultation Note',
    message: `You have a new consultation note "${noteTitle}" from ${doctorName}`,
    actionUrl: '/consultation-notes',
    metadata: { doctorName, noteTitle }
  });
  
  console.log('🔔 createConsultationNoteNotification result:', result);
  return result;
};

export const createRecordAccessNotification = async (
  doctorUserId: string,
  doctorProfileId: string,
  patientName: string,
  accessType: 'granted' | 'denied'
): Promise<string | null> => {
  const type = accessType === 'granted' ? 'record_access_granted' : 'record_access_denied';
  const title = accessType === 'granted' ? 'Record Access Granted' : 'Record Access Denied';
  const message = accessType === 'granted' 
    ? `You now have access to ${patientName}'s medical records`
    : `Access to ${patientName}'s medical records has been denied`;

  return createNotification({
    userId: doctorUserId,
    profileId: doctorProfileId,
    type,
    title,
    message,
    actionUrl: '/patient-records',
    metadata: { patientName, accessType }
  });
};

export const createConsultationBookedNotification = async (
  doctorUserId: string,
  doctorProfileId: string,
  patientName: string,
  consultationDate: string
): Promise<string | null> => {
  return createNotification({
    userId: doctorUserId,
    profileId: doctorProfileId,
    type: 'consultation_booked',
    title: 'New Consultation Booked',
    message: `${patientName} has booked a consultation for ${consultationDate}`,
    actionUrl: '/doctor/consultations',
    metadata: { patientName, consultationDate }
  });
};

export const createHealthAlertNotification = async (
  patientUserId: string,
  patientProfileId: string,
  alertMessage: string
): Promise<string | null> => {
  return createNotification({
    userId: patientUserId,
    profileId: patientProfileId,
    type: 'health_alert',
    title: 'Health Alert',
    message: alertMessage,
    actionUrl: '/dashboard',
    metadata: { alertType: 'health' }
  });
};

// New notification helpers for additional triggers
export const createHealthRecordUploadNotification = async (
  doctorUserId: string,
  doctorProfileId: string,
  patientName: string,
  recordTitle: string
): Promise<string | null> => {
  console.log('🔔 createHealthRecordUploadNotification called with:', {
    doctorUserId,
    doctorProfileId,
    patientName,
    recordTitle
  });
  
  const result = await createNotification({
    userId: doctorUserId,
    profileId: doctorProfileId,
    type: 'health_alert', // Using health_alert as closest type
    title: 'New Health Record Uploaded',
    message: `${patientName} has uploaded a new health record: "${recordTitle}"`,
    actionUrl: '/doctor/patient-records',
    metadata: { patientName, recordTitle, type: 'record_upload' }
  });
  
  console.log('🔔 createHealthRecordUploadNotification result:', result);
  return result;
};

export const createPrescriptionUpdatedNotification = async (
  patientUserId: string,
  patientProfileId: string,
  doctorName: string,
  prescriptionTitle: string
): Promise<string | null> => {
  return createNotification({
    userId: patientUserId,
    profileId: patientProfileId,
    type: 'prescription_updated',
    title: 'Prescription Updated',
    message: `Your prescription "${prescriptionTitle}" has been updated by ${doctorName}`,
    actionUrl: '/prescriptions',
    metadata: { doctorName, prescriptionTitle }
  });
};

export const createConsultationNoteUpdatedNotification = async (
  patientUserId: string,
  patientProfileId: string,
  doctorName: string,
  noteTitle: string
): Promise<string | null> => {
  return createNotification({
    userId: patientUserId,
    profileId: patientProfileId,
    type: 'consultation_note_updated',
    title: 'Consultation Note Updated',
    message: `Your consultation note "${noteTitle}" has been updated by ${doctorName}`,
    actionUrl: '/consultation-notes',
    metadata: { doctorName, noteTitle }
  });
};

export const createConsultationUpdatedNotification = async (
  patientUserId: string,
  patientProfileId: string,
  doctorName: string,
  consultationDate: string
): Promise<string | null> => {
  return createNotification({
    userId: patientUserId,
    profileId: patientProfileId,
    type: 'consultation_updated',
    title: 'Consultation Updated',
    message: `Your consultation scheduled for ${consultationDate} has been updated by ${doctorName}`,
    actionUrl: '/consultations',
    metadata: { doctorName, consultationDate }
  });
};

export const createConsultationUpdatedForDoctorNotification = async (
  doctorUserId: string,
  doctorProfileId: string,
  patientName: string,
  consultationDate: string
): Promise<string | null> => {
  return createNotification({
    userId: doctorUserId,
    profileId: doctorProfileId,
    type: 'consultation_updated',
    title: 'Consultation Updated',
    message: `Consultation with ${patientName} on ${consultationDate} has been updated`,
    actionUrl: '/doctor/consultations',
    metadata: { patientName, consultationDate }
  });
};

// Real-time notification service with enhanced capabilities
export class RealtimeNotificationService {
  private static instance: RealtimeNotificationService;
  private subscriptions: Map<string, any> = new Map();

  static getInstance(): RealtimeNotificationService {
    if (!RealtimeNotificationService.instance) {
      RealtimeNotificationService.instance = new RealtimeNotificationService();
    }
    return RealtimeNotificationService.instance;
  }

  // Subscribe to notifications for a specific user - DISABLED (Supabase removed)
  subscribeToUserNotifications(userId: string, callback: (notification: any) => void) {
    console.warn('⚠️ Real-time notification subscriptions disabled (Supabase removed)');
    return null;
    
    /* OLD SUPABASE CODE - REMOVED
    const channelName = `user_notifications_${userId}`;
    
    if (this.subscriptions.has(channelName)) {
      this.unsubscribeFromUserNotifications(userId);
    }

    try {
      console.log('🔍 Setting up real-time subscription for user:', userId);
      
      const subscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('🔔 Real-time notification received:', payload);
            callback(payload);
          }
        )
        .subscribe((status) => {
          console.log('🔍 Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to notifications');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel error - notifications table may not exist');
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Subscription timed out');
          } else if (status === 'CLOSED') {
            console.log('🔍 Subscription closed');
          }
        });

      this.subscriptions.set(channelName, subscription);
      return subscription;
    } catch (error) {
      console.warn('Failed to subscribe to notifications (table may not exist):', error);
      return null;
    }
    */
  }

  // Unsubscribe from user notifications
  unsubscribeFromUserNotifications(userId: string) {
    const channelName = `user_notifications_${userId}`;
    const subscription = this.subscriptions.get(channelName);
    
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(channelName);
    }
  }

  // Subscribe to all notifications (for admin purposes) - DISABLED (Supabase removed)
  subscribeToAllNotifications(callback: (notification: any) => void) {
    console.warn('⚠️ subscribeToAllNotifications disabled - Supabase removed');
    return null;
    
    /* OLD SUPABASE CODE - REMOVED
    const channelName = 'all_notifications';
    
    if (this.subscriptions.has(channelName)) {
      this.unsubscribeFromAllNotifications();
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('🔔 New notification created:', payload);
          callback(payload);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, subscription);
    return subscription;
    */
  }

  // Unsubscribe from all notifications
  unsubscribeFromAllNotifications() {
    const channelName = 'all_notifications';
    const subscription = this.subscriptions.get(channelName);
    
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(channelName);
    }
  }

  // Cleanup all subscriptions
  cleanup() {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const realtimeNotificationService = RealtimeNotificationService.getInstance();
