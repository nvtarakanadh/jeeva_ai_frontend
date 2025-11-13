// AI Analysis Service that connects to Django backend
// This replaces the old complex frontend AI analysis with backend integration
// Supabase removed - using Django API only

// Backend URL configuration
// Use environment variable or fallback to localhost for development
const getAPIBaseURL = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000';
  return `${baseUrl}/api/ai`;
};

const API_BASE_URL = getAPIBaseURL();

// Debug logging for production
console.log('🔧 AI Service initialized with URL:', API_BASE_URL);
console.log('🔧 Current hostname:', window.location.hostname);
console.log('🔧 Environment:', import.meta.env.MODE);

export interface AIAnalysisResult {
  summary: string;
  keyFindings: string[];
  riskWarnings: string[];
  recommendations: string[];
  predictiveInsights?: string[];
  ai_disclaimer?: string;
  disclaimer?: string;
  confidence: number;
  analysisType?: string;  // Frontend field name
  analysis_type?: string; // Django field name
}

export interface HealthRecordAnalysisRequest {
  title: string;
  description?: string;
  record_type: string;
  service_date: string;
  file_url?: string;
  file_name?: string;
  record_id?: string;
  patient_id?: string;
  uploaded_by?: string;
}

export interface PrescriptionAnalysisRequest {
  image: File;
  title?: string;
  description?: string;
  recordType?: string;
  patientId?: string;
  uploadedBy?: string;
}

export interface MedicalReportAnalysisRequest {
  file: File;
  title?: string;
  description?: string;
  patientId?: string;
  uploadedBy?: string;
}

export interface AnalysisResponse {
  success: boolean;
  record_id: string;
  analysis: AIAnalysisResult;
  health_record?: any;
}

/**
 * Analyze a prescription image using the Django backend
 */
export const analyzePrescription = async (request: PrescriptionAnalysisRequest): Promise<AnalysisResponse> => {
  try {
    console.log('🔍 Analyzing prescription with API URL:', `${API_BASE_URL}/analyze/prescription/`);
    
    const formData = new FormData();
    formData.append('image', request.image);
    formData.append('title', request.title || 'Prescription Analysis');
    formData.append('description', request.description || '');
    formData.append('record_type', request.recordType || 'prescription');
    if (request.patientId) formData.append('patient_id', request.patientId);
    if (request.uploadedBy) formData.append('uploaded_by', request.uploadedBy);

    const response = await fetch(`${API_BASE_URL}/analyze/prescription/`, {
      method: 'POST',
      body: formData,
    });

    console.log('🔍 Prescription analysis response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
      console.error('❌ Prescription analysis error:', errorData);
      throw new Error(errorData.error || `Failed to analyze prescription (Status: ${response.status})`);
    }

    const result = await response.json();
    console.log('✅ Prescription analysis success:', result);
    return result;
  } catch (error) {
    console.error('❌ Error analyzing prescription:', error);
    if (error.message.includes('fetch')) {
      throw new Error('Cannot connect to AI analysis service. Please ensure the Django backend is running on port 8000.');
    }
    throw error;
  }
};

/**
 * Analyze a medical report (PDF or image) using the Django backend
 */
export const analyzeMedicalReport = async (request: MedicalReportAnalysisRequest): Promise<AnalysisResponse> => {
  try {
    console.log('🔍 Analyzing medical report with API URL:', `${API_BASE_URL}/analyze/medical-report/`);
    
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('title', request.title || 'Medical Report Analysis');
    formData.append('description', request.description || '');
    if (request.patientId) formData.append('patient_id', request.patientId);
    if (request.uploadedBy) formData.append('uploaded_by', request.uploadedBy);

    const response = await fetch(`${API_BASE_URL}/analyze/medical-report/`, {
      method: 'POST',
      body: formData,
    });

    console.log('🔍 Medical report analysis response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
      console.error('❌ Medical report analysis error:', errorData);
      throw new Error(errorData.error || `Failed to analyze medical report (Status: ${response.status})`);
    }

    const result = await response.json();
    console.log('✅ Medical report analysis success:', result);
    return result;
  } catch (error) {
    console.error('❌ Error analyzing medical report:', error);
    if (error.message.includes('fetch')) {
      throw new Error('Cannot connect to AI analysis service. Please ensure the Django backend is running on port 8000.');
    }
    throw error;
  }
};

/**
 * Analyze a health record using the Django backend
 */
