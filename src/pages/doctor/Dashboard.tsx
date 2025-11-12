import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, CheckCircle, Calendar, Plus, Activity, Stethoscope, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addMinutes } from 'date-fns';
// Supabase removed - using Django API only
import { getSimpleDashboardStats, getSimpleRecentActivity, getSimpleUpcomingTasks } from '@/services/simpleDashboardService';
import { type DashboardStats, type RecentActivity, type UpcomingTask } from '@/services/dashboardService';
import { dataPrefetchService } from '@/services/dataPrefetchService';
import { ScheduleService, type CalendarEvent } from '@/services/scheduleService';
import { EventService, Event, CreateEventData } from '@/services/eventService';
import { PageSkeleton } from '@/components/ui/skeleton-loading';
import { ProgressiveStats, ProgressiveList } from '@/components/ui/progressive-loading';
import QuickActions from '@/components/layout/QuickActions';
import { lazy, Suspense } from 'react';
import EnhancedCalendarComponent from '@/components/calendar/EnhancedCalendarComponent';
import DoctorSchedulingModal, { DoctorScheduleData } from '@/components/calendar/DoctorSchedulingModal';
import DayViewModal from '@/components/calendar/DayViewModal';
import { useLoadingState } from '@/hooks/useLoadingState';

const CalendarComponent = lazy(() => import('@/components/calendar/CalendarComponent'));
const CalendarSkeleton = lazy(() => import('@/components/calendar/CalendarSkeleton'));
import SchedulingModal, { ScheduleData } from '@/components/calendar/SchedulingModal';
import MeetingDetailsModal from '@/components/calendar/MeetingDetailsModal';
import WelcomeDashboard from '@/components/dashboard/WelcomeDashboard';

