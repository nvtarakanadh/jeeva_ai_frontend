// Supabase removed - using Django API only

export interface DashboardStats {
  totalPatients: number;
  pendingConsents: number;
  activeConsents: number;
  totalRecords: number;
}

export interface RecentActivity {
  id: string;
  type: 'consent' | 'prescription' | 'consultation' | 'patient';
  message: string;
  time: string;
  created_at: string;
}

export interface UpcomingTask {
  id: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  patientName?: string;
  type: 'consultation' | 'follow_up' | 'prescription' | 'consent';
}

export const getDashboardStats = async (doctorProfileId: string): Promise<DashboardStats> => {
  try {
    // Get all stats in parallel for better performance
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
      
      // Get consent requests
      supabase
        .from('consent_requests')
        .select('status')
        .eq('doctor_id', doctorProfileId),
      
      // Get total records count (simplified query)
      supabase
        .from('health_records')
        .select('id', { count: 'exact', head: true })
    ]);

    const uniquePatients = new Set(patientAccessResult.data?.map(acc => acc.patient_id) || []).size;
    const consentRequests = consentRequestsResult.data || [];
    const pendingConsents = consentRequests.filter(c => c.status === 'pending').length;
    const activeConsents = consentRequests.filter(c => c.status === 'approved').length;
    const totalRecords = recordsResult.count || 0;

    return {
      totalPatients: uniquePatients,
      pendingConsents,
      activeConsents,
      totalRecords
    };
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

export const getRecentActivity = async (doctorProfileId: string): Promise<RecentActivity[]> => {
  try {
    // Get recent activities from multiple sources
    const [consentRequests, prescriptions, consultationNotes, consultations] = await Promise.all([
      // Recent consent requests
      supabase
        .from('consent_requests')
        .select(`
          id,
          status,
          created_at,
          patient_id
        `)
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent prescriptions
      supabase
        .from('prescriptions')
        .select(`
          id,
          title,
          created_at,
          patient_id
        `)
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent consultation notes
      supabase
        .from('consultation_notes')
        .select(`
          id,
          title,
          created_at,
          patient_id
        `)
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent consultations
      supabase
        .from('consultations')
        .select(`
          id,
          status,
          created_at,
          patient_id
        `)
        .eq('doctor_id', doctorProfileId)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    const activities: RecentActivity[] = [];

    // Process consent requests
    consentRequests.data?.forEach(consent => {
      activities.push({
        id: `consent-${consent.id}`,
        type: 'consent',
        message: `Consent request ${consent.status}`,
        time: getTimeAgo(consent.created_at),
        created_at: consent.created_at
      });
    });

    // Process prescriptions
    prescriptions.data?.forEach(prescription => {
      activities.push({
        id: `prescription-${prescription.id}`,
        type: 'prescription',
        message: `Prescription "${prescription.title}" created`,
        time: getTimeAgo(prescription.created_at),
        created_at: prescription.created_at
      });
    });

    // Process consultation notes
    consultationNotes.data?.forEach(note => {
      activities.push({
        id: `note-${note.id}`,
        type: 'consultation',
        message: `Consultation note "${note.title}" created`,
        time: getTimeAgo(note.created_at),
        created_at: note.created_at
      });
    });

    // Process consultations
    consultations.data?.forEach(consultation => {
      activities.push({
        id: `consultation-${consultation.id}`,
        type: 'consultation',
        message: `Consultation ${consultation.status}`,
        time: getTimeAgo(consultation.created_at),
        created_at: consultation.created_at
      });
    });

    // Sort by creation date and return top 5
    return activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

  } catch (error) {
    console.error('Error loading recent activity:', error);
    return [];
  }
};

export const getUpcomingTasks = async (doctorProfileId: string): Promise<UpcomingTask[]> => {
  try {
    const tasks: UpcomingTask[] = [];

    // Get consultations with follow-up required
    const { data: consultations } = await supabase
      .from('consultations')
      .select(`
        id,
        consultation_date,
        status
      `)
      .eq('doctor_id', doctorProfileId)
      .eq('status', 'scheduled')
      .gte('consultation_date', new Date().toISOString().split('T')[0])
      .order('consultation_date', { ascending: true })
      .limit(5);

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

    // Get consultation notes with follow-up required
    const { data: followUpNotes } = await supabase
      .from('consultation_notes')
      .select(`
        id,
        follow_up_date,
        title
      `)
      .eq('doctor_id', doctorProfileId)
      .eq('follow_up_required', true)
      .not('follow_up_date', 'is', null)
      .gte('follow_up_date', new Date().toISOString().split('T')[0])
      .order('follow_up_date', { ascending: true })
      .limit(3);

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

    // Sort by due date and return top 5
    return tasks
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);

  } catch (error) {
    console.error('Error loading upcoming tasks:', error);
    return [];
  }
};

// Helper function to get time ago string
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
}
