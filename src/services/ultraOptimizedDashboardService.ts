// Supabase removed - using Django API only
import { cacheService, createCacheKey, CACHE_TTL } from './cacheService';
import { DashboardStats, RecentActivity, UpcomingTask } from './dashboardService';

// Re-export types for external use
export type { DashboardStats, RecentActivity, UpcomingTask };

// Ultra-optimized dashboard stats with minimal data transfer
export const getUltraOptimizedDashboardStats = async (doctorProfileId: string): Promise<DashboardStats> => {
  const cacheKey = createCacheKey('ultra-dashboard-stats', doctorProfileId);
  
  // Check cache first
  const cached = cacheService.get<DashboardStats>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Use the most efficient queries possible - only count, no data transfer
    const [
      patientAccessResult,
      consentRequestsResult,
      recordsResult
    ] = await Promise.all([
      // Ultra-optimized: Count only unique patients using SQL
      supabase
        .rpc('count_unique_patients', { doctor_id: doctorProfileId }),
      
      // Ultra-optimized: Get only counts by status
      supabase
        .rpc('count_consent_requests', { doctor_id: doctorProfileId }),
      
      // Ultra-optimized: Count only
      supabase
        .from('health_records')
        .select('id', { count: 'exact', head: true })
    ]);

    // If RPC functions don't exist, fall back to optimized queries
    let totalPatients = 0;
    let pendingConsents = 0;
    let activeConsents = 0;

    if (patientAccessResult.data !== null) {
      totalPatients = patientAccessResult.data as number;
    } else {
      // Fallback: Get unique patients count
      const { data: patientData } = await supabase
        .from('patient_access')
        .select('patient_id')
        .eq('doctor_id', doctorProfileId)
        .eq('status', 'active');
      
      totalPatients = new Set(patientData?.map(p => p.patient_id) || []).size;
    }

    if (consentRequestsResult.data !== null) {
      const counts = consentRequestsResult.data as { pending: number; approved: number };
      pendingConsents = counts.pending;
      activeConsents = counts.approved;
    } else {
      // Fallback: Get consent counts
      const { data: consentData } = await supabase
        .from('consent_requests')
        .select('status')
        .eq('doctor_id', doctorProfileId);
      
      pendingConsents = consentData?.filter(c => c.status === 'pending').length || 0;
      activeConsents = consentData?.filter(c => c.status === 'approved').length || 0;
    }

    const totalRecords = recordsResult.count || 0;

    const stats: DashboardStats = {
      totalPatients,
      pendingConsents,
      activeConsents,
      totalRecords
    };

    // Cache for longer since this data changes less frequently
    cacheService.set(cacheKey, stats, CACHE_TTL.LONG);
    
    return stats;
  } catch (error) {
    console.error('Error loading ultra-optimized dashboard stats:', error);
    return {
      totalPatients: 0,
      pendingConsents: 0,
      activeConsents: 0,
      totalRecords: 0
    };
  }
};

// Ultra-optimized recent activity with minimal data
export const getUltraOptimizedRecentActivity = async (doctorProfileId: string): Promise<RecentActivity[]> => {
  const cacheKey = createCacheKey('ultra-recent-activity', doctorProfileId);
  
  const cached = cacheService.get<RecentActivity[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Get only the most recent 3 items from each table with minimal fields
    const [consentRequests, prescriptions, consultationNotes, consultations] = await Promise.all([
      supabase
        .from('consent_requests')
        .select('id, status, created_at')
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(2),
      
      supabase
        .from('prescriptions')
        .select('id, title, created_at')
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(2),
      
      supabase
        .from('consultation_notes')
        .select('id, title, created_at')
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(2),
      
      supabase
        .from('consultations')
        .select('id, status, created_at')
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(2)
    ]);

    const activities: RecentActivity[] = [];

    // Process activities with minimal data
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

    processActivities(consentRequests.data, 'consent', (item) => `Consent ${item.status}`);
    processActivities(prescriptions.data, 'prescription', (item) => `Prescription "${item.title}"`);
    processActivities(consultationNotes.data, 'consultation', (item) => `Note "${item.title}"`);
    processActivities(consultations.data, 'consultation', (item) => `Consultation ${item.status}`);

    // Sort and limit to 4 items max
    const result = activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);

    // Cache for shorter time since this changes more frequently
    cacheService.set(cacheKey, result, CACHE_TTL.SHORT);
    
    return result;
  } catch (error) {
    console.error('Error loading ultra-optimized recent activity:', error);
    return [];
  }
};

// Ultra-optimized upcoming tasks with minimal data
export const getUltraOptimizedUpcomingTasks = async (doctorProfileId: string): Promise<UpcomingTask[]> => {
  const cacheKey = createCacheKey('ultra-upcoming-tasks', doctorProfileId);
  
  const cached = cacheService.get<UpcomingTask[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const tasks: UpcomingTask[] = [];

    // Get only the most urgent tasks (next 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: consultations } = await supabase
      .from('consultations')
      .select('id, consultation_date, status')
      .eq('doctor_id', doctorProfileId)
      .eq('status', 'scheduled')
      .gte('consultation_date', new Date().toISOString().split('T')[0])
      .lte('consultation_date', threeDaysFromNow.toISOString().split('T')[0])
      .order('consultation_date', { ascending: true })
      .limit(3);

    consultations?.forEach(consultation => {
      const dueDate = new Date(consultation.consultation_date);
      const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (daysUntil <= 1) priority = 'high';
      else if (daysUntil <= 2) priority = 'medium';

      tasks.push({
        id: `consultation-${consultation.id}`,
        task: `Scheduled consultation`,
        priority,
        dueDate: consultation.consultation_date,
        type: 'consultation'
      });
    });

    // Get only urgent follow-ups (next 2 days)
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const { data: followUpNotes } = await supabase
      .from('consultation_notes')
      .select('id, follow_up_date, title')
      .eq('doctor_id', doctorProfileId)
      .eq('follow_up_required', true)
      .not('follow_up_date', 'is', null)
      .gte('follow_up_date', new Date().toISOString().split('T')[0])
      .lte('follow_up_date', twoDaysFromNow.toISOString().split('T')[0])
      .order('follow_up_date', { ascending: true })
      .limit(2);

    followUpNotes?.forEach(note => {
      const dueDate = new Date(note.follow_up_date!);
      const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (daysUntil <= 1) priority = 'high';
      else if (daysUntil <= 2) priority = 'medium';

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
      .slice(0, 4);

    // Cache for medium time
    cacheService.set(cacheKey, result, CACHE_TTL.MEDIUM);
    
    return result;
  } catch (error) {
    console.error('Error loading ultra-optimized upcoming tasks:', error);
    return [];
  }
};

// Helper function to get time ago string (ultra-optimized)
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

// Clear ultra-optimized cache
export const clearUltraOptimizedCache = (doctorProfileId: string) => {
  cacheService.clearPattern(`ultra-dashboard-stats:${doctorProfileId}`);
  cacheService.clearPattern(`ultra-recent-activity:${doctorProfileId}`);
  cacheService.clearPattern(`ultra-upcoming-tasks:${doctorProfileId}`);
};
