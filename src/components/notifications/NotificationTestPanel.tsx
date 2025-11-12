import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { 
  createPrescriptionNotification,
  createConsultationNoteNotification,
  createConsultationBookedNotification,
  createHealthRecordUploadNotification,
  createPrescriptionUpdatedNotification,
  createConsultationNoteUpdatedNotification,
  createConsultationUpdatedNotification,
  createHealthAlertNotification,
  createConsentRequestNotification
} from '@/services/notificationService';
import { testNotificationsTable, testCreateNotification, testRLSPolicies } from '@/utils/testNotifications';
// Supabase removed - using Django API only

export const NotificationTestPanel: React.FC = () => {
  const { user } = useAuth();
  const { requestNotificationPermission } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testNotification = async (testName: string, testFunction: () => Promise<any>) => {
    setIsLoading(true);
    try {
      await testFunction();
      addResult(`✅ ${testName} - Notification sent successfully`);
    } catch (error) {
      addResult(`❌ ${testName} - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getTestUserIds = async () => {
    // Get a test patient and doctor for testing
    const { data: patients } = await supabase
      .from('profiles')
      .select('id, user_id, full_name')
      .eq('role', 'patient')
      .limit(1);

    const { data: doctors } = await supabase
      .from('profiles')
      .select('id, user_id, full_name')
      .eq('role', 'doctor')
      .limit(1);

    return {
      patient: patients?.[0],
      doctor: doctors?.[0]
    };
  };

  const testDoctorActions = async () => {
    const { patient, doctor } = await getTestUserIds();
    
    if (!patient || !doctor) {
      addResult('❌ No test users found. Please create patient and doctor profiles first.');
      return;
    }

    // Test prescription creation
    await testNotification(
      'Doctor creates prescription',
      () => createPrescriptionNotification(
        patient.user_id,
        patient.id,
        doctor.full_name,
        'Test Prescription - Amoxicillin'
      )
    );

    // Test consultation note creation
    await testNotification(
      'Doctor writes consultation note',
      () => createConsultationNoteNotification(
        patient.user_id,
        patient.id,
        doctor.full_name,
        'Test Consultation Note - Follow-up'
      )
    );

    // Test prescription update
    await testNotification(
      'Doctor updates prescription',
      () => createPrescriptionUpdatedNotification(
        patient.user_id,
        patient.id,
        doctor.full_name,
        'Test Prescription - Amoxicillin (Updated)'
      )
    );

    // Test consultation note update
    await testNotification(
      'Doctor updates consultation note',
      () => createConsultationNoteUpdatedNotification(
        patient.user_id,
        patient.id,
        doctor.full_name,
        'Test Consultation Note - Follow-up (Updated)'
      )
    );
  };

  const testPatientActions = async () => {
    const { patient, doctor } = await getTestUserIds();
    
    if (!patient || !doctor) {
      addResult('❌ No test users found. Please create patient and doctor profiles first.');
      return;
    }

    // Test consultation booking (Patient → Doctor)
    await testNotification(
      'Patient books consultation',
      () => createConsultationBookedNotification(
        doctor.user_id,
        doctor.id,
        patient.full_name,
        '2024-01-15 10:00 AM'
      )
    );

    // Test health record upload (Patient → Doctor)
    await testNotification(
      'Patient uploads health record',
      () => createHealthRecordUploadNotification(
        doctor.user_id,
        doctor.id,
        patient.full_name,
        'Test Health Record - Blood Test Results'
      )
    );

    // Test consent request (Patient → Doctor)
    await testNotification(
      'Patient creates consent request',
      () => createConsentRequestNotification(
        doctor.user_id,
        doctor.id,
        patient.full_name
      )
    );
  };

  const testRealTimeNotifications = async () => {
    const { patient, doctor } = await getTestUserIds();
    
    if (!patient || !doctor) {
      addResult('❌ No test users found. Please create patient and doctor profiles first.');
      return;
    }

    // Test consultation update notification to patient
    await testNotification(
      'Consultation updated (notify patient)',
      () => createConsultationUpdatedNotification(
        patient.user_id,
        patient.id,
        doctor.full_name,
        '2024-01-15'
      )
    );
  };

  const testSystemNotifications = async () => {
    const { patient } = await getTestUserIds();
    
    if (!patient) {
      addResult('❌ No test patient found. Please create a patient profile first.');
      return;
    }

    // Test health alert
    await testNotification(
      'Health alert notification',
      () => createHealthAlertNotification(
        patient.user_id,
        patient.id,
        'Your blood pressure readings are elevated. Please consult your doctor.'
      )
    );
  };

  const testDatabaseConnection = async () => {
    await testNotification(
      'Check notifications table exists',
      async () => {
        const exists = await testNotificationsTable();
        if (!exists) {
          throw new Error('Notifications table does not exist. Please create it first.');
        }
        return 'Notifications table exists and is accessible';
      }
    );
  };

  const testNotificationCreation = async () => {
    await testNotification(
      'Test notification creation',
      async () => {
        const success = await testCreateNotification();
        if (!success) {
          throw new Error('Failed to create test notification');
        }
        return 'Test notification created and cleaned up successfully';
      }
    );
  };

  const testRLS = async () => {
    await testNotification(
      'Test RLS policies',
      async () => {
        const success = await testRLSPolicies();
        if (!success) {
          throw new Error('RLS policies are blocking notification creation');
        }
        return 'RLS policies allow notification creation';
      }
    );
  };

  const testPatientDoctorAssignment = async () => {
    await testNotification(
      'Check patient-doctor assignment',
      async () => {
        const { data: assignments, error } = await supabase
          .from('patient_access')
          .select(`
            patient_id,
            doctor_id,
            status,
            profiles!patient_access_doctor_id_fkey (
              user_id,
              full_name
            )
          `)
          .eq('status', 'active');

        if (error) {
          throw new Error(`Error checking assignments: ${error.message}`);
        }

        if (!assignments || assignments.length === 0) {
          throw new Error('No active patient-doctor assignments found. This is why health record notifications are not working.');
        }

        return `Found ${assignments.length} active patient-doctor assignments`;
      }
    );
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const requestPermissions = async () => {
    const granted = await requestNotificationPermission();
    addResult(granted ? '✅ Notification permissions granted' : '❌ Notification permissions denied');
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Test Panel</CardTitle>
          <CardDescription>Please log in to test notifications</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🔔 Real-time Notification Test Panel</CardTitle>
        <CardDescription>
          Test the real-time notification system by triggering various notification types.
          Open this in multiple browser tabs to see real-time updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={requestPermissions}
            variant="outline"
            disabled={isLoading}
          >
            Request Notification Permissions
          </Button>
          <Button 
            onClick={testDatabaseConnection}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Test Database Connection
          </Button>
          <Button 
            onClick={testNotificationCreation}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Test Notification Creation
          </Button>
          <Button 
            onClick={testRLS}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            Test RLS Policies
          </Button>
          <Button 
            onClick={testPatientDoctorAssignment}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Check Patient-Doctor Assignment
          </Button>
          <Button 
            onClick={testDoctorActions}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Test Doctor Actions
          </Button>
          <Button 
            onClick={testPatientActions}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            Test Patient Actions
          </Button>
          <Button 
            onClick={testSystemNotifications}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Test System Notifications
          </Button>
          <Button 
            onClick={clearResults}
            variant="outline"
            disabled={isLoading}
          >
            Clear Results
          </Button>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold mb-2">Test Results:</h3>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-sm">No test results yet. Click a test button above.</p>
            ) : (
              <div className="space-y-1">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How to Test:</h4>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
            <li>Open this page in multiple browser tabs or different browsers</li>
            <li>Log in as different users (patient/doctor) in different tabs</li>
            <li>Click the test buttons to trigger notifications</li>
            <li>Watch notifications appear in real-time across all tabs</li>
            <li>Check the notification dropdown in the header to see the notifications</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
