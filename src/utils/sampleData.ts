// Sample data for testing the calendar functionality
// You can run this in the browser console to add test patients and consultations

// Supabase removed - using Django API only

export const addSamplePatients = async () => {
  const samplePatients = [
    {
      user_id: 'sample-user-1',
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      role: 'patient'
    },
    {
      user_id: 'sample-user-2',
      full_name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+1234567891',
      role: 'patient'
    },
    {
      user_id: 'sample-user-3',
      full_name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      phone: '+1234567892',
      role: 'patient'
    },
    {
      user_id: 'sample-user-4',
      full_name: 'Alice Brown',
      email: 'alice.brown@example.com',
      phone: '+1234567893',
      role: 'patient'
    }
  ];

  console.log('Adding sample patients...');
  
  for (const patient of samplePatients) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([patient])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating patient:', error);
      } else {
        console.log('Created patient:', data);
      }
    } catch (error) {
      console.error('Error creating patient:', error);
    }
  }
  
  console.log('Sample patients added! Refresh the page to see them in the dropdown.');
};

export const addSampleConsultations = async (doctorId: string) => {
  const { ScheduleService } = await import('@/services/scheduleService');
  
  // First, get the patient IDs from the database
  const { data: patients } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'patient')
    .limit(3);

  if (!patients || patients.length === 0) {
    console.log('No patients found. Please add patients first using addSamplePatients()');
    return;
  }

  const sampleConsultations = [
    {
      patientId: patients[0].id,
      doctorId: doctorId,
      consultationDate: new Date().toISOString().split('T')[0], // Today
      consultationTime: '09:00',
      reason: 'Routine Checkup',
      notes: 'Annual health checkup'
    },
    {
      patientId: patients[1]?.id || patients[0].id, 
      doctorId: doctorId,
      consultationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
      consultationTime: '14:00',
      reason: 'Follow-up Consultation',
      notes: 'Follow-up for previous treatment'
    },
    {
      patientId: patients[2]?.id || patients[0].id,
      doctorId: doctorId,
      consultationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Day after tomorrow
      consultationTime: '10:30',
      reason: 'Initial Consultation',
      notes: 'New patient consultation'
    }
  ];

  console.log('Adding sample consultations...');
  
  for (const consultation of sampleConsultations) {
    try {
      const result = await ScheduleService.createConsultation(consultation);
      console.log('Created consultation:', result);
    } catch (error) {
      console.error('Error creating consultation:', error);
    }
  }
  
  console.log('Sample consultations added! Refresh the page to see them in the calendar.');
};

// Usage: In browser console, run:
// addSamplePatients() // Add test patients first
// addSampleConsultations('your-doctor-id-here') // Then add consultations
