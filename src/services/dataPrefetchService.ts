import { supabase } from '@/integrations/supabase/client';
import { cacheService, createCacheKey, CACHE_TTL } from './cacheService';

// Data prefetching service for critical data
class DataPrefetchService {
  private prefetchQueue: Set<string> = new Set();
  private isPrefetching = false;

  // Prefetch critical data for doctor dashboard
  async prefetchDoctorDashboardData(doctorProfileId: string) {
    if (this.prefetchQueue.has(doctorProfileId) || this.isPrefetching) {
      return;
    }

    this.prefetchQueue.add(doctorProfileId);
    this.isPrefetching = true;

    try {
      // Prefetch all critical data in parallel
      await Promise.allSettled([
        this.prefetchDashboardStats(doctorProfileId),
        this.prefetchRecentActivity(doctorProfileId),
        this.prefetchUpcomingTasks(doctorProfileId),
        this.prefetchPrescriptions(doctorProfileId),
        this.prefetchPatients(doctorProfileId)
      ]);
    } catch (error) {
      console.error('Error prefetching doctor dashboard data:', error);
    } finally {
      this.prefetchQueue.delete(doctorProfileId);
      this.isPrefetching = false;
    }
  }

  // Prefetch critical data for patient dashboard - DISABLED (Supabase removed)
  async prefetchPatientDashboardData(userId: string) {
    console.log('⚠️ prefetchPatientDashboardData disabled (Supabase removed)');
    return;
    
    /* OLD SUPABASE CODE - REMOVED
    if (this.prefetchQueue.has(userId) || this.isPrefetching) {
      return;
    }

    this.prefetchQueue.add(userId);
    this.isPrefetching = true;

    try {
      // Get patient profile first
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'patient')
        .single();

      if (profile) {
        await Promise.allSettled([
          this.prefetchHealthRecords(userId),
          this.prefetchAIInsights(userId),
          this.prefetchConsentRequests(profile.id),
          this.prefetchHealthAlerts(userId)
        ]);
      }
    } catch (error) {
      console.error('Error prefetching patient dashboard data:', error);
    } finally {
      this.prefetchQueue.delete(userId);
      this.isPrefetching = false;
    }
    */
  }

  // Individual prefetch methods
  private async prefetchDashboardStats(doctorProfileId: string) {
    const cacheKey = createCacheKey('ultra-dashboard-stats', doctorProfileId);
    if (cacheService.has(cacheKey)) return;

    try {
      const { data: patientData } = await supabase
        .from('patient_access')
        .select('patient_id')
        .eq('doctor_id', doctorProfileId)
        .eq('status', 'active');

      const { data: consentData } = await supabase
        .from('consent_requests')
        .select('status')
        .eq('doctor_id', doctorProfileId);

      const { count: recordsCount } = await supabase
        .from('health_records')
        .select('id', { count: 'exact', head: true });

      const stats = {
        totalPatients: new Set(patientData?.map(p => p.patient_id) || []).size,
        pendingConsents: consentData?.filter(c => c.status === 'pending').length || 0,
        activeConsents: consentData?.filter(c => c.status === 'approved').length || 0,
        totalRecords: recordsCount || 0
      };

      cacheService.set(cacheKey, stats, CACHE_TTL.LONG);
    } catch (error) {
      console.error('Error prefetching dashboard stats:', error);
    }
  }

