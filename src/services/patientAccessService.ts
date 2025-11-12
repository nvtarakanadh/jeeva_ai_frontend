// Supabase removed - using Django API only

export interface PatientAccess {
  id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_email: string;
  access_type: 'view_records' | 'view_prescriptions' | 'view_consultation_notes' | 'all';
  granted_at: string;
  expires_at?: string;
  status: 'active' | 'revoked' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface AccessRequest {
  id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_email: string;
  requested_access: string[];
  message?: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'denied';
  responded_at?: string;
  response_message?: string;
  expires_at?: string;
}

export const getPatientAccessRequests = async (patientId: string): Promise<AccessRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('access_requests')
      .select(`
        *,
        profiles!access_requests_doctor_id_fkey (
          full_name,
          email
        )
      `)
      .eq('patient_id', patientId)
      .order('requested_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('Could not find the table') || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.warn('Access requests table does not exist yet. Returning empty array.');
        return [];
      }
      throw error;
    }

    return data?.map(request => ({
      ...request,
      doctor_name: request.profiles?.full_name || 'Unknown Doctor',
      doctor_email: request.profiles?.email || '',
      status: request.status as 'pending' | 'approved' | 'denied',
    })) || [];
  } catch (error) {
    console.error('Error fetching access requests:', error);
    throw error;
  }
};

export const getPatientActiveAccess = async (patientId: string): Promise<PatientAccess[]> => {
  try {
    const { data, error } = await supabase
      .from('patient_access')
      .select(`
        *,
        profiles!patient_access_doctor_id_fkey (
          full_name,
          email
        )
      `)
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .order('granted_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('Could not find the table') || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.warn('Patient access table does not exist yet. Returning empty array.');
        return [];
      }
      throw error;
    }

    return data?.map(access => ({
      ...access,
      doctor_name: access.profiles?.full_name || 'Unknown Doctor',
      doctor_email: access.profiles?.email || '',
      access_type: access.access_type as 'view_records' | 'view_prescriptions' | 'view_consultation_notes' | 'all',
      status: access.status as 'active' | 'revoked' | 'expired',
    })) || [];
  } catch (error) {
    console.error('Error fetching patient access:', error);
    throw error;
  }
};

export const respondToAccessRequest = async (
  requestId: string, 
  response: 'approved' | 'denied',
  responseMessage?: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('access_requests')
      .update({
        status: response,
        responded_at: new Date().toISOString(),
        response_message: responseMessage
      })
      .eq('id', requestId);

    if (error) throw error;

    // If approved, create patient access record
    if (response === 'approved') {
      const { data: request, error: requestError } = await supabase
        .from('access_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Create access records for each requested access type
      for (const accessType of request.requested_access) {
        const { error: accessError } = await supabase
          .from('patient_access')
          .insert({
            patient_id: request.patient_id,
            doctor_id: request.doctor_id,
            access_type: accessType,
            granted_at: new Date().toISOString(),
            expires_at: request.expires_at,
            status: 'active'
          });

        if (accessError) throw accessError;
      }
    }
  } catch (error) {
    console.error('Error responding to access request:', error);
    throw error;
  }
};

export const revokePatientAccess = async (accessId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('patient_access')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('id', accessId);

    if (error) throw error;
  } catch (error) {
    console.error('Error revoking patient access:', error);
    throw error;
  }
};

export const createAccessRequest = async (requestData: {
  patient_id: string;
  doctor_id: string;
  requested_access: string[];
  message?: string;
  expires_at?: string;
}): Promise<void> => {
  try {
    const { error } = await supabase
      .from('access_requests')
      .insert({
        ...requestData,
        requested_at: new Date().toISOString(),
        status: 'pending'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating access request:', error);
    throw error;
  }
};