export const analyzeHealthRecord = async (request: HealthRecordAnalysisRequest): Promise<AnalysisResponse> => {
  try {
    console.log('🔍 Calling Django backend with request:', request);
    console.log('🔍 API URL:', `${API_BASE_URL}/analyze/health-record/`);
    
    // Convert empty string file_url to null to avoid validation errors
    const requestData = { ...request };
    if (requestData.file_url === '' || requestData.file_url === undefined) {
      requestData.file_url = undefined;
    }
    
    // If file_url is relative, convert to absolute URL
    if (requestData.file_url && requestData.file_url.startsWith('/')) {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000';
      requestData.file_url = `${apiBase}${requestData.file_url}`;
    }
    
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/analyze/health-record/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(requestData),
    });

    console.log('🔍 Response status:', response.status);
    console.log('🔍 Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Backend error response:', errorData);
      console.error('❌ Full error details:', JSON.stringify(errorData, null, 2));
      throw new Error(errorData.error || 'Failed to analyze health record');
    }

    const result = await response.json();
    console.log('✅ Backend success response:', result);
    return result;
  } catch (error) {
    console.error('❌ Error analyzing health record:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error.message);
    throw error;
  }
};

/**
 * Get AI analysis for a specific record
 */
export const getAnalysis = async (recordId: string): Promise<AnalysisResponse> => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/analysis/${recordId}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get analysis' }));
      throw new Error(errorData.error || errorData.detail || 'Failed to get analysis');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting analysis:', error);
    throw error;
  }
};

/**
 * List all AI analyses
 */
export const listAnalyses = async (): Promise<{ success: boolean; analyses: AIAnalysisResult[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analyses/`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to list analyses');
    }

    return await response.json();
  } catch (error) {
    console.error('Error listing analyses:', error);
    throw error;
  }
};

/**
 * Health check for the AI backend
 */
export const healthCheck = async (): Promise<{ status: string; message: string; timestamp: string }> => {
  try {
    console.log('🔍 Checking backend health at:', `${API_BASE_URL}/health/`);
    
    const response = await fetch(`${API_BASE_URL}/health/`, {
      method: 'GET',
    });

    console.log('🔍 Health check response status:', response.status);

    if (!response.ok) {
      throw new Error(`Backend health check failed (Status: ${response.status})`);
    }

    const result = await response.json();
    console.log('✅ Backend health check success:', result);
    return result;
  } catch (error) {
    console.error('❌ Error checking backend health:', error);
    if (error.message.includes('fetch')) {
      throw new Error('Cannot connect to AI analysis service. Please ensure the Django backend is running on port 8000.');
    }
    throw error;
  }
};

/**
 * Legacy function for backward compatibility
 * This now uses the Django backend instead of complex frontend analysis
 */
export const analyzeHealthRecordWithAI = async (recordData: {
  title: string;
  description: string;
  recordType: string;
  serviceDate: string;
  fileUrl?: string;
  fileName?: string;
  recordId?: string;
  patientId?: string;
  uploadedBy?: string;
}): Promise<AIAnalysisResult> => {
  try {
    // Get current user ID from localStorage (Django JWT token)
    // TODO: Get from AuthContext instead
    const currentUserId = 'unknown-user'; // Will be replaced with Django user ID
    
    // Route to the correct analysis endpoint based on record type
    let response;
    
    if (recordData.recordType === 'lab_test' || recordData.recordType === 'medical_report' || recordData.recordType === 'lab-result') {
      // For lab tests and medical reports, we need to download the file and analyze it
      if (recordData.fileUrl) {
        // Download the file and analyze it as a medical report
        const fileResponse = await fetch(recordData.fileUrl);
        const fileBlob = await fileResponse.blob();
        const file = new File([fileBlob], recordData.fileName || 'medical_report', { type: fileBlob.type });
        
        response = await analyzeMedicalReport({
          file: file,
          title: recordData.title,
          description: recordData.description,
          patientId: recordData.patientId || currentUserId,
          uploadedBy: recordData.uploadedBy || currentUserId
        });
      } else {
        throw new Error('No file URL provided for medical report analysis');
      }
    } else {
      // For other record types, use the general health record analysis
      response = await analyzeHealthRecord({
        title: recordData.title,
        description: recordData.description,
        record_type: recordData.recordType,
        service_date: recordData.serviceDate,
        file_url: recordData.fileUrl,
        file_name: recordData.fileName,
        record_id: recordData.recordId,
        patient_id: recordData.patientId || currentUserId,
        uploaded_by: recordData.uploadedBy || currentUserId
      });
    }

    return response.analysis;
  } catch (error) {
    console.error('Error in legacy analyzeHealthRecordWithAI:', error);
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Backend is not available - throw error to be handled by caller
    throw new Error('Backend AI analysis service is not available. Please check if the Django server is running on port 8000.');
  }
};

export const getAIAnalysisForRecord = async (recordId: string): Promise<AIAnalysisResult | null> => {
  try {
    const data = await getAnalysis(recordId);
    return data?.analysis || null;
  } catch (err) {
    return null;
  }
};