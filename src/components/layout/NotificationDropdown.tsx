import React from 'react';
import { Bell, Check, CheckCheck, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/contexts/NotificationContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../../types/notification';
// import { supabase } from '@/integrations/supabase/client'; // REMOVED - Using Django API now

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'consent_request': return '📋';
    case 'consent_approved': return '✅';
    case 'consent_denied': return '❌';
    case 'prescription_created': 
    case 'prescription_updated': return '💊';
    case 'consultation_note_created': 
    case 'consultation_note_updated': return '📝';
    case 'record_access_granted': return '🔓';
    case 'record_access_denied': return '🔒';
    case 'consultation_booked': 
    case 'consultation_updated': return '📅';
    case 'ai_analysis_complete': return '🤖';
    case 'health_alert': return '⚠️';
    case 'system': return '🔔';
    default: return '💡';
  }
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export const NotificationDropdown: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  // Get user role from user object (no Supabase call needed)
  const userRole = user?.role || 'patient';
  
  // OLD SUPABASE CODE - REMOVED
  // const [userRole, setUserRole] = React.useState<string>('patient');
  // React.useEffect(() => {
  //   const fetchUserRole = async () => {
  //     if (user?.id) {
  //       try {
  //         const { data: profile, error } = await supabase
  //           .from('profiles')
  //           .select('role')
  //           .eq('user_id', user.id)
  //           .single();
  //         
  //         if (profile && !error) {
  //           setUserRole(profile.role);
  //         }
  //       } catch (error) {
  //         console.error('Error fetching user role:', error);
  //       }
  //     }
  //   };
  //   fetchUserRole();
  // }, [user?.id]);

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read first
    markAsRead(notification.id);
    
    console.log('Notification clicked:', notification);
    console.log('User role:', userRole);
    
    // Navigate based on notification type or actionUrl
    if (notification.actionUrl) {
      console.log('Navigating to actionUrl:', notification.actionUrl);
      navigate(notification.actionUrl);
    } else {
      // Role-aware navigation based on notification type
      let targetPath = '/dashboard';
      
      switch (notification.type) {
        case 'consent_request':
        case 'consent_approved':
        case 'consent_denied':
          targetPath = userRole === 'doctor' ? '/doctor/consents' : '/consent-management';
          break;
        case 'prescription_created':
        case 'prescription_updated':
          targetPath = userRole === 'doctor' ? '/doctor/prescriptions' : '/prescriptions';
          break;
        case 'consultation_note_created':
        case 'consultation_note_updated':
          targetPath = userRole === 'doctor' ? '/doctor/consultation-notes' : '/consultation-notes';
          break;
        case 'record_access_granted':
        case 'record_access_denied':
          targetPath = userRole === 'doctor' ? '/doctor/patient-records' : '/patient-records';
          break;
        case 'consultation_booked':
        case 'consultation_updated':
          targetPath = userRole === 'doctor' ? '/doctor/consultations' : '/consultations';
          break;
        case 'ai_analysis_complete':
          targetPath = '/records';
          break;
        case 'health_alert':
        case 'system':
        default:
          targetPath = userRole === 'doctor' ? '/doctor/dashboard' : '/dashboard';
          break;
      }
      
      console.log('Navigating to:', targetPath);
      navigate(targetPath);
    }
  };

  const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <div className="flex items-center justify-between p-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-64">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <LoadingSpinner size="lg" text="Loading notifications..." />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="p-3 cursor-pointer flex-col items-start gap-1 hover:bg-accent transition-colors"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{notification.title}</p>
                        {!notification.read && (
                          <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
                        )}
                        {notification.actionUrl && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDeleteNotification(e, notification.id)}
                      title="Delete notification"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};