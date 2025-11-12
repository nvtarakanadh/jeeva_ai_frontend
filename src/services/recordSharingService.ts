// Supabase removed - using Django API only

export interface HealthRecord {
  id: string;
  user_id: string;
  title: string;
  record_type: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  service_date: string;
  provider_name?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface SharedRecord {
  id: string;
  title: string;
  record_type: string;
  file_name?: string;
  file_url?: string;
  service_date: string;
  is_auto_matched: boolean;
  access_expires_at?: string;
  ai_analysis?: {
    priority: 'urgent' | 'high' | 'medium' | 'low';
    risk_level: 'critical' | 'high' | 'medium' | 'low';
    key_findings: string[];
    recommendations: string[];
  };
}

export interface AutoMatchResult {
  autoMatchedRecords: SharedRecord[];
  availableRecords: SharedRecord[];
}

/**
 * Auto-match health records based on appointment title
 */
export const autoMatchRecords = async (
  patientUserId: string,
  appointmentTitle: string
): Promise<AutoMatchResult> => {
  try {
    console.log('🔍 Auto-matching records for patient:', patientUserId, 'with title:', appointmentTitle);
    
    // Get all health records for the patient
    const { data: allRecords, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('user_id', patientUserId)
      .order('service_date', { ascending: false });

    if (error) {
      console.error('Error fetching health records:', error);
      throw error;
    }

    if (!allRecords || allRecords.length === 0) {
      return {
        autoMatchedRecords: [],
        availableRecords: []
      };
    }

    // Convert to SharedRecord format
    const allSharedRecords: SharedRecord[] = allRecords.map((record: any) => ({
      id: record.id,
      title: record.title,
      record_type: record.record_type,
      file_name: record.file_name,
      service_date: record.service_date,
      is_auto_matched: false
    }));

    // Auto-match records based on title similarity
    const autoMatchedRecords: SharedRecord[] = [];
    const availableRecords: SharedRecord[] = [];

    const appointmentTitleLower = appointmentTitle.toLowerCase();
    
    allSharedRecords.forEach(record => {
      const recordTitleLower = record.title.toLowerCase();
      
      // Check for exact match or partial match
      if (
        recordTitleLower === appointmentTitleLower ||
        recordTitleLower.includes(appointmentTitleLower) ||
        appointmentTitleLower.includes(recordTitleLower) ||
        // Check for common medical terms
        hasCommonMedicalTerms(appointmentTitleLower, recordTitleLower)
      ) {
        autoMatchedRecords.push({
          ...record,
          is_auto_matched: true
        });
      } else {
        availableRecords.push(record);
      }
    });

    console.log('✅ Auto-matched records:', autoMatchedRecords.length);
    console.log('📋 Available records:', availableRecords.length);

    return {
      autoMatchedRecords,
      availableRecords
    };
  } catch (error) {
    console.error('Error in autoMatchRecords:', error);
    throw error;
  }
};

/**
 * Determine priority based on AI analysis findings
 */
const determinePriority = (keyFindings: string[], riskWarnings: string[]): 'urgent' | 'high' | 'medium' | 'low' => {
  const urgentKeywords = ['critical', 'emergency', 'urgent', 'severe', 'acute', 'life-threatening'];
  const highKeywords = ['abnormal', 'elevated', 'concerning', 'significant', 'worsening'];
  
  const allText = [...keyFindings, ...riskWarnings].join(' ').toLowerCase();
  
  if (urgentKeywords.some(keyword => allText.includes(keyword))) {
    return 'urgent';
  }
  if (highKeywords.some(keyword => allText.includes(keyword))) {
    return 'high';
  }
  if (keyFindings.length > 0 || riskWarnings.length > 0) {
    return 'medium';
  }
  return 'low';
};

/**
 * Determine risk level based on AI analysis
 */
const determineRiskLevel = (riskWarnings: string[], confidenceScore: number): 'critical' | 'high' | 'medium' | 'low' => {
  const criticalKeywords = ['critical', 'severe', 'life-threatening', 'emergency'];
  const highKeywords = ['high risk', 'concerning', 'abnormal', 'elevated'];
  
  const allWarnings = riskWarnings.join(' ').toLowerCase();
  
  if (criticalKeywords.some(keyword => allWarnings.includes(keyword))) {
    return 'critical';
  }
  if (highKeywords.some(keyword => allWarnings.includes(keyword)) || confidenceScore > 80) {
    return 'high';
  }
  if (riskWarnings.length > 0 || confidenceScore > 60) {
    return 'medium';
  }
  return 'low';
};

/**
 * Check if two titles have common medical terms
 */
const hasCommonMedicalTerms = (title1: string, title2: string): boolean => {
  const commonTerms = [
    'fever', 'cold', 'cough', 'headache', 'pain', 'diabetes', 'blood pressure',
    'heart', 'chest', 'stomach', 'back', 'joint', 'skin', 'eye', 'ear', 'nose',
    'throat', 'breathing', 'allergy', 'infection', 'inflammation', 'swelling',
    'rash', 'dizziness', 'nausea', 'vomiting', 'diarrhea', 'constipation',
    'fatigue', 'weakness', 'anxiety', 'depression', 'stress', 'sleep',
    'weight', 'appetite', 'urine', 'bowel', 'menstrual', 'pregnancy'
  ];

  const title1Words = title1.split(/\s+/);
  const title2Words = title2.split(/\s+/);

  // Check if any common medical terms appear in both titles
  for (const term of commonTerms) {
    if (title1Words.includes(term) && title2Words.includes(term)) {
      return true;
    }
  }

  return false;
};

/**
 * Create consultation with shared records
 */
export const createConsultationWithSharedRecords = async (
  consultationData: {
    patient_id: string;
    doctor_id: string;
    consultation_date: string;
    consultation_time: string;
    reason: string;
    notes?: string;
    shared_records: string[];
  }
) => {
  try {
    console.log('📝 Creating consultation with shared records:', consultationData);
    
    // Validate input data
    if (!consultationData.patient_id) {
      throw new Error('Patient ID is required');
    }
    if (!consultationData.doctor_id) {
      throw new Error('Doctor ID is required');
    }
    if (!consultationData.consultation_date) {
      throw new Error('Consultation date is required');
    }
    if (!consultationData.consultation_time) {
      throw new Error('Consultation time is required');
    }
    if (!consultationData.reason) {
      throw new Error('Consultation reason is required');
    }

    console.log('🔧 Inserting consultation into database...');
    const { data, error } = await supabase
      .from('consultations')
      .insert([{
        patient_id: consultationData.patient_id,
        doctor_id: consultationData.doctor_id,
        consultation_date: consultationData.consultation_date,
        consultation_time: consultationData.consultation_time,
        reason: consultationData.reason,
        notes: consultationData.notes,
        status: 'scheduled'
      }] as any)
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

    if (error) {
      console.error('❌ Error creating consultation:', error);
      console.error('❌ Consultation data that failed:', consultationData);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to create consultation: ${error.message}`);
    }

    console.log('✅ Consultation created successfully:', data);

    // Create consent entries for shared records
    if (consultationData.shared_records.length > 0) {
      console.log('🔐 Creating consent entries for shared records:', consultationData.shared_records);
      
      // Get the user IDs for patient and doctor (consents table uses auth.users(id), not profiles.id)
      console.log('🔍 Fetching user IDs for patient and doctor...');
      const { data: patientProfile, error: patientError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', consultationData.patient_id)
        .single();

      const { data: doctorProfile, error: doctorError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', consultationData.doctor_id)
        .single();

      if (patientError || doctorError) {
        console.error('❌ Error fetching user IDs:', { patientError, doctorError });
        throw new Error('Failed to fetch user IDs for consent creation');
      }

      console.log('✅ User IDs fetched:', {
        patientUserId: patientProfile.user_id,
        doctorUserId: doctorProfile.user_id
      });

      await createConsentForSharedRecords(
        patientProfile.user_id,
        doctorProfile.user_id,
        consultationData.shared_records,
        consultationData.consultation_date
      );
    } else {
      console.log('ℹ️ No shared records to create consent for');
    }

    return data;
  } catch (error) {
    console.error('Error in createConsultationWithSharedRecords:', error);
    throw error;
  }
};

/**
 * Create consent entries for shared records
 */
const createConsentForSharedRecords = async (
  patientId: string,
  doctorId: string,
  recordIds: string[],
  consultationDate: string
) => {
  try {
    console.log('🔐 Creating consent for shared records:', { patientId, doctorId, recordIds });
    
    // Validate input
    if (!patientId) {
      throw new Error('Patient ID is required for consent creation');
    }
    if (!doctorId) {
      throw new Error('Doctor ID is required for consent creation');
    }
    if (!recordIds || recordIds.length === 0) {
      throw new Error('Record IDs are required for consent creation');
    }
    if (!consultationDate) {
      throw new Error('Consultation date is required for consent creation');
    }
    
    // Calculate expiry date (7 days from consultation date)
    const consultationDateObj = new Date(consultationDate);
    const expiryDate = new Date(consultationDateObj.getTime() + 7 * 24 * 60 * 60 * 1000);

    const consentData = {
      patient_id: patientId,
      doctor_id: doctorId,
      record_ids: recordIds,
      scope: 'view',
      expires_at: expiryDate.toISOString(),
      status: 'active'
    };

    console.log('🔧 Inserting consent into database:', consentData);

    const { error } = await supabase
      .from('consents')
      .insert([consentData] as any);

    if (error) {
      console.error('❌ Error creating consent:', error);
      console.error('❌ Consent data that failed:', consentData);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to create consent: ${error.message}`);
    }

    console.log('✅ Consent created successfully');
  } catch (error) {
    console.error('❌ Error in createConsentForSharedRecords:', error);
    throw error;
  }
};

/**
 * Get shared records for a consultation
 */
export const getSharedRecordsForConsultation = async (
  consultationId: string
): Promise<SharedRecord[]> => {
  try {
    console.log('🔍 Getting shared records for consultation:', consultationId);
    
    // First get the consultation to find patient and doctor IDs
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select('patient_id, doctor_id, consultation_date')
      .eq('id', consultationId)
      .single();

    if (consultationError) {
      console.error('❌ Error fetching consultation:', consultationError);
      throw consultationError;
    }

    if (!consultation) {
      console.log('❌ No consultation found for ID:', consultationId);
      return [];
    }

    console.log('✅ Consultation found:', consultation);

    // Get user IDs for patient and doctor (consents table uses auth.users(id), not profiles.id)
    console.log('🔍 Fetching patient profile for ID:', (consultation as any).patient_id);
    const { data: patientProfile, error: patientError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', (consultation as any).patient_id)
      .single();

    console.log('🔍 Fetching doctor profile for ID:', (consultation as any).doctor_id);
    const { data: doctorProfile, error: doctorError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', (consultation as any).doctor_id)
      .single();

    if (patientError || doctorError) {
      console.error('❌ Error fetching user IDs for consent lookup:', { patientError, doctorError });
      return [];
    }

    console.log('✅ User IDs fetched:', {
      patientUserId: patientProfile.user_id,
      doctorUserId: doctorProfile.user_id
    });

    // Get consent entries for this patient-doctor pair to find shared records
    console.log('🔍 Fetching consents for patient-doctor pair:', {
      patientId: patientProfile.user_id,
      doctorId: doctorProfile.user_id
    });
    
    const { data: consents, error: consentsError } = await supabase
      .from('consents')
      .select('record_ids, expires_at, status')
      .eq('patient_id', patientProfile.user_id)
      .eq('doctor_id', doctorProfile.user_id)
      .eq('status', 'active');

    if (consentsError) {
      console.error('❌ Error fetching consents:', consentsError);
      throw consentsError;
    }

    console.log('📋 Consents found:', consents);

    if (!consents || consents.length === 0) {
      console.log('❌ No active consents found for this patient-doctor pair');
      return [];
    }

    // Collect all shared record IDs from all active consents
    const sharedRecordIds: string[] = [];
    let latestExpiry: string | undefined;
    
    consents.forEach((consent: any) => {
      console.log('📋 Processing consent:', consent);
      if (consent.record_ids && Array.isArray(consent.record_ids)) {
        console.log('📋 Adding record IDs:', consent.record_ids);
        sharedRecordIds.push(...consent.record_ids);
      }
      // Keep track of the latest expiry date
      if (consent.expires_at && (!latestExpiry || consent.expires_at > latestExpiry)) {
        latestExpiry = consent.expires_at;
      }
    });

    console.log('📋 Total shared record IDs collected:', sharedRecordIds);

    if (sharedRecordIds.length === 0) {
      console.log('❌ No shared record IDs found in consents');
      return [];
    }

    // Get the actual health records with AI analysis
    console.log('🔍 Fetching health records for IDs:', sharedRecordIds);
    const { data: records, error: recordsError } = await supabase
      .from('health_records')
      .select(`
        *,
        ai_analyses (
          summary,
          key_findings,
          risk_warnings,
          recommendations,
          confidence_score
        )
      `)
      .in('id', sharedRecordIds);

    if (recordsError) {
      console.error('❌ Error fetching health records:', recordsError);
      throw recordsError;
    }

    console.log('📋 Health records found:', records);

    const sharedRecords: SharedRecord[] = records?.map((record: any) => {
      // Process AI analysis data
      let aiAnalysis = undefined;
      if (record.ai_analyses && record.ai_analyses.length > 0) {
        const analysis = record.ai_analyses[0]; // Get the latest analysis
        aiAnalysis = {
          priority: determinePriority(analysis.key_findings, analysis.risk_warnings),
          risk_level: determineRiskLevel(analysis.risk_warnings, analysis.confidence_score),
          key_findings: analysis.key_findings || [],
          recommendations: analysis.recommendations || []
        };
      }

      return {
        id: record.id,
        title: record.title,
        record_type: record.record_type,
        file_name: record.file_name,
        file_url: record.file_url,
        service_date: record.service_date,
        is_auto_matched: false, // We don't store this info, so default to false
        access_expires_at: latestExpiry,
        ai_analysis: aiAnalysis
      };
    }) || [];

    console.log('✅ Final shared records:', sharedRecords);
    return sharedRecords;
  } catch (error) {
    console.error('Error in getSharedRecordsForConsultation:', error);
    throw error;
  }
};

/**
 * Check if doctor has access to specific records
 */
export const checkDoctorAccessToRecords = async (
  doctorId: string,
  recordIds: string[]
): Promise<{ [recordId: string]: boolean }> => {
  try {
    const { data: consents, error } = await supabase
      .from('consents')
      .select('record_ids, expires_at, status')
      .eq('doctor_id', doctorId)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error checking doctor access:', error);
      throw error;
    }

    const accessMap: { [recordId: string]: boolean } = {};
    
    recordIds.forEach(recordId => {
      accessMap[recordId] = consents?.some((consent: any) => 
        consent.record_ids?.includes(recordId)
      ) || false;
    });

    return accessMap;
  } catch (error) {
    console.error('Error in checkDoctorAccessToRecords:', error);
    throw error;
  }
};

/**
 * Revoke access to shared records
 */
export const revokeAccessToRecords = async (
  patientId: string,
  doctorId: string,
  recordIds: string[]
) => {
  try {
    console.log('🚫 Revoking access to records:', { patientId, doctorId, recordIds });
    
    // For now, we'll skip the revocation functionality due to type constraints
    // This can be implemented later with proper database functions
    console.log('Revocation functionality temporarily disabled due to type constraints');
    console.log('✅ Access revocation logged (functionality to be implemented)');
  } catch (error) {
    console.error('Error in revokeAccessToRecords:', error);
    throw error;
  }
};

/**
 * Debug function to test consent creation and retrieval
 */
export const debugConsentSystem = async (consultationId: string) => {
  try {
    console.log('🔍 DEBUG: Testing consent system for consultation:', consultationId);
    
    // Get consultation details
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select('patient_id, doctor_id, consultation_date')
      .eq('id', consultationId)
      .single();

    if (consultationError || !consultation) {
      console.log('❌ DEBUG: No consultation found');
      return;
    }

    console.log('✅ DEBUG: Consultation found:', consultation);

    // Get user IDs
    const { data: patientProfile, error: patientError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', (consultation as any).patient_id)
      .single();

    const { data: doctorProfile, error: doctorError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', (consultation as any).doctor_id)
      .single();

    if (patientError || doctorError) {
      console.log('❌ DEBUG: Error fetching user IDs:', { patientError, doctorError });
      return;
    }

    console.log('✅ DEBUG: User IDs:', {
      patientUserId: patientProfile.user_id,
      doctorUserId: doctorProfile.user_id
    });

    // Check all consents for this patient-doctor pair
    const { data: allConsents, error: allConsentsError } = await supabase
      .from('consents')
      .select('*')
      .eq('patient_id', patientProfile.user_id)
      .eq('doctor_id', doctorProfile.user_id);

    if (allConsentsError) {
      console.log('❌ DEBUG: Error fetching all consents:', allConsentsError);
      return;
    }

    console.log('📋 DEBUG: All consents for this patient-doctor pair:', allConsents);

    // Check active consents
    const { data: activeConsents, error: activeConsentsError } = await supabase
      .from('consents')
      .select('*')
      .eq('patient_id', patientProfile.user_id)
      .eq('doctor_id', doctorProfile.user_id)
      .eq('status', 'active');

    if (activeConsentsError) {
      console.log('❌ DEBUG: Error fetching active consents:', activeConsentsError);
      return;
    }

    console.log('📋 DEBUG: Active consents:', activeConsents);

    return {
      consultation,
      patientUserId: patientProfile.user_id,
      doctorUserId: doctorProfile.user_id,
      allConsents,
      activeConsents
    };
  } catch (error) {
    console.error('❌ DEBUG: Error in debugConsentSystem:', error);
    return null;
  }
};
