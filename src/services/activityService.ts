// Supabase removed - using Django API only

export interface Activity {
  id: string;
  type: 'upload' | 'analysis' | 'consent' | 'login' | 'profile_update';
  message: string;
  timestamp: string;
  metadata?: any;
}

export const getRecentActivity = async (userId: string): Promise<Activity[]> => {
  try {
    console.log('🔄 Fetching recent activity for user:', userId);
    const activities: Activity[] = [];

    // Run all queries in parallel for better performance
    const [recordsResult, insightsResult, consentResult] = await Promise.all([
      supabase
        .from('health_records')
        .select('title, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('ai_insights')
        .select(`
          insight_type, 
          created_at, 
          record_id,
          health_records!inner(user_id, title)
        `)
        .eq('health_records.user_id', userId)
        .order('created_at', { ascending: false })
        .limit(2),
      supabase
        .from('consent_requests')
        .select('id, status, created_at, doctor_id, profiles!consent_requests_doctor_id_fkey(full_name)')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })
        .limit(2)
    ]);

    const { data: records, error: recordsError } = recordsResult;
    const { data: insights, error: insightsError } = insightsResult;
    const { data: consents, error: consentError } = consentResult;

    // Process health record uploads
    if (!recordsError && records) {
      records.forEach(record => {
        activities.push({
          id: `record-${record.created_at}`,
          type: 'upload',
          message: `${record.title} uploaded`,
          timestamp: record.created_at,
          metadata: { recordTitle: record.title }
        });
      });
    }

    // Process AI insights
    if (!insightsError && insights) {
      insights.forEach(insight => {
        const recordTitle = insight.health_records?.title || 'health record';
        activities.push({
          id: `insight-${insight.created_at}`,
          type: 'analysis',
          message: `AI analysis completed for ${recordTitle}`,
          timestamp: insight.created_at,
          metadata: { insightType: insight.insight_type }
        });
      });
    }

    // Process consent activities
    if (!consentError && consents) {
      consents.forEach(consent => {
        const doctorName = (consent as any).profiles?.full_name || 'Unknown Doctor';
        const message = consent.status === 'approved' 
          ? `Consent approved for ${doctorName}`
          : consent.status === 'denied'
          ? `Consent denied for ${doctorName}`
          : `Consent request from ${doctorName}`;
        
        activities.push({
          id: `consent-${consent.created_at}`,
          type: 'consent',
          message,
          timestamp: consent.created_at,
          metadata: { status: consent.status, doctorName }
        });
      });
    }

    // Sort all activities by timestamp and return the most recent 5
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
    
    console.log('✅ Recent activity fetched:', sortedActivities.length);
    return sortedActivities;
  } catch (error) {
    console.error('Error in getRecentActivity:', error);
    throw error;
  }
};

export const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};
