// Legacy AI Analysis Service - kept for backward compatibility
// This file contains the old complex frontend AI analysis logic
// New implementations should use the Django backend via aiAnalysisService.ts

// Supabase removed - using Django API only

export interface AIAnalysisResult {
  summary: string;
  keyFindings: string[];
  riskWarnings: string[];
  recommendations: string[];
  confidence: number;
  analysisType: string;
}

export const analyzeHealthRecordWithAI = async (recordData: {
  title: string;
  description: string;
  recordType: string;
  serviceDate: string;
  fileUrl?: string;
  fileName?: string;
}): Promise<AIAnalysisResult> => {
  // This is now a fallback that returns a simple analysis
  // In production, this should be replaced with calls to the Django backend
  
  console.warn('⚠️ Using legacy AI analysis service. Consider migrating to Django backend.');
  
  return {
    summary: `Legacy analysis for ${recordData.title}. This is a fallback analysis. Please use the Django backend for proper AI analysis.`,
    keyFindings: [
      'Legacy analysis system detected',
      'Recommendation: Migrate to Django backend',
      'Limited analysis capabilities available'
    ],
    riskWarnings: [
      'This is a legacy analysis system',
      'Results may not be as accurate as backend analysis'
    ],
    recommendations: [
      'Use the Django backend for proper AI analysis',
      'Contact system administrator for migration',
      'Consider updating to the new AI analysis system'
    ],
    confidence: 0.3,
    analysisType: 'Legacy Fallback Analysis'
  };
};
