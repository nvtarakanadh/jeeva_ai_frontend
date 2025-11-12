// Supabase removed - using Django API only
import { DashboardStats, RecentActivity, UpcomingTask } from './dashboardService';

// Simple dashboard service that uses basic Supabase queries
export const getSimpleDashboardStats = async (doctorProfileId: string): Promise<DashboardStats> => {
  try {
    console.log('📊 Fetching simple dashboard stats for doctor:', doctorProfileId);
    
    // Use basic queries that are more likely to work
    const [
      patientsResult,
      consentsResult,
      recordsResult
    ] = await Promise.all([
      // Get all patients (profiles with role = 'patient')
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'patient'),
      
      // Get consent requests for this doctor
      supabase
        .from('consent_requests')
        .select('status')
        .eq('doctor_id', doctorProfileId),
      
      // Get health records count
      supabase
        .from('health_records')
        .select('id', { count: 'exact', head: true })
    ]);

    // Calculate results
    const totalPatients = patientsResult.count || 0;
    const totalRecords = recordsResult.count || 0;
    
    // Count consents by status
    const consentData = consentsResult.data || [];
    const pendingConsents = consentData.filter(c => c.status === 'pending').length;
    const activeConsents = consentData.filter(c => c.status === 'approved').length;

    const stats: DashboardStats = {
      totalPatients,
      pendingConsents,
      activeConsents,
      totalRecords
    };

    console.log('📊 Simple dashboard stats calculated:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error fetching simple dashboard stats:', error);
    // Return zeros instead of throwing
    return {
      totalPatients: 0,
      pendingConsents: 0,
      activeConsents: 0,
      totalRecords: 0
    };
  }
};

export const getSimpleRecentActivity = async (doctorProfileId: string): Promise<RecentActivity[]> => {
  try {
    console.log('📋 Fetching simple recent activity for doctor:', doctorProfileId);
    
    // Get recent activities from various tables
    const [consultationsResult, prescriptionsResult, consentsResult] = await Promise.all([
      supabase
        .from('consultations')
        .select('id, created_at, status, patient_id')
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(5),
      
      supabase
        .from('prescriptions')
        .select('id, created_at, title')
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(5),
      
      supabase
        .from('consent_requests')
        .select('id, created_at, status')
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    const activities: RecentActivity[] = [];

    // Add consultations
    if (consultationsResult.data) {
      consultationsResult.data.forEach(consultation => {
        activities.push({
          id: consultation.id,
          type: 'consultation',
          message: `Consultation ${consultation.status}`,
          time: consultation.created_at,
          created_at: consultation.created_at
        });
      });
    }

    // Add prescriptions
    if (prescriptionsResult.data) {
      prescriptionsResult.data.forEach(prescription => {
        activities.push({
          id: prescription.id,
          type: 'prescription',
          message: `Prescription: ${prescription.title || 'Untitled'}`,
          time: prescription.created_at,
          created_at: prescription.created_at
        });
      });
    }

    // Add consents
    if (consentsResult.data) {
      consentsResult.data.forEach(consent => {
        activities.push({
          id: consent.id,
          type: 'consent',
          message: `Consent request ${consent.status}`,
          time: consent.created_at,
          created_at: consent.created_at
        });
      });
    }

    // Sort by created_at and limit to 10
    const sortedActivities = activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    console.log('📋 Simple recent activity calculated:', sortedActivities.length, 'activities');
    return sortedActivities;
  } catch (error) {
    console.error('❌ Error fetching simple recent activity:', error);
    return [];
  }
};

export const getSimpleUpcomingTasks = async (doctorProfileId: string): Promise<UpcomingTask[]> => {
  try {
    console.log('📅 Fetching simple upcoming tasks for doctor:', doctorProfileId);
    
    // Get upcoming consultations
    const consultationsResult = await supabase
      .from('consultations')
      .select('id, consultation_date, status')
      .eq('doctor_id', doctorProfileId)
      .gte('consultation_date', new Date().toISOString())
      .order('consultation_date', { ascending: true })
      .limit(10);

    const tasks: UpcomingTask[] = [];

    if (consultationsResult.data) {
      consultationsResult.data.forEach(consultation => {
        tasks.push({
          id: consultation.id,
          task: `Consultation - ${consultation.status}`,
          dueDate: consultation.consultation_date,
          priority: consultation.status === 'scheduled' ? 'high' : 'medium',
          type: 'consultation'
        });
      });
    }

    console.log('📅 Simple upcoming tasks calculated:', tasks.length, 'tasks');
    return tasks;
  } catch (error) {
    console.error('❌ Error fetching simple upcoming tasks:', error);
    return [];
  }
};
