// Supabase removed - using Django API only
import { 
  createPrescriptionNotification, 
  createConsultationNoteNotification,
  createPrescriptionUpdatedNotification,
  createConsultationNoteUpdatedNotification
} from './notificationService';

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  description: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  prescription_date: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export interface ConsultationNote {
  id: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  description: string;
  diagnosis: string;
  recommendations: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  consultation_date: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export const createPrescription = async (prescriptionData: {
  patient_id: string;
  doctor_id: string;
  title: string;
  description: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  prescription_date: string;
  file_url?: string;
  file_name?: string;
}): Promise<Prescription> => {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .insert([prescriptionData])
      .select(`
        *,
        profiles!prescriptions_doctor_id_fkey (
          full_name,
          email
        )
      `)
      .single();

    if (error) throw error;

    // Get patient user_id for notification
    const { data: patientUser, error: patientUserError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', prescriptionData.patient_id)
      .single();

    // Create notification for patient about new prescription
    if (patientUser && !patientUserError) {
      await createPrescriptionNotification(
        patientUser.user_id,
        prescriptionData.patient_id,
        data.profiles?.full_name || 'Doctor',
        prescriptionData.title
      );
    }

    return {
      ...data,
      profiles: {
        full_name: data.profiles?.full_name || 'Unknown',
        email: data.profiles?.email || ''
      }
    };
  } catch (error) {
    throw error;
  }
};

export const uploadPrescriptionFile = async (file: File, prescriptionId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${prescriptionId}.${fileExt}`;
    const filePath = `prescriptions/${fileName}`;

    const { data, error } = await supabase.storage
      .from('prescriptions')
      .upload(filePath, file);

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('prescriptions')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    throw error;
  }
};

export const createConsultationNote = async (noteData: {
  patient_id: string;
  doctor_id: string;
  title: string;
  description: string;
  diagnosis: string;
  recommendations: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  consultation_date: string;
  file_url?: string;
  file_name?: string;
}): Promise<ConsultationNote> => {
  try {
    console.log('📝 Creating consultation note with data:', noteData);
    
    const { data, error } = await supabase
      .from('consultation_notes')
      .insert([noteData])
      .select(`
        *,
        profiles!consultation_notes_doctor_id_fkey (
          full_name,
          email
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error creating consultation note:', error);
      throw error;
    }
    
    console.log('✅ Consultation note created successfully:', data.id);

    // Get patient user_id for notification
    console.log('🔍 Looking up patient user for notification...');
    console.log('Patient ID:', noteData.patient_id);
    
    const { data: patientUser, error: patientUserError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', noteData.patient_id)
      .single();

    console.log('Patient user lookup result:', { patientUser, patientUserError });

    // Create notification for patient about new consultation note
    if (patientUser && !patientUserError) {
      console.log('✅ Patient user found, creating notification...');
      console.log('Creating consultation note notification:', {
        patientUserId: patientUser.user_id,
        patientProfileId: noteData.patient_id,
        doctorName: data.profiles?.full_name || 'Doctor',
        noteTitle: noteData.title
      });
      
      const notificationId = await createConsultationNoteNotification(
        patientUser.user_id,
        noteData.patient_id,
        data.profiles?.full_name || 'Doctor',
        noteData.title
      );
      
      console.log('Consultation note notification created:', notificationId);
    } else {
      console.error('❌ Failed to get patient user for notification:', patientUserError);
      console.error('Patient user data:', patientUser);
    }

    return {
      ...data,
      profiles: {
        full_name: data.profiles?.full_name || 'Unknown',
        email: data.profiles?.email || ''
      }
    };
  } catch (error) {
    throw error;
  }
};

export const uploadConsultationNoteFile = async (file: File, noteId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${noteId}.${fileExt}`;
    const filePath = `consultation-notes/${fileName}`;

    const { data, error } = await supabase.storage
      .from('consultation-notes')
      .upload(filePath, file);

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('consultation-notes')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    throw error;
  }
};

export const getPrescriptionsForPatient = async (patientId: string): Promise<Prescription[]> => {
  try {
    
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        profiles!prescriptions_doctor_id_fkey (
          full_name,
          email
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('Could not find the table') || error.message.includes('relation') || error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []).map(item => ({
      ...item,
      profiles: {
        full_name: item.profiles?.full_name || 'Unknown',
        email: item.profiles?.email || ''
      }
    }));
  } catch (error) {
    throw error;
  }
};

export const getConsultationNotesForPatient = async (patientId: string): Promise<ConsultationNote[]> => {
  try {
    const { data, error } = await supabase
      .from('consultation_notes')
      .select(`
        *,
        profiles!consultation_notes_doctor_id_fkey (
          full_name,
          email
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('Could not find the table') || error.message.includes('relation') || error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []).map(item => ({
      ...item,
      profiles: {
        full_name: item.profiles?.full_name || 'Unknown',
        email: item.profiles?.email || ''
      }
    }));
  } catch (error) {
    throw error;
  }
};

