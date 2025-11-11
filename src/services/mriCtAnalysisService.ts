/**
 * MRI/CT Scan Analysis Service
 * Handles communication with the Django backend for MRI/CT scan analysis using Dr7.ai API
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api/ai`
  : 'http://localhost:8000/api/ai';

export interface MRI_CT_AnalysisRequest {
  record_id: string;
  patient_id: string;
  scan_type: 'MRI' | 'CT' | 'XRAY';
  image_url?: string;
  image_file?: File;
  doctor_access?: boolean;
}

export interface MRI_CT_Analysis {
  id: number;
  record_id: string;
  patient_id: string;
  scan_type: string;
  scan_type_display: string;
  summary: string;
  findings: string[];
  region: string;
  clinical_significance: string;
  recommendations: string[];
  risk_level: string;
  risk_level_display: string;
  source_model: string;
  doctor_access: boolean;
  api_usage_tokens: number;
  created_at: string;
  updated_at: string;
  disclaimer: string;
}

export interface MRI_CT_AnalysisResponse {
  message: string;
  analysis: MRI_CT_Analysis;
}

export interface MRI_CT_AnalysisListResponse {
  analyses: MRI_CT_Analysis[];
  count: number;
}

/**
 * Analyze MRI/CT scan using Dr7.ai API
 */
export async function analyzeMRICTScan(request: MRI_CT_AnalysisRequest): Promise<MRI_CT_AnalysisResponse> {
  try {
    console.log('🔍 Starting MRI/CT scan analysis:', request);
    
    const formData = new FormData();
    formData.append('record_id', request.record_id);
    formData.append('patient_id', request.patient_id);
    formData.append('scan_type', request.scan_type);
    formData.append('doctor_access', request.doctor_access?.toString() || 'false');
    
    if (request.image_url) {
      formData.append('image_url', request.image_url);
    }
    
    if (request.image_file) {
      formData.append('image_file', request.image_file);
    }
    
    const response = await fetch(`${API_BASE_URL}/analyze/mri-ct-scan/`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ MRI/CT scan analysis completed:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error analyzing MRI/CT scan:', error);
    throw error;
  }
}

/**
 * Get MRI/CT analysis for a specific record
 */
export async function getMRICTAnalysis(recordId: string): Promise<MRI_CT_Analysis> {
  try {
    console.log('🔍 Fetching MRI/CT analysis for record:', recordId);
    
    const response = await fetch(`${API_BASE_URL}/mri-ct-analysis/${recordId}/`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Analysis not found for this record');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ MRI/CT analysis retrieved:', result);
    
    return result.analysis;
  } catch (error) {
    console.error('❌ Error fetching MRI/CT analysis:', error);
    throw error;
  }
}

/**
 * List MRI/CT analyses for a patient
 */
export async function listMRICTAnalyses(patientId: string, scanType?: string): Promise<MRI_CT_AnalysisListResponse> {
  try {
    console.log('🔍 Listing MRI/CT analyses for patient:', patientId);
    
    const params = new URLSearchParams({ patient_id: patientId });
    if (scanType) {
      params.append('scan_type', scanType);
    }
    
    const response = await fetch(`${API_BASE_URL}/mri-ct-analyses/?${params}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ MRI/CT analyses listed:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error listing MRI/CT analyses:', error);
    throw error;
  }
}

/**
 * Update doctor access permission for MRI/CT analysis
 */
export async function updateDoctorAccess(recordId: string, doctorAccess: boolean): Promise<MRI_CT_Analysis> {
  try {
    console.log('🔍 Updating doctor access for record:', recordId, 'to:', doctorAccess);
    
    const response = await fetch(`${API_BASE_URL}/mri-ct-analysis/${recordId}/doctor-access/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ doctor_access: doctorAccess }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Doctor access updated:', result);
    
    return result.analysis;
  } catch (error) {
    console.error('❌ Error updating doctor access:', error);
    throw error;
  }
}

/**
 * Check if a record has MRI/CT analysis
 */
export async function hasMRICTAnalysis(recordId: string): Promise<boolean> {
  try {
    await getMRICTAnalysis(recordId);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get risk level color for UI display
 */
export function getRiskLevelColor(riskLevel: string): string {
  switch (riskLevel.toLowerCase()) {
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'moderate':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Get scan type icon for UI display
 */
export function getScanTypeIcon(scanType: string): string {
  switch (scanType.toUpperCase()) {
    case 'MRI':
      return '🧠';
    case 'CT':
      return '🩻';
    case 'XRAY':
      return '📷';
    default:
      return '🔬';
  }
}
