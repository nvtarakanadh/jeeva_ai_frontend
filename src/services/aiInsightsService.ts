// Supabase removed - using Django API only

export interface AIInsight {
  id: string;
  record_id: string;
  insight_type: string;
  content: string;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export interface AIInsightSummary {
  totalInsights: number;
  recentInsights: AIInsight[];
  insightTypes: { [key: string]: number };
  averageConfidence: number;
}

export const getAIInsights = async (userId: string): Promise<AIInsight[]> => {
  try {
    console.log('🔄 Fetching AI insights for user:', userId);
    
    // Query ai_insights table directly by user_id
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AI insights:', error);
      // If table doesn't exist, return empty array instead of throwing
      if (error.message.includes('does not exist') || error.message.includes('relation') || error.code === 'PGRST116') {
        console.log('AI insights table not found, returning empty array');
        return [];
      }
      throw error;
    }

    console.log('✅ AI insights fetched:', data?.length || 0);
    console.log('📋 AI insights data:', data);
    return data || [];
  } catch (error) {
    console.error('Error in getAIInsights:', error);
    // Return empty array instead of throwing to prevent dashboard crashes
    return [];
  }
};

export const getAIInsightSummary = async (userId: string): Promise<AIInsightSummary> => {
  try {
    const insights = await getAIInsights(userId);
    
    const insightTypes: { [key: string]: number } = {};
    insights.forEach(insight => {
      insightTypes[insight.insight_type] = (insightTypes[insight.insight_type] || 0) + 1;
    });

    const averageConfidence = insights.length > 0 
      ? insights.reduce((sum, insight) => sum + insight.confidence_score, 0) / insights.length 
      : 0;

    return {
      totalInsights: insights.length,
      recentInsights: insights.slice(0, 5), // Last 5 insights
      insightTypes,
      averageConfidence: Math.round(averageConfidence * 100) / 100
    };
  } catch (error) {
    console.error('Error in getAIInsightSummary:', error);
    throw error;
  }
};

export const createAIInsight = async (insightData: Omit<AIInsight, 'id' | 'created_at' | 'updated_at'> & { user_id: string }): Promise<AIInsight> => {
  try {
    const { data, error } = await supabase
      .from('ai_insights')
      .insert(insightData)
      .select()
      .single();

    if (error) {
      console.error('Error creating AI insight:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createAIInsight:', error);
    throw error;
  }
};
