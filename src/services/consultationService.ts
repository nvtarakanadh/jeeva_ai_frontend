// Supabase removed - using Django API only
import { 
  createConsultationNoteNotification, 
  createConsultationBookedNotification,
  createConsultationUpdatedNotification,
  createConsultationUpdatedForDoctorNotification
} from './notificationService';

export interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  consultation_date: string;
  consultation_time: string;
  reason: string;
  notes?: string;
  status: 'scheduled' | 'confirmed' | 'scheduled_no_consent' | 'completed' | 'cancelled';
  consent_id?: string;
  shared_records?: string[];
  created_at: string;
  updated_at: string;
  patient?: {
    full_name: string;
    email: string;
  };
  doctor?: {
    full_name: string;
    specialization: string;
    hospital_affiliation: string;
  };
}

export interface ConsultationBookingData {
  patient_id: string;
  doctor_id: string;
  consultation_date: string;
  consultation_time: string;
  reason: string;
  notes?: string;
}

export const createConsultation = async (bookingData: ConsultationBookingData): Promise<Consultation> => {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .insert([bookingData])
      .select(`
        *,
        patient:profiles!consultations_patient_id_fkey (
          full_name,
          email
        ),
        doctor:profiles!consultations_doctor_id_fkey (
          full_name,
          specialization,
          hospital_affiliation
        )
      `)
      .single();

    if (error) throw error;

    // Get doctor user_id for notification
    const { data: doctorUser, error: doctorUserError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', bookingData.doctor_id)
      .single();

    // Create notification for doctor about new consultation booking
    if (doctorUser && !doctorUserError) {
      await createConsultationBookedNotification(
        doctorUser.user_id,
        bookingData.doctor_id,
        data.patient?.full_name || 'Patient',
        bookingData.consultation_date
      );
    }

    return data;
  } catch (error) {
    console.error('Error creating consultation:', error);
    throw error;
  }
};

export const getPatientConsultations = async (patientId: string): Promise<Consultation[]> => {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        *,
        doctor:profiles!consultations_doctor_id_fkey (
          full_name,
          specialization,
          hospital_affiliation
        )
      `)
      .eq('patient_id', patientId)
      .order('consultation_date', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('Could not find the table') || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.warn('Consultations table does not exist yet. Returning empty array.');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching patient consultations:', error);
    throw error;
  }
};

export const getDoctorConsultations = async (doctorId: string): Promise<Consultation[]> => {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        *,
        patient:profiles!consultations_patient_id_fkey (
          full_name,
          email
        )
      `)
      .eq('doctor_id', doctorId)
      .order('consultation_date', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('Could not find the table') || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.warn('Consultations table does not exist yet. Returning empty array.');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching doctor consultations:', error);
    throw error;
  }
};

export const updateConsultationStatus = async (
  consultationId: string, 
  status: Consultation['status'],
  consentId?: string
): Promise<Consultation> => {
  try {
    const updateData: any = { status };
    if (consentId) {
      updateData.consent_id = consentId;
    }

    const { data, error } = await supabase
      .from('consultations')
      .update(updateData)
      .eq('id', consultationId)
      .select(`
        *,
        patient:profiles!consultations_patient_id_fkey (
          full_name,
          email,
          user_id
        ),
        doctor:profiles!consultations_doctor_id_fkey (
          full_name,
          specialization,
          hospital_affiliation,
          user_id
        )
      `)
      .single();

    if (error) throw error;

    // Send notifications for consultation updates
    if (data.patient?.user_id && data.doctor?.user_id) {
      // Notify patient about consultation update
      await createConsultationUpdatedNotification(
        data.patient.user_id,
        data.patient_id,
        data.doctor.full_name,
        data.consultation_date
      );

      // Notify doctor about consultation update
      await createConsultationUpdatedForDoctorNotification(
        data.doctor.user_id,
        data.doctor_id,
        data.patient.full_name,
        data.consultation_date
      );
    }

    return data;
  } catch (error) {
    console.error('Error updating consultation status:', error);
    throw error;
  }
};

export const getConsultationById = async (consultationId: string): Promise<Consultation> => {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        *,
        patient:profiles!consultations_patient_id_fkey (
          full_name,
          email
        ),
        doctor:profiles!consultations_doctor_id_fkey (
          full_name,
          specialization,
          hospital_affiliation
        )
      `)
      .eq('id', consultationId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching consultation:', error);
    throw error;
  }
};

export const cancelConsultation = async (consultationId: string): Promise<Consultation> => {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .update({ status: 'cancelled' })
      .eq('id', consultationId)
      .select(`
        *,
        patient:profiles!consultations_patient_id_fkey (
          full_name,
          email
        ),
        doctor:profiles!consultations_doctor_id_fkey (
          full_name,
          specialization,
          hospital_affiliation
        )
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error cancelling consultation:', error);
    throw error;
  }
};
