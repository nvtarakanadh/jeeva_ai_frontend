// Supabase removed - using Django API only
import { cacheService, createCacheKey, CACHE_TTL } from './cacheService';
import { DashboardStats, RecentActivity, UpcomingTask } from './dashboardService';

// Re-export types for external use
export type { DashboardStats, RecentActivity, UpcomingTask };

// Optimized dashboard stats with caching
export const getOptimizedDashboardStats = async (doctorProfileId: string): Promise<DashboardStats> => {
  const cacheKey = createCacheKey('dashboard-stats', doctorProfileId);
  
  // Check cache first
  const cached = cacheService.get<DashboardStats>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Use more efficient queries with better indexing
    const [
      patientAccessResult,
      consentRequestsResult,
      recordsResult
    ] = await Promise.all([
      // Get unique patients from patient_access table
      supabase
        .from('patient_access')
        .select('patient_id')
        .eq('doctor_id', doctorProfileId)
        .eq('status', 'active'),
      
      // Optimized: Get only status counts
      supabase
        .from('consent_requests')
        .select('status')
        .eq('doctor_id', doctorProfileId),
      
      // Optimized: Count only, no data transfer
      supabase
        .from('health_records')
        .select('id', { count: 'exact', head: true })
    ]);

    // Count unique patients correctly
    const patientIds = patientAccessResult.data?.map(acc => acc.patient_id) || [];
    const uniquePatients = new Set(patientIds).size;
    const totalPatients = uniquePatients;
    const consentRequests = consentRequestsResult.data || [];
    const pendingConsents = consentRequests.filter(c => c.status === 'pending').length;
    const activeConsents = consentRequests.filter(c => c.status === 'approved').length;
    const totalRecords = recordsResult.count || 0;

    const stats: DashboardStats = {
      totalPatients,
      pendingConsents,
      activeConsents,
      totalRecords
    };

    // Cache the result
    cacheService.set(cacheKey, stats, CACHE_TTL.MEDIUM);
    
    return stats;
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    return {
      totalPatients: 0,
      pendingConsents: 0,
      activeConsents: 0,
      totalRecords: 0
    };
  }
};

// Optimized recent activity with caching
export const getOptimizedRecentActivity = async (doctorProfileId: string): Promise<RecentActivity[]> => {
  const cacheKey = createCacheKey('recent-activity', doctorProfileId);
  
  const cached = cacheService.get<RecentActivity[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Use more efficient queries with limits and specific fields
    const [consentRequests, prescriptions, consultationNotes, consultations] = await Promise.all([
      supabase
        .from('consent_requests')
        .select('id, status, created_at')
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(3),
      
      supabase
        .from('prescriptions')
        .select('id, title, created_at')
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(3),
      
      supabase
        .from('consultation_notes')
        .select('id, title, created_at')
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(3),
      
      supabase
        .from('consultations')
        .select('id, status, created_at')
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(3)
    ]);

    const activities: RecentActivity[] = [];

    // Process activities more efficiently
    const processActivities = (data: any[], type: RecentActivity['type'], messageFn: (item: any) => string) => {
      data?.forEach(item => {
        activities.push({
          id: `${type}-${item.id}`,
          type,
          message: messageFn(item),
          time: getTimeAgo(item.created_at),
          created_at: item.created_at
        });
      });
    };

    processActivities(consentRequests.data, 'consent', (item) => `Consent request ${item.status}`);
    processActivities(prescriptions.data, 'prescription', (item) => `Prescription "${item.title}" created`);
    processActivities(consultationNotes.data, 'consultation', (item) => `Consultation note "${item.title}" created`);
    processActivities(consultations.data, 'consultation', (item) => `Consultation ${item.status}`);

    // Sort and limit
    const result = activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    // Cache the result
    cacheService.set(cacheKey, result, CACHE_TTL.SHORT);
    
    return result;
  } catch (error) {
    console.error('Error loading recent activity:', error);
    return [];
  }
};

// Optimized upcoming tasks with caching
export const getOptimizedUpcomingTasks = async (doctorProfileId: string): Promise<UpcomingTask[]> => {
  const cacheKey = createCacheKey('upcoming-tasks', doctorProfileId);
  
  const cached = cacheService.get<UpcomingTask[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const tasks: UpcomingTask[] = [];

    // Get consultations with follow-up required - more efficient query
    const { data: consultations } = await supabase
      .from('consultations')
      .select('id, consultation_date, status')
      .eq('doctor_id', doctorProfileId)
      .eq('status', 'scheduled')
      .gte('consultation_date', new Date().toISOString().split('T')[0])
      .order('consultation_date', { ascending: true })
      .limit(3);

    consultations?.forEach(consultation => {
      const dueDate = new Date(consultation.consultation_date);
      const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (daysUntil <= 1) priority = 'high';
      else if (daysUntil <= 3) priority = 'medium';

      tasks.push({
        id: `consultation-${consultation.id}`,
        task: `Scheduled consultation`,
        priority,
        dueDate: consultation.consultation_date,
        type: 'consultation'
      });
    });

    // Get follow-up notes - more efficient query
    const { data: followUpNotes } = await supabase
      .from('consultation_notes')
      .select('id, follow_up_date, title')
      .eq('doctor_id', doctorProfileId)
      .eq('follow_up_required', true)
      .not('follow_up_date', 'is', null)
      .gte('follow_up_date', new Date().toISOString().split('T')[0])
      .order('follow_up_date', { ascending: true })
      .limit(2);

    followUpNotes?.forEach(note => {
      const dueDate = new Date(note.follow_up_date!);
      const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (daysUntil <= 1) priority = 'high';
      else if (daysUntil <= 3) priority = 'medium';

      tasks.push({
        id: `followup-${note.id}`,
        task: `Follow-up for ${note.title}`,
        priority,
        dueDate: note.follow_up_date!,
        type: 'follow_up'
      });
    });

    const result = tasks
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);

    // Cache the result
    cacheService.set(cacheKey, result, CACHE_TTL.MEDIUM);
    
    return result;
  } catch (error) {
    console.error('Error loading upcoming tasks:', error);
    return [];
  }
};

// Helper function to get time ago string (optimized)
function getTimeAgo(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

// Clear cache when data changes
export const clearDashboardCache = (doctorProfileId: string) => {
  cacheService.clearPattern(`dashboard-stats:${doctorProfileId}`);
  cacheService.clearPattern(`recent-activity:${doctorProfileId}`);
  cacheService.clearPattern(`upcoming-tasks:${doctorProfileId}`);
};
