// Supabase removed - using Django API only

export interface Doctor {
  id: string;
  name: string;
  specialization?: string;
  hospital?: string;
  email?: string;
  phone?: string;
}

export const getDoctors = async (): Promise<Doctor[]> => {
  try {
    console.log('🔍 Fetching doctors from Supabase...');
    
    const { data: doctors, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, specialization, hospital_affiliation, email, phone')
      .eq('role', 'doctor')
      .not('full_name', 'is', null)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching doctors:', error);
      throw error;
    }

    console.log('🔍 Raw doctors data from Supabase:', doctors);

    if (!doctors || doctors.length === 0) {
      console.warn('⚠️ No doctors found in database. This might be because:');
      console.warn('1. No doctor profiles have been created yet');
      console.warn('2. The profiles table is empty');
      console.warn('3. RLS policies are blocking access');
      console.warn('4. The role column filtering is not working');
      
      // Return sample doctors as fallback for development
      console.log('🔄 Returning sample doctors for development...');
      return [
        {
          id: 'sample-doc-1',
          name: 'Dr. Sarah Johnson',
          specialization: 'Cardiology',
          hospital: 'City General Hospital',
          email: 'sarah.johnson@hospital.com',
          phone: '+1-555-0101'
        },
        {
          id: 'sample-doc-2',
          name: 'Dr. Michael Chen',
          specialization: 'Neurology',
          hospital: 'City General Hospital',
          email: 'michael.chen@hospital.com',
          phone: '+1-555-0102'
        },
        {
          id: 'sample-doc-3',
          name: 'Dr. Emily Rodriguez',
          specialization: 'Dermatology',
          hospital: 'Medical Center',
          email: 'emily.rodriguez@hospital.com',
          phone: '+1-555-0103'
        },
        {
          id: 'sample-doc-4',
          name: 'Dr. David Thompson',
          specialization: 'General Medicine',
          hospital: 'Community Health Center',
          email: 'david.thompson@hospital.com',
          phone: '+1-555-0104'
        }
      ];
    }

    const formattedDoctors: Doctor[] = doctors.map((doctor) => ({
      id: doctor.id, // Use profile id as the ID
      name: doctor.full_name || 'Dr. Unknown',
      specialization: doctor.specialization || 'General Medicine',
      hospital: doctor.hospital_affiliation || 'General Hospital',
      email: doctor.email,
      phone: doctor.phone
    }));

    console.log('🔍 Formatted doctors:', formattedDoctors);
    return formattedDoctors;
  } catch (error) {
    console.error('❌ Error in getDoctors service:', error);
    throw error;
  }
};

export const getDoctorById = async (doctorId: string): Promise<Doctor | null> => {
  try {
    const { data: doctor, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, specialization, hospital_affiliation, email, phone')
      .eq('id', doctorId)
      .eq('role', 'doctor')
      .single();

    if (error) {
      console.error('❌ Error fetching doctor by ID:', error);
      return null;
    }

    if (!doctor) {
      return null;
    }

    return {
      id: doctor.id,
      name: doctor.full_name || 'Dr. Unknown',
      specialization: doctor.specialization || 'General Medicine',
      hospital: doctor.hospital_affiliation || 'General Hospital',
      email: doctor.email,
      phone: doctor.phone
    };
  } catch (error) {
    console.error('❌ Error in getDoctorById service:', error);
    return null;
  }
};
