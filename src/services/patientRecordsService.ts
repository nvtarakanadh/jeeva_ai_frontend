// Supabase removed - using Django API only

export interface PatientRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  recordType: 'health_record' | 'prescription' | 'consultation_note';
  title: string;
  description: string;
  fileUrl?: string;
  fileName?: string;
  recordDate: Date;
  createdAt: Date;
  doctorId: string;
  doctorName: string;
}

export const getPatientRecordsForDoctor = async (doctorId: string): Promise<PatientRecord[]> => {
  try {
    console.log('🔍 getPatientRecordsForDoctor called with doctorId:', doctorId);
    
    // Get all patients that this doctor has access to view
    const { data: access, error: accessError } = await supabase
      .from('patient_access')
      .select(`
        patient_id,
        access_type,
        profiles!patient_access_patient_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('doctor_id', doctorId)
      .eq('status', 'active')
      .or('access_type.eq.view_records,access_type.eq.all');

    console.log('📋 Patient access query result:', { access, accessError });

    if (accessError) {
      // If table doesn't exist, return empty array
      if (accessError.message.includes('Could not find the table') || accessError.message.includes('relation') || accessError.message.includes('does not exist')) {
        console.warn('Patient access table does not exist yet. Returning empty array.');
        return [];
      }
      throw accessError;
    }

    if (!access || access.length === 0) {
      console.warn('No patient access found for doctor. This could mean the patient_access table doesn\'t exist or no patients have granted access.');
      return [];
    }

    const patientIds = access.map(acc => acc.patient_id);
    const patientMap = new Map();
    access.forEach(acc => {
      patientMap.set(acc.patient_id, acc.profiles);
    });

    // Get health records for these patients (using user_id from profiles)
    const { data: patientProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id')
      .in('id', patientIds);

    if (profileError) {
      console.warn('Error fetching patient profiles:', profileError);
      return [];
    }

    const patientUserIds = patientProfiles?.map(p => p.user_id) || [];
    console.log('🔍 Patient user IDs for health records:', patientUserIds);

    const { data: healthRecords, error: healthError } = await supabase
      .from('health_records')
      .select('*')
      .in('user_id', patientUserIds)
      .order('created_at', { ascending: false });

    console.log('🔍 Health records query result:', { healthRecords, healthError });

    if (healthError) {
      // If table doesn't exist, continue with empty array
      if (healthError.message.includes('Could not find the table') || healthError.message.includes('relation') || healthError.message.includes('does not exist')) {
        console.warn('Health records table does not exist yet. Skipping health records.');
      } else {
        throw healthError;
      }
    }

    // Get prescriptions for these patients
    const { data: prescriptions, error: prescriptionError } = await supabase
      .from('prescriptions')
      .select(`
        *,
        profiles!prescriptions_doctor_id_fkey (
          full_name
        )
      `)
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false });

    if (prescriptionError) {
      // If table doesn't exist, continue with empty array
      if (prescriptionError.message.includes('Could not find the table') || prescriptionError.message.includes('relation') || prescriptionError.message.includes('does not exist')) {
        console.warn('Prescriptions table does not exist yet. Skipping prescriptions.');
      } else {
        throw prescriptionError;
      }
    }

    // Get consultation notes for these patients
    const { data: consultationNotes, error: noteError } = await supabase
      .from('consultation_notes')
      .select(`
        *,
        profiles!consultation_notes_doctor_id_fkey (
          full_name
        )
      `)
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false });

    if (noteError) {
      // If table doesn't exist, continue with empty array
      if (noteError.message.includes('Could not find the table') || noteError.message.includes('relation') || noteError.message.includes('does not exist')) {
        console.warn('Consultation notes table does not exist yet. Skipping consultation notes.');
      } else {
        throw noteError;
      }
    }

    // Combine all records
    const allRecords: PatientRecord[] = [];

    // Add health records
    healthRecords?.forEach(record => {
      // Find the profile ID for this user_id
      const patientProfile = patientProfiles?.find(p => p.user_id === record.user_id);
      const patient = patientProfile ? patientMap.get(patientProfile.id) : null;
      
      allRecords.push({
        id: record.id,
        patientId: patientProfile?.id || record.user_id,
        patientName: patient?.full_name || 'Unknown Patient',
        patientEmail: patient?.email || '',
        recordType: record.record_type || 'health_record',
        title: record.title,
        description: record.description,
        fileUrl: record.file_url,
        fileName: record.file_name,
        recordDate: new Date(record.service_date),
        createdAt: new Date(record.created_at),
        doctorId: '',
        doctorName: 'Patient Uploaded'
      });
    });

    // Add prescriptions
    prescriptions?.forEach(prescription => {
      const patient = patientMap.get(prescription.patient_id);
      allRecords.push({
        id: prescription.id,
        patientId: prescription.patient_id,
        patientName: patient?.full_name || 'Unknown Patient',
        patientEmail: patient?.email || '',
        recordType: 'prescription',
        title: prescription.title,
        description: prescription.description,
        fileUrl: prescription.file_url,
        fileName: prescription.file_name,
        recordDate: new Date(prescription.prescription_date),
        createdAt: new Date(prescription.created_at),
        doctorId: prescription.doctor_id,
        doctorName: prescription.profiles?.full_name || 'Unknown Doctor'
      });
    });

    // Add consultation notes
    consultationNotes?.forEach(note => {
      const patient = patientMap.get(note.patient_id);
      allRecords.push({
        id: note.id,
        patientId: note.patient_id,
        patientName: patient?.full_name || 'Unknown Patient',
        patientEmail: patient?.email || '',
        recordType: 'consultation_note',
        title: note.title,
        description: note.description,
        fileUrl: note.file_url,
        fileName: note.file_name,
        recordDate: new Date(note.consultation_date),
        createdAt: new Date(note.created_at),
        doctorId: note.doctor_id,
        doctorName: note.profiles?.full_name || 'Unknown Doctor'
      });
    });

    // Sort by creation date
    return allRecords.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  } catch (error) {
    console.error('Error fetching patient records for doctor:', error);
    throw error;
  }
};

export const getPatientRecordsByPatient = async (patientId: string, doctorId: string): Promise<PatientRecord[]> => {
  try {
    // Check if doctor has consent to view this patient's records
    const { data: consent, error: consentError } = await supabase
      .from('consent_requests')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .eq('status', 'approved')
      .single();

    if (consentError || !consent) {
      throw new Error('No consent to view patient records');
    }

    // Get patient info
    const { data: patient, error: patientError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', patientId)
      .single();

    if (patientError) throw patientError;

    // Get all records for this patient
    const records = await getPatientRecordsForDoctor(doctorId);
    return records.filter(record => record.patientId === patientId);

  } catch (error) {
    console.error('Error fetching patient records by patient:', error);
    throw error;
  }
};