  private async prefetchRecentActivity(doctorProfileId: string) {
    const cacheKey = createCacheKey('ultra-recent-activity', doctorProfileId);
    if (cacheService.has(cacheKey)) return;

    try {
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

      const activities: any[] = [];

      const processActivities = (data: any[], type: string, messageFn: (item: any) => string) => {
        data?.forEach(item => {
          activities.push({
            id: `${type}-${item.id}`,
            type,
            message: messageFn(item),
            time: this.getTimeAgo(item.created_at),
            created_at: item.created_at
          });
        });
      };

      processActivities(consentRequests.data, 'consent', (item) => `Consent ${item.status}`);
      processActivities(prescriptions.data, 'prescription', (item) => `Prescription "${item.title}"`);
      processActivities(consultationNotes.data, 'consultation', (item) => `Note "${item.title}"`);
      processActivities(consultations.data, 'consultation', (item) => `Consultation ${item.status}`);

      const result = activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4);

      cacheService.set(cacheKey, result, CACHE_TTL.SHORT);
    } catch (error) {
      console.error('Error prefetching recent activity:', error);
    }
  }

  private async prefetchUpcomingTasks(doctorProfileId: string) {
    const cacheKey = createCacheKey('ultra-upcoming-tasks', doctorProfileId);
    if (cacheService.has(cacheKey)) return;

    try {
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

      const tasks: any[] = [];

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

      const result = tasks
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 4);

      cacheService.set(cacheKey, result, CACHE_TTL.MEDIUM);
    } catch (error) {
      console.error('Error prefetching upcoming tasks:', error);
    }
  }

  private async prefetchPrescriptions(doctorProfileId: string) {
    const cacheKey = createCacheKey('prescriptions-doctor', doctorProfileId);
    if (cacheService.has(cacheKey)) return;

    try {
      const { data } = await supabase
        .from('prescriptions')
        .select(`
          id,
          title,
          description,
          medication,
          dosage,
          frequency,
          duration,
          instructions,
          prescription_date,
          created_at,
          updated_at,
          file_url,
          patient_id,
          profiles!prescriptions_patient_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false });

      cacheService.set(cacheKey, data || [], CACHE_TTL.MEDIUM);
    } catch (error) {
      console.error('Error prefetching prescriptions:', error);
    }
  }

  private async prefetchPatients(doctorProfileId: string) {
    const cacheKey = createCacheKey('patients-for-prescriptions', doctorProfileId);
    if (cacheService.has(cacheKey)) return;

    try {
      const { data } = await supabase
        .from('patient_access')
        .select(`
          patient_id,
          profiles!patient_access_patient_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('doctor_id', doctorProfileId)
        .eq('status', 'active');

      const patients = data?.map(access => ({
        id: access.patient_id,
        full_name: access.profiles?.full_name,
        email: access.profiles?.email
      })) || [];

      cacheService.set(cacheKey, patients, CACHE_TTL.LONG);
    } catch (error) {
      console.error('Error prefetching patients:', error);
    }
  }

  private async prefetchHealthRecords(userId: string) {
    const cacheKey = createCacheKey('health-records', userId);
    if (cacheService.has(cacheKey)) return;

    try {
      // Import the service dynamically to avoid circular dependencies
      const { getHealthRecordSummary } = await import('./healthRecordsService');
      const data = await getHealthRecordSummary(userId);
      cacheService.set(cacheKey, data, CACHE_TTL.MEDIUM);
    } catch (error) {
      console.error('Error prefetching health records:', error);
    }
  }

  private async prefetchAIInsights(userId: string) {
    const cacheKey = createCacheKey('ai-insights', userId);
    if (cacheService.has(cacheKey)) return;

    try {
      const { getAIInsightSummary } = await import('./aiInsightsService');
      const data = await getAIInsightSummary(userId);
      cacheService.set(cacheKey, data, CACHE_TTL.MEDIUM);
    } catch (error) {
      console.error('Error prefetching AI insights:', error);
    }
  }

  private async prefetchConsentRequests(profileId: string) {
    const cacheKey = createCacheKey('consent-requests', profileId);
    if (cacheService.has(cacheKey)) return;

    try {
      const { getPatientConsentRequests } = await import('./consentService');
      const data = await getPatientConsentRequests(profileId);
      cacheService.set(cacheKey, data, CACHE_TTL.MEDIUM);
    } catch (error) {
      console.error('Error prefetching consent requests:', error);
    }
  }

  private async prefetchHealthAlerts(userId: string) {
    const cacheKey = createCacheKey('health-alerts', userId);
    if (cacheService.has(cacheKey)) return;

    try {
      const { getHealthAlerts } = await import('./healthAlertsService');
      const data = await getHealthAlerts(userId);
      cacheService.set(cacheKey, data, CACHE_TTL.SHORT);
    } catch (error) {
      console.error('Error prefetching health alerts:', error);
    }
  }

  private getTimeAgo(dateString: string): string {
    const now = Date.now();
    const date = new Date(dateString).getTime();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  }
}

export const dataPrefetchService = new DataPrefetchService();
