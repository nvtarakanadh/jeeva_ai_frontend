// Django API service for health records
import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface HealthRecord {
  id: string;
  title: string;
  description: string | null;
  record_type: string;
  record_date: string | null;
  file_name: string | null;
  file_url: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  patient?: number;
  uploaded_by?: string;
  uploaded_by_profile?: number;
}

export interface HealthRecordSummary {
  totalRecords: number;
  recentRecords: HealthRecord[];
  recordTypes: { [key: string]: number };
}

const getAuthHeaders = () => {
  const token = authService.getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const getHealthRecords = async (userId: string): Promise<HealthRecord[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/health-records/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch health records' }));
      throw new Error(errorData.error || errorData.detail || 'Failed to fetch health records');
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error in getHealthRecords:', error);
    throw error;
  }
};

export const getHealthRecordSummary = async (userId: string): Promise<HealthRecordSummary> => {
  try {
    const records = await getHealthRecords(userId);
    
    const recordTypes: { [key: string]: number } = {};
    records.forEach(record => {
      recordTypes[record.record_type] = (recordTypes[record.record_type] || 0) + 1;
    });

    return {
      totalRecords: records.length,
      recentRecords: records.slice(0, 5), // Last 5 records
      recordTypes
    };
  } catch (error) {
    console.error('Error in getHealthRecordSummary:', error);
    throw error;
  }
};

export const createHealthRecord = async (recordData: Omit<HealthRecord, 'id' | 'created_at' | 'updated_at'>): Promise<HealthRecord> => {
  try {
    console.log('🏥 Starting health record creation with data:', recordData);
    
    // First, upload file if provided
    let fileUrl = recordData.file_url;
    let fileName = recordData.file_name;
    
    // Note: File upload will be handled separately in the component
    // For now, we'll use the file_url if provided
    
    // Prepare record data for API
    const apiData: any = {
      title: recordData.title,
      description: recordData.description || '',
      record_type: recordData.record_type,
      record_date: recordData.record_date || new Date().toISOString(),
      file_url: fileUrl || null,
      file_name: fileName || null,
      tags: recordData.tags || [],
    };
    
    const response = await fetch(`${API_BASE_URL}/api/ai/health-records/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(apiData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create health record' }));
      console.error('❌ Health record creation error:', errorData);
      // Include validation details in error message
      const errorMessage = errorData.error || errorData.detail || 'Failed to create health record';
      const details = errorData.details ? ` Details: ${JSON.stringify(errorData.details)}` : '';
      throw new Error(errorMessage + details);
    }

    const data = await response.json();
    console.log('✅ Health record created successfully:', data.record?.id || data.id);
    
    // Note: Notifications will be handled by the backend or a separate service
    // For now, we'll skip the notification logic that was using Supabase
    
    return data.record || data;
  } catch (error) {
    console.error('❌ Error in createHealthRecord:', error);
    throw error;
  }
};

export const uploadHealthRecordFile = async (file: File): Promise<{ file_url: string; file_name: string; file_size: number }> => {
  try {
    const token = authService.getAccessToken();
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/api/ai/health-records/upload/`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to upload file' }));
      throw new Error(errorData.error || errorData.detail || 'Failed to upload file');
    }

    const data = await response.json();
    // Convert relative URL to absolute URL if needed
    let fileUrl = data.file_url;
    if (fileUrl && fileUrl.startsWith('/')) {
      fileUrl = `${API_BASE_URL}${fileUrl}`;
    }
    
    return {
      file_url: fileUrl,
      file_name: data.file_name,
      file_size: data.file_size,
    };
  } catch (error) {
    console.error('❌ Error in uploadHealthRecordFile:', error);
    throw error;
  }
};

export const deleteHealthRecord = async (recordId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/health-records/${recordId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete health record' }));
      throw new Error(errorData.error || errorData.detail || 'Failed to delete health record');
    }
  } catch (error) {
    console.error('❌ Error in deleteHealthRecord:', error);
    throw error;
  }
};
