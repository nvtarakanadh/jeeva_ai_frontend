import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Shield, Activity, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InlineLoadingSpinner } from '@/components/ui/loading-spinner';
import { PageSkeleton } from '@/components/ui/skeleton-loading';
import QuickActions from '@/components/layout/QuickActions';
import PatientCalendarComponent, { PatientAppointment } from '@/components/calendar/PatientCalendarComponent';
import PatientSchedulingModal, { PatientScheduleData } from '@/components/calendar/PatientSchedulingModal';
import DayViewModal, { DayViewEvent } from '@/components/calendar/DayViewModal';
import { getRecentActivity, formatTimeAgo } from '@/services/activityService';
import { toast } from '@/hooks/use-toast';

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthRecords, setHealthRecords] = useState({ totalRecords: 0, recentRecords: [] });
  const [activeConsents, setActiveConsents] = useState(0);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<PatientAppointment[]>([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [editingAppointment, setEditingAppointment] = useState<PatientAppointment | null>(null);
  const [isDayViewOpen, setIsDayViewOpen] = useState(false);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; specialization?: string }>>([]);
  const [testCenters, setTestCenters] = useState<Array<{ id: string; name: string; address?: string }>>([]);

  // Function to reload ALL appointments (for blocking logic) - DISABLED (Supabase removed)
  const reloadAllAppointments = async () => {
    if (!user?.id) return;
    
    console.log('⚠️ reloadAllAppointments disabled (Supabase removed)');
    return;
    
    /* OLD SUPABASE CODE - REMOVED
    try {
      // Load ALL appointments for blocking (not just patient's own)
      const { data: allConsultations, error: allConsultationError } = await supabase
        .from('consultations')
        .select(`
          id,
          consultation_date,
          consultation_time,
          end_time,
          duration_minutes,
          reason,
          notes,
          status,
          doctor_id,
          patient_id,
          profiles!consultations_doctor_id_fkey(full_name)
        `)
        .order('consultation_date', { ascending: true });

      if (allConsultationError) {
        console.error('❌ Error loading all appointments:', allConsultationError);
        return;
      }

      // Format ALL appointments for blocking (including other patients' appointments)
      const allFormattedAppointments: PatientAppointment[] = allConsultations?.map((consultation: any) => {
        const consultationDate = new Date(consultation.consultation_date);
        const [hours, minutes] = consultation.consultation_time.split(':').map(Number);
        const startTime = new Date(consultationDate);
        startTime.setHours(hours, minutes, 0, 0);
        
        let endTime: Date;
        if (consultation.end_time) {
          const [endHours, endMinutes] = consultation.end_time.split(':').map(Number);
          endTime = new Date(consultationDate);
          endTime.setHours(endHours, endMinutes, 0, 0);
        } else {
          const duration = consultation.duration_minutes || 30;
          endTime = new Date(startTime.getTime() + duration * 60000);
        }
        
        return {
          id: consultation.id,
          title: consultation.reason || 'Consultation',
          start: startTime,
          end: endTime,
          appointment_type: 'consultation' as const,
          status: consultation.status as 'pending' | 'confirmed' | 'cancelled' | 'scheduled',
          doctor_name: consultation.profiles?.full_name || 'Dr. Unknown',
          notes: consultation.notes || '',
          patient_id: consultation.patient_id,
          doctor_id: consultation.doctor_id
        };
      }) || [];

      setAllAppointments(allFormattedAppointments);
      console.log('✅ All appointments reloaded for blocking:', allFormattedAppointments.length);
      console.log('✅ All appointments by doctor:', allFormattedAppointments.reduce((acc, apt) => {
        acc[apt.doctor_id] = (acc[apt.doctor_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      
      // Debug: Show first few appointments with details
      console.log('🔍 First 3 appointments details:', allFormattedAppointments.slice(0, 3).map(apt => ({
        id: apt.id,
        title: apt.title,
        doctor_id: apt.doctor_id,
        patient_id: apt.patient_id,
        start: apt.start,
        end: apt.end
      })));
    } catch (error) {
      console.error('❌ Error reloading all appointments:', error);
    }
  };

  // Function to reload appointments (including all appointments for blocking) - DISABLED (Supabase removed)
  const reloadAppointments = async () => {
    if (!user?.id) return;
    
    console.log('⚠️ reloadAppointments disabled (Supabase removed)');
    return;
    
    /* OLD SUPABASE CODE - REMOVED
    try {
      // Get patient profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'patient')
        .single() as { data: { id: string } | null; error: any };

      if (profileError || !profileData) {
        console.error('❌ Profile error:', profileError);
        return;
      }

      // Load patient's own appointments
      const { data: consultations, error: consultationError } = await supabase
        .from('consultations')
        .select(`
          id,
          consultation_date,
          consultation_time,
          end_time,
          duration_minutes,
          reason,
          notes,
          status,
          doctor_id,
          patient_id,
          profiles!consultations_doctor_id_fkey(full_name)
        `)
        .eq('patient_id', profileData.id)
        .order('consultation_date', { ascending: true });

      if (consultationError) {
        console.error('❌ Error loading appointments:', consultationError);
        return;
      }

      // Load ALL appointments for blocking (not just patient's own)
      const { data: allConsultations, error: allConsultationError } = await supabase
        .from('consultations')
        .select(`
          id,
          consultation_date,
          consultation_time,
          end_time,
          duration_minutes,
          reason,
          notes,
          status,
          doctor_id,
          patient_id,
          profiles!consultations_doctor_id_fkey(full_name)
        `)
        .order('consultation_date', { ascending: true });

      if (allConsultationError) {
        console.error('❌ Error loading all appointments:', allConsultationError);
        return;
      }

      // Format patient's own appointments
      const formattedAppointments: PatientAppointment[] = consultations?.map((consultation: any) => {
        const consultationDate = new Date(consultation.consultation_date);
        const [hours, minutes] = consultation.consultation_time.split(':').map(Number);
        const startTime = new Date(consultationDate);
        startTime.setHours(hours, minutes, 0, 0);
        
        let endTime: Date;
        if (consultation.end_time) {
          const [endHours, endMinutes] = consultation.end_time.split(':').map(Number);
          endTime = new Date(consultationDate);
          endTime.setHours(endHours, endMinutes, 0, 0);
        } else {
          const duration = consultation.duration_minutes || 30;
          endTime = new Date(startTime.getTime() + duration * 60000);
        }
        
        return {
          id: consultation.id,
          title: consultation.reason || 'Consultation',
          start: startTime,
          end: endTime,
          appointment_type: 'consultation' as const,
          status: consultation.status as 'pending' | 'confirmed' | 'cancelled' | 'scheduled',
          doctor_name: consultation.profiles?.full_name || 'Dr. Unknown',
          notes: consultation.notes || '',
          patient_id: user.id,
          doctor_id: consultation.doctor_id
        };
      }) || [];

      // Format ALL appointments for blocking (including other patients' appointments)
      const allFormattedAppointments: PatientAppointment[] = allConsultations?.map((consultation: any) => {
        const consultationDate = new Date(consultation.consultation_date);
        const [hours, minutes] = consultation.consultation_time.split(':').map(Number);
        const startTime = new Date(consultationDate);
        startTime.setHours(hours, minutes, 0, 0);
        
        let endTime: Date;
        if (consultation.end_time) {
          const [endHours, endMinutes] = consultation.end_time.split(':').map(Number);
          endTime = new Date(consultationDate);
          endTime.setHours(endHours, endMinutes, 0, 0);
        } else {
          const duration = consultation.duration_minutes || 30;
          endTime = new Date(startTime.getTime() + duration * 60000);
        }
        
        return {
          id: consultation.id,
          title: consultation.reason || 'Consultation',
          start: startTime,
          end: endTime,
          appointment_type: 'consultation' as const,
          status: consultation.status as 'pending' | 'confirmed' | 'cancelled' | 'scheduled',
          doctor_name: consultation.profiles?.full_name || 'Dr. Unknown',
          notes: consultation.notes || '',
          patient_id: consultation.patient_id,
          doctor_id: consultation.doctor_id
        };
      }) || [];

      setAppointments(formattedAppointments);
      setAllAppointments(allFormattedAppointments);
      console.log('✅ Appointments reloaded:', formattedAppointments.length);
      console.log('✅ All appointments for blocking:', allFormattedAppointments.length);
    } catch (error) {
      console.error('❌ Error reloading appointments:', error);
    }
  };

  useEffect(() => {
    if (!user?.id) {
          setLoading(false);
        return;
      }

        console.log('🔄 Loading dashboard data for user:', user.id);
    
    const loadData = async () => {
      try {
        // TODO: Replace Supabase calls with Django API endpoints
        // For now, show empty dashboard until Django endpoints are created
        console.log('⚠️ Dashboard: Supabase removed, using empty data for now');
        
        // Set empty data - will be replaced with Django API calls
        setHealthRecords({
          totalRecords: 0,
          recentRecords: []
        });
        setAppointments([]);
        setAllAppointments([]);
        setActiveConsents(0);
        setRecentActivity([]);
        setDoctors([]);
        setTestCenters([]);
        setLoading(false);
        return;

        /* OLD SUPABASE CODE - REMOVED
        // Get patient profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .eq('role', 'patient')
          .single() as { data: { id: string } | null; error: any };

        if (profileError || !profileData) {
          console.error('❌ Profile error:', profileError);
          throw new Error('Patient profile not found');
        }

        // Load health records
        const { data: healthRecords, error: healthError } = await supabase
          .from('health_records')
          .select('*')
        .eq('user_id', user.id)
          .order('service_date', { ascending: false });

        // Load appointments
          const { data: consultations, error: consultationError } = await supabase
            .from('consultations')
            .select(`
              id,
              consultation_date,
              consultation_time,
              end_time,
              duration_minutes,
              reason,
              notes,
              status,
              doctor_id,
              profiles!consultations_doctor_id_fkey(full_name)
            `)
          .eq('patient_id', profileData!.id)
          .order('consultation_date', { ascending: true });

        // Load ALL appointments for blocking (not just patient's own)
        const { data: allConsultations, error: allConsultationError } = await supabase
          .from('consultations')
          .select(`
            id,
            consultation_date,
            consultation_time,
            end_time,
            duration_minutes,
            reason,
            notes,
            status,
            doctor_id,
            patient_id,
            profiles!consultations_doctor_id_fkey(full_name)
          `)
          .order('consultation_date', { ascending: true });

        // Load consent requests
        const { data: consentRequests, error: consentError } = await supabase
          .from('consent_requests')
          .select('*')
          .eq('patient_id', profileData!.id)
          .order('requested_at', { ascending: false });

        // Load recent activity
        const recentActivityData = await getRecentActivity(user.id);

        // Load doctors
        const { data: doctorsData, error: doctorsError } = await supabase
          .from('profiles')
          .select('id, full_name, specialization')
          .eq('role', 'doctor')
          .order('full_name', { ascending: true });

        // Load test centers
        const { data: testCentersData, error: testCentersError } = await supabase
          .from('test_centers')
          .select('id, name, address')
          .order('name', { ascending: true });

        // Format appointments
          const formattedAppointments: PatientAppointment[] = consultations?.map((consultation: any) => {
        const consultationDate = new Date(consultation.consultation_date);
        const [hours, minutes] = consultation.consultation_time.split(':').map(Number);
        const startTime = new Date(consultationDate);
        startTime.setHours(hours, minutes, 0, 0);
        
            let endTime: Date;
            if (consultation.end_time) {
              const [endHours, endMinutes] = consultation.end_time.split(':').map(Number);
              endTime = new Date(consultationDate);
              endTime.setHours(endHours, endMinutes, 0, 0);
            } else {
              const duration = consultation.duration_minutes || 30;
              endTime = new Date(startTime.getTime() + duration * 60000);
            }
        
        return {
          id: consultation.id,
          title: consultation.reason || 'Consultation',
          start: startTime,
          end: endTime,
          appointment_type: 'consultation' as const,
              status: consultation.status as 'pending' | 'confirmed' | 'cancelled' | 'scheduled',
              doctor_name: consultation.profiles?.full_name || 'Dr. Unknown',
          notes: consultation.notes || '',
            patient_id: user.id,
          doctor_id: consultation.doctor_id
        };
      }) || [];
      
      // Format ALL appointments for blocking (including other patients' appointments)
      const allFormattedAppointments: PatientAppointment[] = allConsultations?.map((consultation: any) => {
        const consultationDate = new Date(consultation.consultation_date);
        const [hours, minutes] = consultation.consultation_time.split(':').map(Number);
        const startTime = new Date(consultationDate);
        startTime.setHours(hours, minutes, 0, 0);
        
        let endTime: Date;
        if (consultation.end_time) {
          const [endHours, endMinutes] = consultation.end_time.split(':').map(Number);
          endTime = new Date(consultationDate);
          endTime.setHours(endHours, endMinutes, 0, 0);
        } else {
          const duration = consultation.duration_minutes || 30;
          endTime = new Date(startTime.getTime() + duration * 60000);
        }
        
        return {
          id: consultation.id,
          title: consultation.reason || 'Consultation',
          start: startTime,
          end: endTime,
          appointment_type: 'consultation' as const,
          status: consultation.status as 'pending' | 'confirmed' | 'cancelled' | 'scheduled',
          doctor_name: consultation.profiles?.full_name || 'Dr. Unknown',
          notes: consultation.notes || '',
          patient_id: consultation.patient_id,
          doctor_id: consultation.doctor_id
        };
      }) || [];
      
        // Set all data
        setHealthRecords({
          totalRecords: healthRecords?.length || 0,
          recentRecords: healthRecords?.slice(0, 5) || []
        });
        setAppointments(formattedAppointments);
        setAllAppointments(allFormattedAppointments);
        setActiveConsents((consentRequests || []).filter((consent: any) => consent.status === 'approved').length);
        setRecentActivity(recentActivityData);
        setDoctors((doctorsData || []).map((doctor: any) => ({
          id: doctor.id,
          name: doctor.full_name,
          specialization: doctor.specialization
        })));
        setTestCenters((testCentersData || []).map((center: any) => ({
          id: center.id,
          name: center.name,
          address: center.address
        })));
        setLoading(false);

        console.log('✅ Dashboard data loaded successfully:', {
          healthRecords: healthRecords?.length || 0,
          appointments: formattedAppointments.length,
          activeConsents: (consentRequests || []).filter((consent: any) => consent.status === 'approved').length
        });

    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        setError('Failed to load dashboard data. Please refresh the page.');
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Real-time subscription for appointments - DISABLED (Supabase removed)
  useEffect(() => {
    if (!user?.id) return;

    console.log('⚠️ Real-time subscriptions disabled (Supabase removed)');
    return;

    /* OLD SUPABASE CODE - REMOVED
    console.log('🔄 Setting up real-time subscription for appointments');

    const subscription = supabase
      .channel('patient-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
          filter: `patient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Real-time appointment update received:', payload);
          console.log('📡 Event type:', payload.eventType);
          console.log('📡 Table:', payload.table);
          console.log('📡 New record:', payload.new);
          console.log('📡 Old record:', payload.old);
          // Reload ALL appointments when any change occurs
          reloadAllAppointments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Real-time appointment update received (appointments table):', payload);
          console.log('📡 Event type:', payload.eventType);
          console.log('📡 Table:', payload.table);
          console.log('📡 New record:', payload.new);
          console.log('📡 Old record:', payload.old);
          // Reload ALL appointments when any change occurs
          reloadAllAppointments();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to patient appointments');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to patient appointments');
        }
      });

    return () => {
      console.log('🔄 Cleaning up real-time subscription');
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Real-time subscription for ALL appointments (to show blocked slots) - DISABLED (Supabase removed)
  useEffect(() => {
    if (!user?.id) return;

    console.log('⚠️ Real-time subscriptions for all appointments disabled (Supabase removed)');
    // OLD SUPABASE CODE REMOVED - Real-time subscriptions disabled
  }, [user?.id]);

  // Debug: Add test functions to window for manual testing
  React.useEffect(() => {
    (window as any).testAppointments = () => {
      console.log('🧪 Testing appointments data...');
      console.log('Patient appointments:', appointments.length);
      console.log('All appointments:', allAppointments.length);
      console.log('Appointments by doctor:', allAppointments.reduce((acc, apt) => {
        acc[apt.doctor_id] = (acc[apt.doctor_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      
      // Show first few appointments
      console.log('First 3 appointments:', allAppointments.slice(0, 3).map(apt => ({
        id: apt.id,
        title: apt.title,
        doctor_id: apt.doctor_id,
        patient_id: apt.patient_id,
        start: apt.start,
        end: apt.end
      })));
    };
    
    // Debug: Add function to manually reload all appointments
    (window as any).reloadAllAppointments = () => {
      console.log('🔄 Manually reloading all appointments...');
      reloadAllAppointments();
    };
    
    // Debug: Add function to test real-time subscription
    (window as any).testRealtimeSubscription = () => {
      console.log('🧪 Testing real-time subscription...');
      console.log('Current user ID:', user?.id);
      console.log('All appointments count:', allAppointments.length);
      console.log('Patient appointments count:', appointments.length);
      
      // Show subscription status
      console.log('🔄 Real-time subscriptions should be active for:');
      console.log('- Patient appointments (patient_id filter)');
      console.log('- All appointments (no filter)');
      
      // Show all appointments with details
      console.log('📋 All appointments details:');
      allAppointments.forEach((apt, index) => {
        console.log(`Appointment ${index + 1}:`, {
          id: apt.id,
          title: apt.title,
          doctor_id: apt.doctor_id,
          patient_id: apt.patient_id,
          start: apt.start.toLocaleString(),
          end: apt.end.toLocaleString()
        });
      });
    };
  }, [appointments, allAppointments, reloadAllAppointments]);

  // Calendar event handlers
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(''); // Clear time for date-only clicks
    setIsSchedulingModalOpen(true);
  };

  const handleAppointmentClick = (appointment: PatientAppointment) => {
    setEditingAppointment(appointment);
    setSelectedTime(''); // Clear time for appointment editing
    setIsSchedulingModalOpen(true);
  };

  const handleAddAppointment = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(''); // Clear time for add appointment
    setEditingAppointment(null);
    setIsSchedulingModalOpen(true);
  };

  const handleDayViewClick = (date: Date) => {
    setDayViewDate(date);
    setIsDayViewOpen(true);
  };

  const handleTimeSlotClick = (timeSlot: Date) => {
    console.log('🕐 Time slot clicked:', timeSlot);
    console.log('🕐 Time slot toString:', timeSlot.toString());
    console.log('🕐 Time slot toTimeString:', timeSlot.toTimeString());
    
    // Extract time in HH:MM format
    const hours = timeSlot.getHours().toString().padStart(2, '0');
    const minutes = timeSlot.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    console.log('🕐 Extracted time:', timeString);
    console.log('🕐 Setting selectedDate to:', timeSlot);
    console.log('🕐 Setting selectedTime to:', timeString);
    console.log('🕐 Current selectedTime state before update:', selectedTime);
    
    // Close day view modal first
    setIsDayViewOpen(false);
    setDayViewDate(null);
    
    // Set the time and date, then open the scheduling modal
    setSelectedDate(timeSlot);
    setSelectedTime(timeString);
    setEditingAppointment(null);
    
    // Use setTimeout to ensure state updates are processed before opening modal
    setTimeout(() => {
      console.log('🕐 Opening scheduling modal with selectedTime:', timeString);
      setIsSchedulingModalOpen(true);
    }, 100);
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    console.log('Cancel appointment:', appointmentId);
    // TODO: Implement appointment cancellation
  };

  // Convert PatientAppointment to DayViewEvent format
  const convertToDayViewEvents = (appointments: PatientAppointment[]): DayViewEvent[] => {
    return appointments.map(appointment => ({
      id: appointment.id,
      title: appointment.title,
      start: appointment.start,
      end: appointment.end,
      event_type: appointment.appointment_type === 'consultation' ? 'consultation' as const : 'meeting' as const,
      status: appointment.status === 'completed' ? 'confirmed' : appointment.status as 'pending' | 'confirmed' | 'cancelled' | 'rejected',
      patient_name: user?.name || 'Patient',
      notes: appointment.notes,
      doctor_id: appointment.doctor_id || '',
      patient_id: appointment.patient_id,
      is_available: true
    }));
  };

  const quickStats = [
    { 
      label: t('navigation.healthRecords'), 
      value: healthRecords.totalRecords.toString(), 
      icon: FileText, 
      href: '/records' 
    },
    { 
      label: t('dashboard.activeConsents'), 
      value: activeConsents.toString(), 
      icon: Shield, 
      href: '/consents' 
    },
  ];

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">{t('errors.unableToLoadDashboard')}</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <button
                onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {t('errors.retry')}
              </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare welcome text with user name
  const welcomeText = t('dashboard.patientWelcomeBack').replace('{{name}}', user?.name || 'User');
  const overviewText = t('dashboard.yourOverview');

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <QuickActions />
      
      <div>
        <h1 className="text-3xl font-bold">{welcomeText}</h1>
        <p className="text-muted-foreground">{overviewText}</p>
      </div>

      {/* Top Row: Health Records + Active Consents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.label} 
              className="hover:shadow-medium transition-all cursor-pointer"
              onClick={() => navigate(stat.href)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Calendar Section */}
      <PatientCalendarComponent
        appointments={appointments}
        onDateClick={handleDateClick}
        onAppointmentClick={handleAppointmentClick}
        onAddAppointment={handleAddAppointment}
        onEditAppointment={handleAppointmentClick}
        onCancelAppointment={handleCancelAppointment}
        onRescheduleAppointment={() => {}}
        onDayViewClick={handleDayViewClick}
        showNavigation={true}
        showAddButton={true}
      />

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
          <CardDescription>{t('dashboard.latestUpdatesPatient')}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity: any, index) => (
                <div
                  key={activity.id || index}
                  className="flex items-center gap-3 pb-3 border-b border-border last:border-0"
                >
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('dashboard.noRecentActivity')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduling Modal */}
      <PatientSchedulingModal
        key={`${selectedDate?.getTime()}-${selectedTime}-${editingAppointment?.id || 'new'}`}
        isOpen={isSchedulingModalOpen}
        onClose={() => {
          setIsSchedulingModalOpen(false);
          setSelectedDate(null);
          setSelectedTime('');
          setEditingAppointment(null);
        }}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        editingAppointment={editingAppointment}
        onSchedule={async (formData) => {
          try {
            console.log('📅 Scheduling appointment:', formData);
            
            // Reload appointments to show the new one immediately
            // TODO: Implement Django API call to reload appointments
            // await reloadAppointments(); // Disabled - Supabase removed
            
            // Show success message
            toast({
              title: "Appointment Scheduled",
              description: "Your appointment has been successfully scheduled.",
            });
          } catch (error) {
            console.error('Error scheduling appointment:', error);
            toast({
              title: "Error",
              description: "Failed to schedule appointment. Please try again.",
              variant: "destructive",
            });
          }
        }}
        doctors={doctors}
        testCenters={testCenters}
        existingAppointments={allAppointments}
      />

      {/* Day View Modal */}
      <DayViewModal
        isOpen={isDayViewOpen}
        onClose={() => {
          setIsDayViewOpen(false);
          setDayViewDate(null);
        }}
        selectedDate={dayViewDate || new Date()}
        events={convertToDayViewEvents(appointments)}
        onScheduleEvent={() => {}}
        onEditEvent={() => {}}
        onDeleteEvent={() => {}}
        onMoveEvent={() => {}}
        onResizeEvent={() => {}}
        isPatientView={true}
        onSlotClick={handleTimeSlotClick}
        doctors={doctors}
        testCenters={testCenters}
      />
    </div>
  );
};

export default PatientDashboard;
