import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Shield, Activity, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// Supabase removed - using Django API only
import { InlineLoadingSpinner } from '@/components/ui/loading-spinner';
import { PageSkeleton } from '@/components/ui/skeleton-loading';
import QuickActions from '@/components/layout/QuickActions';
import PatientCalendarComponent, { PatientAppointment } from '@/components/calendar/PatientCalendarComponent';

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthRecords, setHealthRecords] = useState({ totalRecords: 0, recentRecords: [] });
  const [activeConsents, setActiveConsents] = useState(0);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    console.log('🔄 Loading dashboard data for user:', user.id);
    
    const loadData = async () => {
      try {
        // Get patient profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role', 'patient')
          .single();

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
          .eq('patient_id', profileData.id)
          .order('consultation_date', { ascending: true });

        // Load consent requests
        const { data: consentRequests, error: consentError } = await supabase
          .from('consent_requests')
          .select('*')
          .eq('patient_id', profileData.id)
          .order('requested_at', { ascending: false });

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

        // Set all data
        setHealthRecords({
          totalRecords: healthRecords?.length || 0,
          recentRecords: healthRecords?.slice(0, 5) || []
        });
        setAppointments(formattedAppointments);
        setActiveConsents((consentRequests || []).filter((consent: any) => consent.status === 'approved').length);
        setRecentActivity([]);
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

  const quickStats = [
    { 
      label: 'Health Records', 
      value: healthRecords.totalRecords.toString(), 
      icon: FileText, 
      href: '/records' 
    },
    { 
      label: 'Active Consents', 
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
            <CardTitle className="text-xl text-gray-900">Unable to Load Dashboard</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <QuickActions />
      
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground">Here's your health overview</p>
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
        onDateClick={() => {}}
        onAppointmentClick={() => {}}
        onAddAppointment={() => {}}
        onEditAppointment={() => {}}
        onCancelAppointment={() => {}}
        onRescheduleAppointment={() => {}}
        onDayViewClick={() => {}}
        showNavigation={true}
        showAddButton={true}
      />

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest health management activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientDashboard;
