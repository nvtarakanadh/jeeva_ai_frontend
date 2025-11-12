// Supabase removed - using Django API only

export interface HealthAlert {
  id: string;
  type: 'warning' | 'info' | 'error' | 'success';
  message: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
  resolved: boolean;
}

export const getHealthAlerts = async (userId: string): Promise<HealthAlert[]> => {
  try {
    const alerts: HealthAlert[] = [];

    // Check for recent health records that might indicate issues
    const { data: recentRecords, error: recordsError } = await supabase
      .from('health_records')
      .select('title, record_type, service_date, tags')
      .eq('user_id', userId)
      .gte('service_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('service_date', { ascending: false });

    if (!recordsError && recentRecords) {
      // Check for high cholesterol indicators
      const cholesterolRecords = recentRecords.filter(record => 
        record.title.toLowerCase().includes('cholesterol') || 
        record.tags?.some(tag => tag.toLowerCase().includes('cholesterol'))
      );

      if (cholesterolRecords.length > 0) {
        alerts.push({
          id: 'cholesterol-warning',
          type: 'warning',
          message: 'High cholesterol levels detected in recent blood work',
          severity: 'medium',
          created_at: cholesterolRecords[0].service_date,
          resolved: false
        });
      }

      // Check for upcoming checkups
      const upcomingCheckups = recentRecords.filter(record => 
        record.record_type.toLowerCase().includes('checkup') ||
        record.record_type.toLowerCase().includes('physical')
      );

      if (upcomingCheckups.length === 0) {
        const lastCheckup = recentRecords.find(record => 
          record.record_type.toLowerCase().includes('checkup') ||
          record.record_type.toLowerCase().includes('physical')
        );

        if (!lastCheckup || new Date(lastCheckup.service_date) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)) {
          alerts.push({
            id: 'checkup-reminder',
            type: 'info',
            message: 'Annual checkup due - consider scheduling an appointment',
            severity: 'low',
            created_at: new Date().toISOString(),
            resolved: false
          });
        }
      }

      // Check for blood pressure records
      const bloodPressureRecords = recentRecords.filter(record => 
        record.title.toLowerCase().includes('blood pressure') ||
        record.tags?.some(tag => tag.toLowerCase().includes('blood pressure'))
      );

      if (bloodPressureRecords.length > 0) {
        alerts.push({
          id: 'blood-pressure-info',
          type: 'info',
          message: 'Recent blood pressure readings available for review',
          severity: 'low',
          created_at: bloodPressureRecords[0].service_date,
          resolved: false
        });
      }
    }

    // Check for AI insights that might indicate health concerns
    // First get the user's health records for AI insights
    const { data: aiRecords, error: aiRecordsError } = await supabase
      .from('health_records')
      .select('id')
      .eq('user_id', userId);

    let insights = [];
    if (!aiRecordsError && aiRecords && aiRecords.length > 0) {
      const recordIds = aiRecords.map(record => record.id);
      const { data: insightsData, error: insightsError } = await supabase
        .from('ai_insights')
        .select('insight_type, content, confidence_score, created_at')
        .in('record_id', recordIds)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!insightsError) {
        insights = insightsData || [];
      }
    }

    if (insights && insights.length > 0) {
      const concerningInsights = insights.filter(insight => 
        insight.confidence_score > 0.7 && 
        (insight.content.toLowerCase().includes('abnormal') || 
         insight.content.toLowerCase().includes('concerning') ||
         insight.content.toLowerCase().includes('follow up'))
      );

      if (concerningInsights.length > 0) {
        alerts.push({
          id: 'ai-insight-warning',
          type: 'warning',
          message: 'AI analysis has identified potential health concerns that may need attention',
          severity: 'high',
          created_at: concerningInsights[0].created_at,
          resolved: false
        });
      }
    }

    return alerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error in getHealthAlerts:', error);
    throw error;
  }
};
