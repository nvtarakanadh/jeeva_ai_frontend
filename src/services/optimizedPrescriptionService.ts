// Supabase removed - using Django API only
import { cacheService, createCacheKey, CACHE_TTL } from './cacheService';
import { Prescription } from './prescriptionService';

export interface PatientForPrescription {
  id: string;
  full_name: string | null;
  email: string | null;
}

// Optimized prescription fetching with caching
export const getOptimizedPrescriptionsForDoctor = async (doctorProfileId: string): Promise<Prescription[]> => {
  const cacheKey = createCacheKey('prescriptions-doctor', doctorProfileId);
  
  // Check cache first
  const cached = cacheService.get<Prescription[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Optimized query with specific fields and joins
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        id,
        title,
        description,
        medication,
        dosage,
        frequency,
        duration,
        instructions,
        prescription_date,
        created_at,
        updated_at,
        file_url,
        patient_id,
        profiles!prescriptions_patient_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('doctor_id', doctorProfileId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Cache the result
    cacheService.set(cacheKey, data || [], CACHE_TTL.MEDIUM);
    
    return data || [];
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return [];
  }
};

// Optimized patient fetching for prescriptions
export const getOptimizedPatientsForDoctor = async (doctorProfileId: string): Promise<PatientForPrescription[]> => {
  const cacheKey = createCacheKey('patients-for-prescriptions', doctorProfileId);
  
  const cached = cacheService.get<PatientForPrescription[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Get patients who have active access with this doctor
    // Using a distinct query to avoid duplicate patient_access entries
    const { data, error } = await supabase
      .from('patient_access')
      .select(`
        patient_id,
        profiles!patient_access_patient_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('doctor_id', doctorProfileId)
      .eq('status', 'active');

    if (error) throw error;

    // Create a Map to ensure we only have unique patients by patient_id
    const uniquePatientsMap = new Map();
    
    (data as any)?.forEach((access: any) => {
      if (access.patient_id && !uniquePatientsMap.has(access.patient_id)) {
        uniquePatientsMap.set(access.patient_id, {
          id: access.patient_id,
          full_name: access.profiles?.full_name,
          email: access.profiles?.email
        });
      }
    });

    const uniquePatients = Array.from(uniquePatientsMap.values()) as PatientForPrescription[];

    // Cache the result
    cacheService.set(cacheKey, uniquePatients, CACHE_TTL.LONG);
    
    return uniquePatients;
  } catch (error) {
    console.error('Error fetching patients:', error);
    return [];
  }
};

// Clear prescription cache when data changes
export const clearPrescriptionCache = (doctorProfileId: string) => {
  cacheService.clearPattern(`prescriptions-doctor:${doctorProfileId}`);
  cacheService.clearPattern(`patients-for-prescriptions:${doctorProfileId}`);
};