const DoctorDashboard = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    pendingConsents: 0,
    activeConsents: 0,
    totalRecords: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const { loading, setLoading, error, setError, reset } = useLoadingState({
    initialLoading: true,
    resetOnLocationChange: true,
    debounceMs: 500 // Increased debounce to prevent flickering
  });
  
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);
  
  // Calendar and Schedule states
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isMeetingDetailsOpen, setIsMeetingDetailsOpen] = useState(false);
  const [isDayViewOpen, setIsDayViewOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [calendarKey, setCalendarKey] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(false); // For preventing shaking during data load

  // Get doctor profile ID once - using Django API
  useEffect(() => {
    const getDoctorProfileId = async () => {
      console.log('🔍 Getting doctor profile ID, user:', user);
      if (!user) {
        console.log('❌ No user found');
        setLoading(false);
        return;
      }
      
      try {
        // Use user profile ID from the user object (Django API)
        // The profile ID should be available in user.profile.id
        if (user.profile?.id) {
          console.log('✅ Found doctor profile ID from user object:', user.profile.id);
          setDoctorProfileId(user.profile.id);
        } else if (user.id) {
          // Fallback: use user ID as profile ID (they should be the same in Django)
          console.log('⚠️ Profile ID not found, using user ID:', user.id);
          setDoctorProfileId(user.id);
        }
        setLoading(false);
      } catch (error) {
        console.error('❌ Error getting doctor profile:', error);
        console.log('⚠️ Will show dashboard with empty data');
        setLoading(false);
      }
    };

    getDoctorProfileId();
  }, [user]);

  // Debug component mounting/unmounting
  useEffect(() => {
    console.log('🔄 Dashboard component mounted');
    
    return () => {
      console.log('🔄 Dashboard component unmounting');
    };
  }, []);

  // Load events for calendar with memoization
  const loadEvents = useCallback(async () => {
    if (!doctorProfileId) return;
    
    setIsDataLoading(true);
    try {
      console.log('Loading events for doctor:', doctorProfileId);
      
      // Always try consultations table first (since it exists)
      const consultationEvents = await ScheduleService.getDoctorEvents(doctorProfileId);
      console.log('Loaded consultations:', consultationEvents);
      
      // Try to load from events table as well
      let additionalEvents: any[] = [];
      try {
        const eventsData = await EventService.getDoctorEvents(doctorProfileId);
        if (eventsData && eventsData.length > 0) {
          console.log('Loaded additional events from events table:', eventsData);
          // Convert to CalendarEvent format
          additionalEvents = eventsData.map(event => ({
            id: event.id,
            title: event.title,
            start: new Date(event.start_time),
            end: new Date(event.end_time),
            type: event.event_type as any,
            patientName: event.patient_name || '',
            notes: event.notes,
            status: event.status as any,
            doctorId: event.doctor_id,
            patientId: event.patient_id
          }));
        }
      } catch (error) {
        console.log('Events table not available, using only consultations');
      }
      
      // Combine both sources
      const allEvents = [...consultationEvents, ...additionalEvents];
      console.log('Combined events:', allEvents);
      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, [doctorProfileId]);


  // Load patients for dropdown with memoization - DISABLED (Supabase removed)
  const loadPatients = useCallback(async () => {
    if (!doctorProfileId) return;
    
    try {
      // TODO: Implement Django API call to fetch patients
      console.warn('⚠️ loadPatients disabled - Supabase removed, need Django API');
      setPatients([]);
    } catch (error) {
      console.error('Error loading patients:', error);
      // Fallback to empty array if there's an error
      setPatients([]);
    }
  }, [doctorProfileId]);

  // Calendar event handlers
  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date);
    setSelectedDate(date);
    setIsScheduleModalOpen(true);
  };

  const handleEventClick = (event: any) => {
    console.log('Event clicked:', event);
    // Convert to the expected format
    const calendarEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      type: event.event_type as any,
      patientName: event.patient_name,
      notes: event.notes,
      status: event.status as any,
      doctorId: event.doctor_id,
      patientId: event.patient_id
    };
    setSelectedEvent(calendarEvent);
    setIsMeetingDetailsOpen(true);
  };

  const handleAddEvent = (date: Date) => {
    console.log('Add event clicked for date:', date);
    setSelectedDate(date);
    setIsScheduleModalOpen(true);
  };

  const handleEditEvent = (calendarEvent: any) => {
    console.log('🔍 Edit event called with:', calendarEvent);
    console.log('🔍 Available patients:', patients);
    console.log('🔍 Event patient ID:', calendarEvent.patient_id);
    
    // Convert EnhancedCalendarComponent.CalendarEvent to scheduleService.CalendarEvent
    const event: CalendarEvent = {
      id: calendarEvent.id,
      title: calendarEvent.title,
      start: calendarEvent.start,
      end: calendarEvent.end,
      type: calendarEvent.event_type as 'consultation' | 'operation' | 'meeting' | 'available',
      patientName: calendarEvent.patient_name,
      notes: calendarEvent.notes,
      status: calendarEvent.status as 'pending' | 'confirmed' | 'cancelled',
      doctorId: calendarEvent.doctor_id,
      patientId: calendarEvent.patient_id
    };
    
    console.log('🔍 Converted event:', event);
    console.log('🔍 Setting editingEvent to:', event);
    
    // Close the details modal and open the schedule modal for editing
    setIsMeetingDetailsOpen(false);
    setSelectedEvent(null);
    setEditingEvent(event);
    setIsScheduleModalOpen(true);
    
    console.log('🔍 Modal should be open now, editingEvent set to:', event);
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    try {
      if (event.type === 'consultation' && event.doctorId) {
        // Delete from database
        const success = await ScheduleService.deleteConsultation(event.id);
        
        if (success) {
          // Remove from local state
          setEvents(prev => prev.filter(e => e.id !== event.id));
          setCalendarKey(prev => prev + 1); // Force calendar re-render
        }
      } else {
        // Remove from local state for non-consultation events
        setEvents(prev => prev.filter(e => e.id !== event.id));
        setCalendarKey(prev => prev + 1); // Force calendar re-render
      }
      setIsMeetingDetailsOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Day view handlers
  const handleDayViewClick = (date: Date) => {
    // Ensure we're working with the correct date
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    setDayViewDate(normalizedDate);
    setIsDayViewOpen(true);
  };

  const handleScheduleEvent = (timeSlot: Date, duration: number, eventData?: {
    title: string;
    type: 'consultation' | 'meeting';
    notes?: string;
  }) => {
    if (eventData) {
      // Create event directly from the day view form
      const newEvent: CalendarEvent = {
        id: `temp-${Date.now()}`,
        title: eventData.title,
        start: timeSlot,
        end: addMinutes(timeSlot, duration),
        type: eventData.type === 'consultation' ? 'consultation' : 'meeting',
        patientName: eventData.type === 'consultation' ? 'New Patient' : undefined,
        notes: eventData.notes || '',
        status: 'confirmed',
        doctorId: user?.id || '',
        patientId: eventData.type === 'consultation' ? undefined : undefined
      };
      
      // Add to local state immediately
      setEvents(prev => [...prev, newEvent]);
      setCalendarKey(prev => prev + 1);
    } else {
      // Fallback to opening the full scheduling modal
      setSelectedDate(timeSlot);
      setIsDayViewOpen(false);
      setIsScheduleModalOpen(true);
    }
  };

  const handleMoveEvent = async (eventId: string, newStart: Date, newEnd: Date) => {
    console.log('Move event:', eventId, 'to:', newStart, '-', newEnd);
    try {
      // Update in database
      if (events.find(e => e.id === eventId)?.type === 'consultation') {
        // Use ScheduleService for type safety
        await ScheduleService.updateConsultation(eventId, {
          consultationDate: newStart.toISOString().split('T')[0],
          consultationTime: newStart.toTimeString().split(' ')[0],
          reason: events.find(e => e.id === eventId)?.title || '',
          notes: events.find(e => e.id === eventId)?.notes || '',
          status: events.find(e => e.id === eventId)?.status === 'confirmed' ? 'confirmed' : 'scheduled'
        });
      }
      
      // Update local state
      setEvents(prev => prev.map(e => 
        e.id === eventId 
          ? { ...e, start: newStart, end: newEnd }
          : e
      ));
      setCalendarKey(prev => prev + 1);
    } catch (error) {
      console.error('Error moving event:', error);
      alert('Error moving event. Please try again.');
    }
  };

  const handleResizeEvent = async (eventId: string, newEnd: Date) => {
    console.log('Resize event:', eventId, 'to end:', newEnd);
    try {
      // Update local state
      setEvents(prev => prev.map(e => 
        e.id === eventId 
          ? { ...e, end: newEnd }
          : e
      ));
      setCalendarKey(prev => prev + 1);
    } catch (error) {
      console.error('Error resizing event:', error);
      alert('Error resizing event. Please try again.');
    }
  };

  const handleApproveEvent = async (eventId: string) => {
    try {
      // Find the event to check if it's a consultation
      const event = events.find(e => e.id === eventId);
      
      if (event?.type === 'consultation') {
        // For consultations, update status to 'confirmed' in the database
        const updatedEvent = await ScheduleService.updateConsultation(eventId, {
          status: 'confirmed'
        });
        
        if (updatedEvent) {
          // Update local state
          setEvents(prev => prev.map(e => 
            e.id === eventId 
              ? { ...e, status: 'confirmed' as any }
              : e
          ));
          setCalendarKey(prev => prev + 1);
          alert('Consultation approved successfully!');
        }
      } else {
        // For non-consultation events, try to update in events table
        try {
          const updatedEvent = await EventService.approveConsultation(eventId);
          if (updatedEvent) {
            // Update local state
            setEvents(prev => prev.map(e => 
              e.id === eventId 
                ? { ...e, status: 'confirmed' as any }
                : e
            ));
            setCalendarKey(prev => prev + 1);
            alert('Event approved successfully!');
          }
        } catch (error) {
          // If events table doesn't exist, just update local state
          setEvents(prev => prev.map(e => 
            e.id === eventId 
              ? { ...e, status: 'confirmed' as any }
              : e
          ));
          setCalendarKey(prev => prev + 1);
          alert('Event approved successfully!');
        }
      }
    } catch (error) {
      console.error('Error approving event:', error);
      alert('Error approving event. Please try again.');
    }
  };

  const handleRejectEvent = async (eventId: string) => {
    try {
      // Find the event to check if it's a consultation
      const event = events.find(e => e.id === eventId);
      
      if (event?.type === 'consultation') {
        // For consultations, update status to 'rejected' in the database
        const updatedEvent = await ScheduleService.updateConsultation(eventId, {
          status: 'cancelled' // Use 'cancelled' instead of 'rejected' for consultations
        });
        
        if (updatedEvent) {
          // Update local state
          setEvents(prev => prev.map(e => 
            e.id === eventId 
              ? { ...e, status: 'cancelled' as any }
              : e
          ));
          setCalendarKey(prev => prev + 1);
          alert('Consultation rejected successfully!');
        }
      } else {
        // For non-consultation events, try to update in events table
        try {
          const updatedEvent = await EventService.rejectConsultation(eventId);
          if (updatedEvent) {
            // Remove from local state
            setEvents(prev => prev.filter(e => e.id !== eventId));
            setCalendarKey(prev => prev + 1);
            alert('Event rejected successfully!');
          }
        } catch (error) {
          // If events table doesn't exist, just remove from local state
          setEvents(prev => prev.filter(e => e.id !== eventId));
          setCalendarKey(prev => prev + 1);
          alert('Event rejected successfully!');
        }
      }
    } catch (error) {
      console.error('Error rejecting event:', error);
      alert('Error rejecting event. Please try again.');
    }
  };

  const handleUpdateEvent = async (eventId: string, scheduleData: DoctorScheduleData) => {
    console.log('=== UPDATE FUNCTION CALLED ===');
    console.log('Event ID:', eventId);
    console.log('Schedule Data:', scheduleData);
    console.log('Editing Event:', editingEvent);
    console.log('Doctor Profile ID:', doctorProfileId);
    console.log('Current events count:', events.length);
    console.log('Event exists in array:', events.find(e => e.id === eventId));
    
    if (!doctorProfileId) {
      console.error('No doctor profile ID available');
      return;
    }
    
    try {
      // Map UI status to DB status accurately
      const toDbStatus = (uiStatus: DoctorScheduleData['status']): 'scheduled' | 'confirmed' | 'cancelled' => {
        if (uiStatus === 'confirmed') return 'confirmed';
        if (uiStatus === 'cancelled') return 'cancelled';
        return 'scheduled'; // pending -> scheduled in DB
      };

      if (editingEvent?.type === 'consultation') {
        console.log('Updating consultation in database...');
        console.log('Update parameters:', {
          eventId,
          consultationDate: scheduleData.date,
          consultationTime: scheduleData.time,
          reason: scheduleData.title,
          notes: scheduleData.notes,
          status: toDbStatus(scheduleData.status)
        });
        
        try {
          // Update consultation in database
          const updatedEvent = await ScheduleService.updateConsultation(eventId, {
            consultationDate: scheduleData.date,
            consultationTime: scheduleData.time,
            reason: scheduleData.title,
            notes: scheduleData.notes,
            status: toDbStatus(scheduleData.status)
          });
          
          console.log('Database update result:', updatedEvent);
          
          if (updatedEvent) {
            console.log('Updating local state with:', updatedEvent);
            // Update local state
            setEvents(prev => {
              const newEvents = prev.map(e => e.id === eventId ? updatedEvent : e);
              console.log('New events array:', newEvents);
              return newEvents;
            });
            setCalendarKey(prev => prev + 1); // Force calendar re-render
            console.log('Event updated successfully in database and local state');
          } else {
            console.error('Failed to update event in database - no result returned');
          }
        } catch (error) {
          console.error('Failed to update consultation in database, updating local state:', error);
          
          // Update local state as fallback
          const startDateTime = new Date(`${scheduleData.date}T${scheduleData.time}`);
          const endDateTime = new Date(startDateTime.getTime() + scheduleData.duration * 60 * 1000);
          
          const selectedPatient = patients.find(p => p.id === scheduleData.patientId);
          
          const updatedEvent: CalendarEvent = {
            id: eventId,
            title: scheduleData.title,
            start: startDateTime,
            end: endDateTime,
            type: scheduleData.event_type as 'consultation' | 'operation' | 'meeting' | 'available',
            patientName: selectedPatient?.name || editingEvent?.patientName || '',
            notes: scheduleData.notes,
            status: scheduleData.status as 'pending' | 'confirmed' | 'cancelled',
            doctorId: editingEvent?.doctorId,
            patientId: scheduleData.patientId
          };
          
          setEvents(prev => {
            const newEvents = prev.map(e => e.id === eventId ? updatedEvent : e);
            console.log('Updated events array (local fallback):', newEvents);
            return newEvents;
          });
          setCalendarKey(prev => prev + 1); // Force calendar re-render
          console.log('Event updated in local state (fallback)');
        }
      } else {
        console.log('Updating non-consultation event in local state...');
        // Update local state for non-consultation events
        const startDateTime = new Date(`${scheduleData.date}T${scheduleData.time}`);
        const endDateTime = new Date(startDateTime.getTime() + scheduleData.duration * 60 * 1000);
        
        const selectedPatient = patients.find(p => p.id === scheduleData.patientId);
        
        const updatedEvent: CalendarEvent = {
          id: eventId,
          title: scheduleData.title,
          start: startDateTime,
          end: endDateTime,
          type: scheduleData.event_type as 'consultation' | 'operation' | 'meeting' | 'available',
          patientName: selectedPatient?.name || editingEvent?.patientName || '',
          notes: scheduleData.notes,
          status: scheduleData.status as 'pending' | 'confirmed' | 'cancelled',
          doctorId: editingEvent?.doctorId,
          patientId: scheduleData.patientId
        };
        
        console.log('Updated event for local state:', updatedEvent);
        
        setEvents(prev => {
          const newEvents = prev.map(e => e.id === eventId ? updatedEvent : e);
          console.log('Updated events array:', newEvents);
          return newEvents;
        });
        setCalendarKey(prev => prev + 1); // Force calendar re-render
        console.log('Event updated in local state');
      }
      
      setEditingEvent(null);
      setIsScheduleModalOpen(false);
      
      console.log('Update completed successfully');
      
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  // Create new schedule
  const handleCreateSchedule = async (scheduleData: DoctorScheduleData) => {
    if (!doctorProfileId) {
      alert('No doctor profile ID available!');
      return;
    }
    
    try {
      const startDateTime = new Date(`${scheduleData.date}T${scheduleData.time}`);
      const endDateTime = new Date(startDateTime.getTime() + scheduleData.duration * 60 * 1000);
      const selectedPatient = patients.find(p => p.id === scheduleData.patientId);
      
      // Validate patient requirement for consultation and follow-up events
      if ((scheduleData.event_type === 'consultation' || scheduleData.event_type === 'followup') && !scheduleData.patientId) {
        alert('Please select a patient for consultation or follow-up events.');
        return;
      }
      
      // Save all event types to Supabase consultations table
      // patient_id can now be null for non-consultation events
      const consultationData = {
        patientId: scheduleData.patientId || null, // Can be null for blocked time, meetings, etc.
        doctorId: doctorProfileId,
        consultationDate: scheduleData.date,
        consultationTime: scheduleData.time,
        reason: scheduleData.title,
        notes: scheduleData.notes,
        status: scheduleData.event_type === 'blocked' ? 'cancelled' : 'scheduled',
        durationMinutes: scheduleData.duration
      };
      
      const newEvent = await ScheduleService.createConsultation(consultationData);
      if (newEvent) {
        // Reload events to ensure the calendar shows the new appointment immediately
        await loadEvents();
        setCalendarKey(prev => prev + 1);
        setIsScheduleModalOpen(false);
        alert(`${scheduleData.event_type === 'consultation' ? 'Consultation' : 'Event'} "${newEvent.title}" created successfully!`);
        return;
      }
      
      // If we reach here, something went wrong
      console.error('Failed to create event');
      alert('Failed to create event. Please try again.');
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Error creating event. Please try again.');
    }
  };

  // Load all dashboard data when profile ID is available
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const loadAllData = async () => {
      console.log('🔄 Loading dashboard data, doctorProfileId:', doctorProfileId);
      
      // If no doctorProfileId, wait for it to be loaded
      if (!doctorProfileId) {
        console.log('⚠️ No doctorProfileId yet, waiting...');
        return;
      }

      try {
        setLoading(true);
        console.log('⏳ Starting data loading...');
        
        // Set a timeout to show welcome dashboard after 5 seconds even if queries are slow
        timeoutId = setTimeout(() => {
          console.log('⏰ Data loading timeout, showing welcome dashboard');
          setStats({ totalPatients: 0, pendingConsents: 0, activeConsents: 0, totalRecords: 0 });
          setRecentActivity([]);
          setUpcomingTasks([]);
          setEvents([]);
          setPatients([]);
          setLoading(false);
        }, 5000);
        
        // Load all data in parallel using simple service
        console.log('📊 Starting to load data with simple service...');
        const [statsData, activityData, tasksData] = await Promise.allSettled([
          getSimpleDashboardStats(doctorProfileId),
          getSimpleRecentActivity(doctorProfileId),
          getSimpleUpcomingTasks(doctorProfileId)
        ]);

        console.log('📊 Data loading completed');
        console.log('📊 Stats data:', statsData);
        console.log('📊 Activity data:', activityData);
        console.log('📊 Tasks data:', tasksData);

        // Clear timeout since we got data
        clearTimeout(timeoutId);

        // Update state with results
        console.log('✅ Updating state with loaded data');
        setStats(statsData.status === 'fulfilled' ? statsData.value : { totalPatients: 0, pendingConsents: 0, activeConsents: 0, totalRecords: 0 });
        setRecentActivity(activityData.status === 'fulfilled' ? activityData.value : []);
        setUpcomingTasks(tasksData.status === 'fulfilled' ? tasksData.value : []);
        
        // Load events and patients with error handling
        try {
          await Promise.allSettled([
            loadEvents().catch(err => console.warn('Events loading failed:', err)),
            loadPatients().catch(err => console.warn('Patients loading failed:', err))
          ]);
        } catch (err) {
          console.warn('Some data loading failed:', err);
        }
        
        // Prefetch data for other pages in the background (don't block on this)
        try {
          dataPrefetchService.prefetchDoctorDashboardData(doctorProfileId);
        } catch (err) {
          console.warn('Prefetch failed:', err);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        clearTimeout(timeoutId);
        setError('Failed to load dashboard data. Please check your connection and try again.');
        // Set empty data on error
        setStats({ totalPatients: 0, pendingConsents: 0, activeConsents: 0, totalRecords: 0 });
        setRecentActivity([]);
        setUpcomingTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [doctorProfileId]);

  // Real-time subscription for consultations
  useEffect(() => {
    if (!doctorProfileId) return;

    let subscription: any;

    const setupRealtimeSubscription = () => {
      // Subscribe to consultations changes for this doctor
      subscription = supabase
        .channel('doctor-consultations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'consultations',
            filter: `doctor_id=eq.${doctorProfileId}`
          },
          (payload) => {
            console.log('🔄 Real-time consultation update for doctor:', payload);
            
            // Refresh events when consultations change
            loadEvents();
          }
        )
        .subscribe((status) => {
          console.log('📡 Doctor consultation subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to doctor consultations');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to doctor consultations');
          }
        });
    };

    setupRealtimeSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [doctorProfileId]);

  // Memoize quick stats to prevent unnecessary re-renders
  const quickStats = useMemo(() => [
    { label: t('dashboard.totalPatients'), value: stats.totalPatients.toString(), icon: Users, href: '/doctor/patients' },
    { label: t('dashboard.pendingConsents'), value: stats.pendingConsents.toString(), icon: Clock, href: '/doctor/consents' },
    { label: t('dashboard.activeConsents'), value: stats.activeConsents.toString(), icon: CheckCircle, href: '/doctor/consents' },
    { label: t('dashboard.schedule'), value: events.length.toString(), icon: Calendar, href: '#' },
  ], [stats, events, t]);

  // Memoize calendar handlers to prevent unnecessary re-renders
  const calendarHandlers = useMemo(() => ({
    onDateClick: handleDateClick,
    onEventClick: handleEventClick,
    onAddEvent: handleAddEvent,
    onViewChange: setCalendarView
  }), []);

  // Provide a global function for QuickActions to open the schedule modal
  useEffect(() => {
    (window as any).openDoctorScheduleModal = () => {
      const now = new Date();
      setSelectedDate(now);
      setEditingEvent(null);
      setIsScheduleModalOpen(true);
    };
    return () => {
      delete (window as any).openDoctorScheduleModal;
    };
  }, []);

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'bg-destructive',
      medium: 'bg-warning',
      low: 'bg-accent'
    };
    return colors[priority] || colors.low;
  };

  // Event styling for calendar
  const eventStyleGetter = (event: any) => {
    const colors = {
      consultation: { backgroundColor: '#3b82f6', color: 'white' },
      operation: { backgroundColor: '#ef4444', color: 'white' },
      meeting: { backgroundColor: '#10b981', color: 'white' }
    };
    return {
      style: {
        backgroundColor: colors[event.type as keyof typeof colors]?.backgroundColor || '#6b7280',
        color: colors[event.type as keyof typeof colors]?.color || 'white',
        borderRadius: '4px',
        border: 'none',
        opacity: 0.8
      }
    };
  };

  // Get event icon based on type
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return <Stethoscope className="h-4 w-4" />;
      case 'operation':
        return <Activity className="h-4 w-4" />;
      case 'meeting':
        return <Briefcase className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  // Debug functions
  React.useEffect(() => {
    (window as any).debugDoctorDashboard = {
      events,
      editingEvent,
      isScheduleModalOpen,
      selectedDate,
      patients,
      testEditEvent: () => {
        console.log('🧪 Testing edit event functionality...');
        console.log('Current events:', events);
        console.log('Current editingEvent:', editingEvent);
        console.log('Is modal open:', isScheduleModalOpen);
        console.log('Selected date:', selectedDate);
        console.log('Available patients:', patients);
        return { events, editingEvent, isScheduleModalOpen, selectedDate, patients };
      },
      simulateEditEvent: () => {
        console.log('🧪 Simulating edit event...');
        if (events.length > 0) {
          const firstEvent = events[0];
          console.log('🧪 Using first event for simulation:', firstEvent);
          handleEditEvent(firstEvent);
        } else {
          console.log('❌ No events available for simulation');
        }
      }
    };
    console.log('🔧 Debug functions available: window.debugDoctorDashboard');
  }, [events, editingEvent, isScheduleModalOpen, selectedDate, patients]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">{t('errors.unableToLoadDashboard')}</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-500">
              <p>This might be due to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{t('errors.networkConnectionIssues')}</li>
                <li>{t('errors.backendServiceUnavailable')}</li>
                <li>{t('errors.databaseConnectionProblems')}</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {t('errors.retry')}
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                {t('errors.goHome')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Always show the actual dashboard, even with empty data
  // The welcome dashboard is too basic - show the full dashboard with empty states
  // if (!hasData && !loading) {
  //   return <WelcomeDashboard userType="doctor" userName={user?.name} />;
  // }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <QuickActions />


      <div>
        <h1 className="text-3xl font-bold">{t('dashboard.doctorWelcomeBack', { name: user?.name || '' })}</h1>
        <p className="text-muted-foreground">{t('dashboard.practiceOverview')}</p>
      </div>

      {/* Doctor Profile (inline quick editor) - temporarily hidden per request */}
      {false && user?.role === 'doctor' && (
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Update your professional details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Specialization</label>
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                  defaultValue={(user as any).specialization || ''}
                  onBlur={async (e) => {
                    const value = e.currentTarget.value.trim();
                    if (value && value !== (user as any).specialization) {
                      await updateProfile({ specialization: value } as any);
                    }
                  }}
                  placeholder="e.g., Cardiology"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Qualifications</label>
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                  defaultValue={(user as any).qualifications || ''}
                  onBlur={async (e) => {
                    const value = e.currentTarget.value.trim();
                    if (value !== (user as any).qualifications) {
                      await updateProfile({ qualifications: value } as any);
                    }
                  }}
                  placeholder="e.g., MBBS, MD"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Years of Experience</label>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                  defaultValue={(user as any).yearsOfExperience || ''}
                  onBlur={async (e) => {
                    const value = e.currentTarget.value;
                    const n = value === '' ? undefined : Number(value);
                    if (n !== (user as any).yearsOfExperience) {
                      await updateProfile({ yearsOfExperience: n } as any);
                    }
                  }}
                  placeholder="e.g., 8"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Hospital Affiliation</label>
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                  defaultValue={(user as any).hospitalAffiliation || ''}
                  onBlur={async (e) => {
                    const value = e.currentTarget.value.trim();
                    if (value !== (user as any).hospitalAffiliation) {
                      await updateProfile({ hospitalAffiliation: value } as any);
                    }
                  }}
                  placeholder="e.g., City General Hospital"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => stat.href !== '#' && navigate(stat.href)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>



      {/* Enhanced Calendar Section */}
      <div data-calendar-section className="overflow-x-auto">
        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>}>
          {loading || isDataLoading ? (
            <CalendarSkeleton />
          ) : (
            <EnhancedCalendarComponent
            key={calendarKey}
            events={events.map(event => {
              console.log('Mapping event for calendar:', event);
              return {
                id: event.id,
                title: event.title,
                start: event.start,
                end: event.end,
                event_type: (event.type || 'consultation') as 'consultation' | 'blocked' | 'followup' | 'meeting' | 'reminder',
                status: (event.status || 'confirmed') as 'pending' | 'confirmed' | 'cancelled' | 'rejected',
                patient_name: event.patientName,
                notes: event.notes,
                doctor_id: event.doctorId || '',
                patient_id: event.patientId,
                is_available: true
              };
            })}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            onEditEvent={handleEditEvent}
            onDayViewClick={handleDayViewClick}
            onAddEvent={handleAddEvent}
            onApproveEvent={handleApproveEvent}
            onRejectEvent={handleRejectEvent}
            view={calendarView}
            showNavigation={true}
            showAddButton={true}
          />
        )}
        </Suspense>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
          <CardDescription>{t('dashboard.latestUpdates')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressiveList
            items={recentActivity}
            loading={loading}
            renderItem={(activity) => (
              <div className="flex items-center gap-3 pb-3 border-b border-border last:border-0">
                <div className="p-2 bg-accent-light rounded-lg">
                  <Activity className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            )}
            fallbackCount={3}
          />
          {!loading && recentActivity.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('dashboard.noRecentActivity')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctor Scheduling Modal */}
      <DoctorSchedulingModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          console.log('🔍 Modal closing, clearing editingEvent');
          setIsScheduleModalOpen(false);
          setEditingEvent(null);
        }}
        selectedDate={selectedDate}
        patients={patients}
        onSchedule={handleCreateSchedule}
        onUpdate={handleUpdateEvent}
        editingEvent={editingEvent}
        asDialog={true}
        existingAppointments={events.map(event => {
          const mappedEvent = {
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            event_type: event.type,
            status: event.status,
            patient_name: event.patientName,
            notes: event.notes,
            patient_id: event.patientId,
            doctor_id: event.doctorId
          };
          
          // Debug logging for first few events
          if (events.indexOf(event) < 3) {
            console.log('📅 Mapping event for availability check:', mappedEvent);
          }
          
          return mappedEvent;
        })}
      />
      

      {/* Meeting Details Modal */}
      <MeetingDetailsModal
        event={selectedEvent}
        isOpen={isMeetingDetailsOpen}
        onClose={() => {
          setIsMeetingDetailsOpen(false);
          setSelectedEvent(null);
        }}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Day View Modal */}
      {dayViewDate && (
        <DayViewModal
          isOpen={isDayViewOpen}
          onClose={() => {
            setIsDayViewOpen(false);
            setDayViewDate(null);
          }}
          selectedDate={dayViewDate}
          events={events
            .filter(event => 
              event.start.getDate() === dayViewDate.getDate() &&
              event.start.getMonth() === dayViewDate.getMonth() &&
              event.start.getFullYear() === dayViewDate.getFullYear()
            )
            .map(event => ({
              id: event.id,
              title: event.title,
              start: event.start,
              end: event.end,
              event_type: event.type as 'consultation' | 'blocked' | 'followup' | 'meeting' | 'reminder',
              status: event.status as 'pending' | 'confirmed' | 'cancelled' | 'rejected',
              patient_name: event.patientName,
              notes: event.notes,
              doctor_id: event.doctorId || '',
              patient_id: event.patientId,
              is_available: true
            }))}
          onScheduleEvent={handleScheduleEvent}
          onEditEvent={(dayEvent) => {
            // Convert day event back to calendar event
            const calendarEvent: CalendarEvent = {
              id: dayEvent.id,
              title: dayEvent.title,
              start: dayEvent.start,
              end: dayEvent.end,
              type: dayEvent.event_type as 'consultation' | 'operation' | 'meeting' | 'available',
              patientName: dayEvent.patient_name,
              notes: dayEvent.notes,
              status: dayEvent.status as 'pending' | 'confirmed' | 'cancelled',
              doctorId: dayEvent.doctor_id,
              patientId: dayEvent.patient_id
            };
            handleEditEvent(calendarEvent);
          }}
          onDeleteEvent={async (eventId) => {
            const event = events.find(e => e.id === eventId);
            if (event) {
              await handleDeleteEvent(event);
            }
          }}
          onMoveEvent={handleMoveEvent}
          onResizeEvent={handleResizeEvent}
          patients={patients}
          onSchedule={handleCreateSchedule}
          onUpdate={handleUpdateEvent}
          isPatientView={false}
          doctorName={user?.name}
          onSlotClick={(slotTime) => {
            console.log('🕐 Doctor time slot clicked:', slotTime);
            console.log('🕐 Doctor time slot toString:', slotTime.toString());
            console.log('🕐 Doctor time slot toTimeString:', slotTime.toTimeString());
            
            // Extract time in HH:MM format
            const hours = slotTime.getHours().toString().padStart(2, '0');
            const minutes = slotTime.getMinutes().toString().padStart(2, '0');
            const timeString = `${hours}:${minutes}`;
            
            console.log('🕐 Doctor extracted time:', timeString);
            console.log('🕐 Doctor setting selectedDate to:', slotTime);
            
            // Close day view modal first
            setIsDayViewOpen(false);
            setDayViewDate(null);
            
            // Set the date and create editing event with the correct time
            setSelectedDate(slotTime);
            setEditingEvent({
              id: 'temp-slot',
              title: '',
              start: slotTime,
              end: new Date(slotTime.getTime() + 30 * 60000),
              type: 'consultation',
              status: 'pending',
              notes: '',
              doctorId: user?.id || '',
              patientId: ''
            });
            
            // Use setTimeout to ensure state updates are processed before opening modal
            setTimeout(() => {
              console.log('🕐 Opening doctor scheduling modal with time:', timeString);
              setIsScheduleModalOpen(true);
            }, 100);
          }}
        />
      )}
    </div>
  );
};

export default DoctorDashboard;