import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Activity, AlertTriangle, Lightbulb, TrendingUp, Heart, X, RefreshCw, AlertCircle } from 'lucide-react';
import { InlineLoadingSpinner } from '@/components/ui/loading-spinner';
import { AIAnalysis } from '@/types';
import { getAIInsights } from '@/services/aiInsightsService';
// Supabase removed - using Django API only

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  recordTitle: string;
  recordType: string;
  recordDescription?: string;
  fileUrl?: string;
  fileName?: string;
  patientId?: string; // Optional patient ID for doctor view
}

export const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({
  isOpen,
  onClose,
  recordId,
  recordTitle,
  recordType,
  recordDescription,
  fileUrl,
  fileName,
  patientId
}) => {
  console.log('🔍 AIAnalysisModal received props:', {
    isOpen,
    recordId,
    recordTitle,
    patientId
  });
  console.log('🔍 AIAnalysisModal render - isOpen:', isOpen);
  
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    console.log('🔍 fetchAnalysis function called!');
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching AI analysis for record:', recordId);
      
      // Use patientId if provided (for doctor view), otherwise use current user ID
      let targetUserId: string;
      
      if (patientId) {
        // Doctor viewing patient's analysis
        targetUserId = patientId;
        console.log('🔍 Doctor view: Fetching AI insights for patient:', patientId);
        console.log('🔍 Doctor view: patientId type:', typeof patientId);
      } else {
        // Patient viewing their own analysis
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }
        targetUserId = user.id;
        console.log('🔍 Patient view: Fetching AI insights for user:', user.id);
        console.log('🔍 Patient view: user.id type:', typeof user.id);
      }
      
      // Fetch AI insights from Supabase
      console.log('🔍 About to call getAIInsights with targetUserId:', targetUserId);
      const insights = await getAIInsights(targetUserId);
      
      console.log('🔍 All insights for user:', insights);
      console.log('🔍 Looking for record ID:', recordId);
      console.log('🔍 Record ID type:', typeof recordId);
      console.log('🔍 Total insights found:', insights.length);
      
      // Log all record IDs in the insights for comparison
      if (insights.length > 0) {
        console.log('🔍 All record IDs in insights:', insights.map(i => ({ id: i.record_id, type: typeof i.record_id })));
      } else {
        console.log('🔍 No insights found for user:', targetUserId);
      }
      
      // Find the insight for this specific record
      const recordInsight = insights.find(insight => {
        console.log('🔍 Comparing insight record_id:', insight.record_id, 'with target:', recordId);
        console.log('🔍 Types - insight:', typeof insight.record_id, 'target:', typeof recordId);
        console.log('🔍 Exact match:', insight.record_id === recordId);
        return insight.record_id === recordId;
      });
      
      console.log('🔍 Found matching insight:', recordInsight);
      
      if (recordInsight) {
        // Parse the stored content (it's stored as JSON string)
        const analysisData = JSON.parse(recordInsight.content);
        
        const formattedAnalysis: AIAnalysis = {
          id: recordInsight.id,
          recordId: recordId,
          summary: analysisData.summary || 'AI Analysis Summary',
          simplifiedSummary: analysisData.simplifiedSummary || analysisData.simplified_summary,
          keyFindings: analysisData.keyFindings || [],
          riskWarnings: analysisData.riskWarnings || [],
          recommendations: analysisData.recommendations || [],
          predictiveInsights: analysisData.predictiveInsights || [],
          ai_disclaimer: analysisData.ai_disclaimer || '',
          disclaimer: analysisData.disclaimer || '',
          confidence: 0.0, // Confidence score removed
          processedAt: new Date(recordInsight.created_at),
          recordTitle: recordTitle,
        };
        
        console.log('📊 Formatted analysis:', formattedAnalysis);
        console.log('🔍 Key Findings:', analysisData.keyFindings);
        console.log('🔍 Raw analysis data:', analysisData);
        setAnalysis(formattedAnalysis);
      } else {
        console.log('ℹ️ No AI analysis found for this record');
        setAnalysis(null);
        setError('No AI analysis found for this record. Please click "Analyze with AI" to generate analysis.');
      }
    } catch (error: any) {
      console.error('❌ Error fetching analysis:', error);
      setError(`Failed to load analysis: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [recordId, patientId]);

  // Fetch existing analysis when modal opens
  useEffect(() => {
    console.log('🔍 useEffect triggered with:', { isOpen, recordId, patientId });
    if (isOpen && recordId) {
      console.log('🔍 Conditions met, calling fetchAnalysis');
      fetchAnalysis();
    } else {
      console.log('🔍 Conditions not met - isOpen:', isOpen, 'recordId:', recordId);
    }
  }, [isOpen, recordId, patientId, fetchAnalysis]);

  const handleRefreshAnalysis = async () => {
    setError(null);
    await fetchAnalysis();
  };


  console.log('🔍 AIAnalysisModal render - isOpen:', isOpen);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-600" />
            AI Analysis - {recordTitle}
          </DialogTitle>
          <DialogDescription>
            AI-powered analysis of your {recordType} record with detailed insights and recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Record Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Health Record Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {recordType}
                </div>
                <div>
                  <span className="font-medium">File:</span> {fileName || 'No file'}
                </div>
                {recordDescription && (
                  <div className="col-span-2">
                    <span className="font-medium">Description:</span> {recordDescription}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Analysis Section */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <InlineLoadingSpinner />
              <span className="ml-2">Loading analysis...</span>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              {/* Analysis Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">AI Analysis Results</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {analysis.processedAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">

                    {/* Summary */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Summary
                      </h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                        {analysis.summary}
                      </p>
                    </div>

                    {/* Simplified Summary */}
                    {analysis.simplifiedSummary && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Heart className="h-4 w-4" />
                          Simplified Summary
                        </h4>
                        <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-md border-l-4 border-blue-200">
                          {analysis.simplifiedSummary}
                        </p>
                      </div>
                    )}

                    {/* Key Findings */}
                    {analysis.keyFindings && analysis.keyFindings.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Key Findings
                        </h4>
                        <ul className="space-y-1">
                          {analysis.keyFindings.map((finding, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-indigo-600 mt-1">•</span>
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Risk Warnings */}
                    {analysis.riskWarnings && analysis.riskWarnings.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          Risk Warnings
                        </h4>
                        <ul className="space-y-1">
                          {analysis.riskWarnings.map((warning, index) => (
                            <li key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded-md flex items-start gap-2">
                              <span className="text-red-600 mt-1">⚠</span>
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          Recommendations
                        </h4>
                        <ul className="space-y-1">
                          {analysis.recommendations.map((recommendation, index) => (
                            <li key={index} className="text-sm text-green-700 bg-green-50 p-2 rounded-md flex items-start gap-2">
                              <span className="text-green-600 mt-1">💡</span>
                              {recommendation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Predictive Insights */}
                    {analysis.predictiveInsights && analysis.predictiveInsights.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-600">
                          <Heart className="h-4 w-4" />
                          Predictive Insights
                        </h4>
                        <ul className="space-y-1">
                          {analysis.predictiveInsights.map((insight, index) => (
                            <li key={index} className="text-sm text-blue-700 bg-blue-50 p-2 rounded-md flex items-start gap-2">
                              <span className="text-blue-600 mt-1">🔮</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI Disclaimer */}
                    {analysis.ai_disclaimer && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="h-4 w-4" />
                          AI Analysis Disclaimer
                        </h4>
                        <div className="text-sm text-orange-700 bg-orange-50 p-3 rounded-md border-l-4 border-orange-200">
                          {analysis.ai_disclaimer}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-red-600">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p>{error}</p>
                  <Button 
                    variant="outline" 
                    onClick={fetchAnalysis}
                    className="mt-4"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-red-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                  <h3 className="text-lg font-medium mb-2">Analysis Error</h3>
                  <p className="mb-4 text-sm">{error}</p>
                  <Button onClick={handleRefreshAnalysis} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Analysis Available</h3>
                  <p className="mb-4 text-sm">
                    This health record hasn't been analyzed yet. AI analysis is performed automatically when records are uploaded.
                    <br />
                    <span className="text-xs text-gray-400 mt-2 block">
                      If you just uploaded this record, please wait a few moments for analysis to complete.
                    </span>
                  </p>
                  <div className="space-y-2">
                    <Button onClick={handleRefreshAnalysis} variant="outline" className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Analysis
                    </Button>
                    <p className="text-xs text-gray-400">
                      Click refresh to check if analysis has completed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleRefreshAnalysis}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIAnalysisModal;
