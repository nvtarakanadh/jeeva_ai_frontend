// Supabase removed - using Django API only
import { createHealthRecordUploadNotification } from './notificationService';

export interface HealthRecord {
  id: string;
  title: string;
  description: string | null;
  record_type: string;
  service_date: string;
  provider_name: string | null;
  file_name: string | null;
  file_url: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface HealthRecordSummary {
  totalRecords: number;
  recentRecords: HealthRecord[];
  recordTypes: { [key: string]: number };
}

export const getHealthRecords = async (userId: string): Promise<HealthRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('user_id', userId)
      .order('service_date', { ascending: false });

    if (error) {
      console.error('Error fetching health records:', error);
      throw error;
    }

    return data || [];
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
    
    const { data, error } = await supabase
      .from('health_records')
      .insert(recordData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating health record:', error);
      throw error;
    }

    console.log('✅ Health record created successfully:', data.id);

    // Get patient profile info for notification
    console.log('🔍 Looking up patient profile for user_id:', recordData.user_id);
    const { data: patientProfile, error: patientError } = await supabase
      .from('profiles')
      .select('full_name, id')
      .eq('user_id', recordData.user_id)
      .single();

    console.log('🔍 Patient profile lookup result:', { patientProfile, patientError });

    if (patientProfile && !patientError) {
      console.log('✅ Patient profile found:', patientProfile);
      
      // Find assigned doctors for this patient
      console.log('🔍 Looking up assigned doctors for patient_id:', recordData.user_id);
      const { data: assignedDoctors, error: doctorsError } = await supabase
        .from('patient_access')
        .select(`
          doctor_id,
          profiles!patient_access_doctor_id_fkey (
            user_id,
            full_name
          )
        `)
        .eq('patient_id', recordData.user_id)
        .eq('status', 'active');

      console.log('🔍 Assigned doctors lookup result:', { assignedDoctors, doctorsError });

      if (assignedDoctors && !doctorsError) {
        console.log(`✅ Found ${assignedDoctors.length} assigned doctors:`, assignedDoctors);
        
        // Send notification to each assigned doctor
        for (const assignment of assignedDoctors) {
          if (assignment.profiles?.user_id) {
            console.log('🔔 Sending notification to doctor:', {
              doctor_user_id: assignment.profiles.user_id,
              doctor_profile_id: assignment.doctor_id,
              patient_name: patientProfile.full_name,
              record_title: recordData.title
            });
            
            try {
              const notificationId = await createHealthRecordUploadNotification(
                assignment.profiles.user_id,
                assignment.doctor_id,
                patientProfile.full_name,
                recordData.title
              );
              console.log('✅ Notification sent successfully with ID:', notificationId);
            } catch (notificationError) {
              console.error('❌ Failed to send notification:', notificationError);
            }
          } else {
            console.log('⚠️ Doctor profile missing user_id:', assignment);
          }
        }
      } else {
        console.log('⚠️ No assigned doctors found or error:', doctorsError);
        console.log('💡 This means the patient has no active doctor assignments in patient_access table');
      }
    } else {
      console.log('⚠️ Patient profile not found or error:', patientError);
      console.log('💡 This means the patient profile does not exist in profiles table');
    }

    return data;
  } catch (error) {
    console.error('❌ Error in createHealthRecord:', error);
    throw error;
  }
};