export const getPrescriptionsByDoctor = async (doctorId: string): Promise<Prescription[]> => {
  try {
    // First check if doctor has access to view prescriptions
    const { data: access, error: accessError } = await supabase
      .from('patient_access')
      .select('patient_id')
      .eq('doctor_id', doctorId)
      .eq('status', 'active')
      .or('access_type.eq.view_prescriptions,access_type.eq.all');

    if (accessError) throw accessError;

    if (!access || access.length === 0) {
      return [];
    }

    const patientIds = access.map(acc => acc.patient_id);

    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        profiles!prescriptions_patient_id_fkey (
          full_name,
          email
        )
      `)
      .eq('doctor_id', doctorId)
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      profiles: {
        full_name: item.profiles?.full_name || 'Unknown',
        email: item.profiles?.email || ''
      }
    }));
  } catch (error) {
    throw error;
  }
};

export const getConsultationNotesByDoctor = async (doctorId: string): Promise<ConsultationNote[]> => {
  try {
    // First check if doctor has access to view consultation notes
    const { data: access, error: accessError } = await supabase
      .from('patient_access')
      .select('patient_id')
      .eq('doctor_id', doctorId)
      .eq('status', 'active')
      .or('access_type.eq.view_consultation_notes,access_type.eq.all');

    if (accessError) throw accessError;

    if (!access || access.length === 0) {
      return [];
    }

    const patientIds = access.map(acc => acc.patient_id);

    const { data, error } = await supabase
      .from('consultation_notes')
      .select(`
        *,
        profiles!consultation_notes_patient_id_fkey (
          full_name,
          email
        )
      `)
      .eq('doctor_id', doctorId)
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      profiles: {
        full_name: item.profiles?.full_name || 'Unknown',
        email: item.profiles?.email || ''
      }
    }));
  } catch (error) {
    throw error;
  }
};

// Get all prescriptions for a doctor (with access control)
export const getPrescriptionsForDoctor = async (doctorId: string): Promise<Prescription[]> => {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        profiles!prescriptions_patient_id_fkey (
          full_name,
          email
        )
      `)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('Could not find the table') || error.message.includes('relation') || error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []).map(item => ({
      ...item,
      profiles: {
        full_name: item.profiles?.full_name || 'Unknown',
        email: item.profiles?.email || ''
      }
    }));
  } catch (error) {
    throw error;
  }
};

// Get all consultation notes for a doctor (with access control)
export const getConsultationNotesForDoctor = async (doctorId: string): Promise<ConsultationNote[]> => {
  try {
    const { data, error } = await supabase
      .from('consultation_notes')
      .select(`
        *,
        profiles!consultation_notes_patient_id_fkey (
          full_name,
          email
        )
      `)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('Could not find the table') || error.message.includes('relation') || error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []).map(item => ({
      ...item,
      profiles: {
        full_name: item.profiles?.full_name || 'Unknown',
        email: item.profiles?.email || ''
      }
    }));
  } catch (error) {
    throw error;
  }
};

// Update prescription
export const updatePrescription = async (
  prescriptionId: string,
  updateData: Partial<{
    title: string;
    description: string;
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    prescription_date: string;
    file_url?: string;
    file_name?: string;
  }>
): Promise<Prescription> => {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .update(updateData)
      .eq('id', prescriptionId)
      .select(`
        *,
        profiles!prescriptions_doctor_id_fkey (
          full_name,
          email
        )
      `)
      .single();

    if (error) throw error;

    // Get patient user_id for notification
    const { data: patientUser, error: patientUserError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', data.patient_id)
      .single();

    // Create notification for patient about prescription update
    if (patientUser && !patientUserError) {
      await createPrescriptionUpdatedNotification(
        patientUser.user_id,
        data.patient_id,
        data.profiles?.full_name || 'Doctor',
        data.title
      );
    }

    return {
      ...data,
      profiles: {
        full_name: data.profiles?.full_name || 'Unknown',
        email: data.profiles?.email || ''
      }
    };
  } catch (error) {
    throw error;
  }
};

// Update consultation note
export const updateConsultationNote = async (
  noteId: string,
  updateData: Partial<{
    title: string;
    description: string;
    diagnosis: string;
    recommendations: string;
    follow_up_required: boolean;
    follow_up_date?: string;
    consultation_date: string;
    file_url?: string;
    file_name?: string;
  }>
): Promise<ConsultationNote> => {
  try {
    const { data, error } = await supabase
      .from('consultation_notes')
      .update(updateData)
      .eq('id', noteId)
      .select(`
        *,
        profiles!consultation_notes_doctor_id_fkey (
          full_name,
          email
        )
      `)
      .single();

    if (error) throw error;

    // Get patient user_id for notification
    const { data: patientUser, error: patientUserError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', data.patient_id)
      .single();

    // Create notification for patient about consultation note update
    if (patientUser && !patientUserError) {
      await createConsultationNoteUpdatedNotification(
        patientUser.user_id,
        data.patient_id,
        data.profiles?.full_name || 'Doctor',
        data.title
      );
    }

    return {
      ...data,
      profiles: {
        full_name: data.profiles?.full_name || 'Unknown',
        email: data.profiles?.email || ''
      }
    };
  } catch (error) {
    throw error;
  }
};
