import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
// No mock data - using real Supabase data
import { format } from 'date-fns';
import { CardLoadingSpinner } from '@/components/ui/loading-spinner';
import { User, Search, FileText, Brain, Clock, Eye, PlusCircle, Pill, Stethoscope, Calendar, X, UserPlus, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// Supabase removed - using Django API only
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { RecordType } from '@/types';
import AIAnalysisModal from '@/components/ai/AIAnalysisModal';

interface Patient {
  id: string;
  userId: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  lastVisit: Date;
  condition: string;
  consentStatus: 'active' | 'pending' | 'expired';
  recordCount: number;
}

interface PatientRecord {
  id: string;
  patientId: string;
  userId: string;
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
  medication?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

// No mock data - all data comes from Supabase

const DoctorPatients = memo(() => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [selectedRecordType, setSelectedRecordType] = useState<string>('all');
  const [viewingFile, setViewingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [viewingDetails, setViewingDetails] = useState<PatientRecord | null>(null);
  
  // Add Patient functionality states
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [addPatientMode, setAddPatientMode] = useState<'search' | 'request'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatientForRequest, setSelectedPatientForRequest] = useState<any>(null);
  const [requestData, setRequestData] = useState({
    purpose: '',
    message: '',
    duration: 30,
    requestedDataTypes: [] as RecordType[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Analysis Modal state
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedRecordForAI, setSelectedRecordForAI] = useState<{
    id: string;
    title: string;
    type: string;
    description?: string;
    fileUrl?: string;
    fileName?: string;
    userId?: string;
  } | null>(null);

  // Debounce search term to prevent excessive re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Add debugging functions for doctor side
  (window as any).debugDoctorAI = async () => {
    console.log('🔍 === DOCTOR AI DEBUGGING ===');
    
    try {
      // Get current user (doctor)
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👨‍⚕️ Current doctor user:', user?.id, user?.email);
      
      // Get all AI insights
      const { data: allInsights, error: insightsError } = await supabase
        .from('ai_insights')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('📊 Total AI insights:', allInsights?.length || 0);
      if (allInsights && allInsights.length > 0) {
        console.log('📋 AI insights data:', allInsights);
        console.log('🔍 User IDs in insights:', [...new Set(allInsights.map((i: any) => i.user_id))]);
        console.log('🔍 Record IDs in insights:', [...new Set(allInsights.map((i: any) => i.record_id))]);
      }
      
      // Get all health records
      const { data: allRecords, error: recordsError } = await supabase
        .from('health_records')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('📊 Total health records:', allRecords?.length || 0);
      if (allRecords && allRecords.length > 0) {
        console.log('📋 Health records data:', allRecords);
        console.log('🔍 User IDs in records:', [...new Set(allRecords.map((r: any) => r.user_id))]);
        console.log('🔍 Record IDs in records:', [...new Set(allRecords.map((r: any) => r.id))]);
      }
      
      return {
        doctorId: user?.id,
        insights: allInsights,
        records: allRecords
      };
      
    } catch (error) {
      console.error('❌ Doctor debug error:', error);
      return { error };
    }
  };

  // Add function to test AI insights for specific patient
  (window as any).testPatientAI = async (patientId: string) => {
    console.log('🔍 Testing AI insights for patient:', patientId);
    
    try {
      const { data: insights, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false });
      
      console.log('📊 AI insights for patient', patientId, ':', insights?.length || 0);
      console.log('📋 Patient insights data:', insights);
      
      return insights;
    } catch (error) {
      console.error('❌ Error testing patient AI:', error);
      return null;
    }
  };

  // Test AI insights for the current selected patient
  (window as any).testCurrentPatientAI = async () => {
    if (selectedPatient) {
      console.log('🔍 Testing AI insights for current selected patient:', selectedPatient);
      // Find the user ID for the selected patient
      const patient = patients.find(p => p.id === selectedPatient);
      if (patient) {
        console.log('🔍 Patient profile ID:', patient.id, 'User ID:', patient.userId);
        await (window as any).testPatientAI(patient.userId);
      } else {
        console.log('❌ Selected patient not found in patients list');
      }
    } else {
      console.log('❌ No patient selected');
    }
  };

  // DATABASE FETCH - SUPABASE
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated first
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          setPatients([]);
          return;
        }
        
        if (!user) {
          setPatients([]);
          return;
        }
        
        // Get only patient profiles (more efficient)
        const { data: patientProfiles, error: allError } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['patient']);

        if (allError) {
          console.error('Error fetching patient profiles:', allError);
          setPatients([]);
          return;
        }

        if (patientProfiles && patientProfiles.length > 0) {
          console.log('Found patient profiles:', patientProfiles.length);
          
          // Get all record counts in batch queries (much more efficient)
          const patientIds = patientProfiles.map((p: any) => p.id);
          const patientUserIds = patientProfiles.map((p: any) => p.user_id);
          
          // Batch query for health records
          const { data: healthRecords } = await supabase
            .from('health_records')
            .select('user_id')
            .in('user_id', patientUserIds);
          
          // Batch query for prescriptions
          const { data: prescriptions } = await supabase
            .from('prescriptions')
            .select('patient_id')
            .in('patient_id', patientIds);
          
          // Batch query for consultation notes
          const { data: consultationNotes } = await supabase
            .from('consultation_notes')
            .select('patient_id')
            .in('patient_id', patientIds);
          
          // Create record count maps for efficient lookup
          const healthRecordCounts = new Map<string, number>();
          const prescriptionCounts = new Map<string, number>();
          const consultationCounts = new Map<string, number>();
          
          healthRecords?.forEach((record: any) => {
            const count = healthRecordCounts.get(record.user_id) || 0;
            healthRecordCounts.set(record.user_id, count + 1);
          });
          
          prescriptions?.forEach((prescription: any) => {
            const count = prescriptionCounts.get(prescription.patient_id) || 0;
            prescriptionCounts.set(prescription.patient_id, count + 1);
          });
          
          consultationNotes?.forEach((note: any) => {
            const count = consultationCounts.get(note.patient_id) || 0;
            consultationCounts.set(note.patient_id, count + 1);
          });
          
          // Convert to Patient format with pre-calculated counts
          const patientData: Patient[] = patientProfiles.map((profile: any) => {
            const healthCount = healthRecordCounts.get(profile.user_id) || 0;
            const prescriptionCount = prescriptionCounts.get(profile.id) || 0;
            const consultationCount = consultationCounts.get(profile.id) || 0;
            const recordCount = healthCount + prescriptionCount + consultationCount;

            return {
              id: profile.id,
              userId: profile.user_id,
              name: profile.full_name || 'Unknown Patient',
              email: profile.email || '',
              age: profile.date_of_birth ? 
                new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 25,
              gender: profile.gender || 'Unknown',
              lastVisit: new Date(profile.updated_at || profile.created_at || new Date()),
              condition: 'General Checkup',
              consentStatus: 'active' as const,
              recordCount: recordCount
            };
          });
          
          console.log('Loaded patients:', patientData.map(p => ({ id: p.id, userId: p.userId, name: p.name, recordCount: p.recordCount })));
          setPatients(patientData);
        } else {
          console.log('No patient profiles found');
          setPatients([]);
        }
      } catch (error) {
        console.error('Error:', error);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // ENHANCED SEARCH: Filter patients based on search term (memoized for performance)
  const searchSuggestions = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return [];
    const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
    return patients.filter(patient => 
      (patient.name && patient.name.toLowerCase().includes(lowerSearchTerm)) ||
      (patient.email && patient.email.toLowerCase().includes(lowerSearchTerm))
    );
  }, [patients, debouncedSearchTerm]);
  
  // ENHANCED DROPDOWN LOGIC - Show dropdown if searching and either found patients or no patients found
  const shouldShowDropdown = useMemo(() => searchTerm.trim().length > 0, [searchTerm]);

  const getConsentStatusColor = (status: string) => {
    const colors = {
      active: 'bg-accent',
      pending: 'bg-warning',
      expired: 'bg-destructive'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const loadPatientRecords = async (patientId: string) => {
    try {
      setRecordsLoading(true);
      console.log('🔄 Loading records for patient:', patientId);
      
      // Run all queries in parallel for better performance
      const [doctorProfileResult, patientProfileResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user?.id)
          .single(),
        supabase
          .from('profiles')
          .select('id, user_id, full_name, email')
          .eq('id', patientId)
          .maybeSingle()
      ]);

      const { data: doctorProfile, error: profileError } = doctorProfileResult;
      const { data: patientProfile, error: patientError } = patientProfileResult;

      if (profileError || !doctorProfile) {
        console.error('Doctor profile error:', profileError);
        setPatientRecords([]);
        return;
      }

      if (patientError) {
        console.error('Patient profile error:', patientError);
        setPatientRecords([]);
        return;
      }

      if (!patientProfile) {
        console.error('Patient profile not found for ID:', patientId);
        toast({
          title: "Error",
          description: "Patient profile not found. Please try refreshing the page.",
          variant: "destructive",
        });
        setPatientRecords([]);
        return;
      }

      console.log('✅ Patient profile found:', (patientProfile as any).full_name, 'user_id:', (patientProfile as any).user_id);

      // Run all record queries in parallel
      const [healthRecordsResult, prescriptionsResult, consultationNotesResult] = await Promise.all([
        supabase
          .from('health_records')
          .select('*')
          .eq('user_id', (patientProfile as any).user_id),
        supabase
          .from('prescriptions')
          .select(`
            *,
            profiles!prescriptions_doctor_id_fkey (
              full_name
            )
          `)
          .eq('patient_id', patientId),
        supabase
          .from('consultation_notes')
          .select(`
            *,
            profiles!consultation_notes_doctor_id_fkey (
              full_name
            )
          `)
          .eq('patient_id', patientId)
      ]);

      const { data: healthRecords, error: healthError } = healthRecordsResult;
      const { data: prescriptions, error: prescriptionError } = prescriptionsResult;
      const { data: consultationNotes, error: consultationError } = consultationNotesResult;

      // Log any errors but continue processing
      if (healthError) console.error('Health records error:', healthError);
      if (prescriptionError) console.error('Prescriptions error:', prescriptionError);
      if (consultationError) console.error('Consultation notes error:', consultationError);

      console.log('📊 Records found - Health:', healthRecords?.length || 0, 'Prescriptions:', prescriptions?.length || 0, 'Consultation Notes:', consultationNotes?.length || 0);

      const allRecords: PatientRecord[] = [];

      // Process health records
      healthRecords?.forEach((record: any) => {
        allRecords.push({
          id: record.id,
          patientId: patientId,
          userId: (patientProfile as any).user_id,
          patientName: (patientProfile as any).full_name || 'Unknown Patient',
          patientEmail: (patientProfile as any).email || '',
          recordType: 'health_record',
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

      // Process prescriptions
      prescriptions?.forEach((prescription: any) => {
        allRecords.push({
          id: prescription.id,
          patientId: patientId,
          userId: (patientProfile as any).user_id,
          patientName: (patientProfile as any).full_name || 'Unknown Patient',
          patientEmail: (patientProfile as any).email || '',
          recordType: 'prescription',
          title: prescription.title,
          description: prescription.description,
          fileUrl: prescription.file_url,
          fileName: prescription.file_name,
          recordDate: new Date(prescription.prescription_date),
          createdAt: new Date(prescription.created_at),
          doctorId: prescription.doctor_id,
          doctorName: prescription.profiles?.full_name || 'Unknown Doctor',
          medication: prescription.medication,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration
        });
      });

      // Process consultation notes
      consultationNotes?.forEach((note: any) => {
        allRecords.push({
          id: note.id,
          patientId: patientId,
          userId: (patientProfile as any).user_id,
          patientName: (patientProfile as any).full_name || 'Unknown Patient',
          patientEmail: (patientProfile as any).email || '',
          recordType: 'consultation_note',
          title: note.title,
          description: note.description,
          fileUrl: note.file_url,
          fileName: note.file_name,
          recordDate: new Date(note.consultation_date),
          createdAt: new Date(note.created_at),
          doctorId: note.doctor_id,
          doctorName: note.profiles?.full_name || 'Unknown Doctor',
          notes: note.diagnosis || note.recommendations
        });
      });

      // Sort by creation date
      const sortedRecords = allRecords.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      console.log('✅ Total records loaded:', sortedRecords.length);
      setPatientRecords(sortedRecords);
    } catch (error) {
      console.error('❌ Error loading patient records:', error);
      toast({
        title: "Error",
        description: "Failed to load patient records",
        variant: "destructive",
      });
    } finally {
      setRecordsLoading(false);
    }
  };

  const viewPatientRecords = (patientId: string) => {
    console.log('Viewing records for patient ID:', patientId);
    setSelectedPatient(patientId);
    loadPatientRecords(patientId);
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setShowDropdown(value.trim().length > 0);
  }, []);

  const handleSearchForNewPatient = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    
    try {
      // Search in profiles table for users with role 'patient'
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);

      if (error) {
        console.error('❌ Error searching patients:', error);
        toast({
          title: "Search Error",
          description: "Failed to search for patients. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (profiles && profiles.length > 0) {
        // Convert profiles to search result format
        const results = profiles.map((profile: any, index: number) => ({
          id: profile.user_id || `patient-${index}`,
          name: profile.full_name || 'Unknown Patient',
          email: profile.email || '',
          phone: profile.phone || '',
          age: profile.date_of_birth ? 
            new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 0,
          abdmId: 'Not Available'
        }));
        
        // Check if any of these patients are already in our care
        const existingPatientIds = patients.map(p => p.id);
        const newPatients = results.filter(result => !existingPatientIds.includes(result.id));
        
        if (newPatients.length > 0) {
          setSearchResults(newPatients);
          setSelectedPatientForRequest(newPatients[0]); // Auto-select first result
          setAddPatientMode('request');
          setShowAddPatient(true);
        } else {
          toast({
            title: "Patient Already in Care",
            description: "This patient is already in your care.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "No Results",
          description: "No patients found matching your search criteria",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error searching patients:', error);
      toast({
        title: "Search Error",
        description: "Failed to search for patients. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const selectPatient = useCallback((patient: Patient) => {
    setSearchTerm(patient.name);
    setShowDropdown(false);
  }, []);

  const openAIModal = (record: PatientRecord) => {
    setSelectedRecordForAI({
      id: record.id,
      title: record.title,
      type: record.recordType,
      description: record.description,
      fileUrl: record.fileUrl,
      fileName: record.fileName,
      userId: record.userId
    });
    setIsAIModalOpen(true);
  };

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'health_record':
        return <FileText className="h-4 w-4" />;
      case 'prescription':
        return <Pill className="h-4 w-4" />;
      case 'consultation_note':
        return <Stethoscope className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case 'health_record':
        return 'bg-blue-100 text-blue-800';
      case 'prescription':
        return 'bg-green-100 text-green-800';
      case 'consultation_note':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecordTypeLabel = (type: string) => {
    switch (type) {
      case 'health_record':
        return 'Health Record';
      case 'prescription':
        return 'Prescription';
      case 'consultation_note':
        return 'Consultation Note';
      default:
        return 'Record';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getFileType = (fileName: string) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(extension || '')) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) return 'image';
    if (['doc', 'docx'].includes(extension || '')) return 'document';
    return 'file';
  };

  const openFileViewer = async (fileUrl: string, fileName: string) => {
    try {
      const fileType = getFileType(fileName);
      
      // If it's already a full URL, use it directly
      let displayUrl = fileUrl;
      
      // Check if it's a Supabase storage path and try different bucket names
      if (fileUrl && !fileUrl.startsWith('http')) {
        // Try different possible bucket names
        const possibleBuckets = ['medical-files', 'prescriptions', 'consultation-notes', 'health-records', 'files'];
        
        for (const bucket of possibleBuckets) {
          try {
            const { data } = supabase.storage
              .from(bucket)
              .getPublicUrl(fileUrl);
            
            if (data.publicUrl) {
              displayUrl = data.publicUrl;
              break;
            }
          } catch (bucketError) {
            // Continue to next bucket
          }
        }
      }
      
      setViewingFile({ url: displayUrl, name: fileName, type: fileType });
    } catch (error) {
      // Still try to open with the original URL
      const fileType = getFileType(fileName);
      setViewingFile({ url: fileUrl, name: fileName, type: fileType });
    }
  };

  const openDetailsViewer = (record: PatientRecord) => {
    setViewingDetails(record);
  };

  // Add Patient functionality
  const availableDataTypes: RecordType[] = ['prescription', 'lab_report', 'mri', 'ct_scan'];

  const handlePatientSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    
    try {
      // Search in profiles table for users with role 'patient'
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);

      if (error) {
        console.error('❌ Error searching patients:', error);
        toast({
          title: "Search Error",
          description: "Failed to search for patients. Please try again.",
          variant: "destructive"
        });
        setSearchResults([]);
        return;
      }

      if (profiles && profiles.length > 0) {
        // Convert profiles to search result format
        const results = profiles.map((profile: any, index: number) => ({
          id: profile.user_id || `patient-${index}`,
          name: profile.full_name || 'Unknown Patient',
          email: profile.email || '',
          phone: profile.phone || '',
          age: profile.date_of_birth ? 
            new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 0,
          abdmId: 'Not Available' // ABDM ID not available in current schema
        }));
        
        setSearchResults(results);
        
        if (results.length === 0) {
          toast({
            title: "No Results",
            description: "No patients found matching your search criteria",
            variant: "destructive"
          });
        }
      } else {
        setSearchResults([]);
        toast({
          title: "No Results",
          description: "No patients found matching your search criteria",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error searching patients:', error);
      toast({
        title: "Search Error",
        description: "Failed to search for patients. Please try again.",
        variant: "destructive"
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPatientForRequest = (patient: any) => {
    setSelectedPatientForRequest(patient);
    setAddPatientMode('request');
  };

  const handleDataTypeToggle = (dataType: RecordType) => {
    setRequestData(prev => ({
      ...prev,
      requestedDataTypes: prev.requestedDataTypes.includes(dataType)
        ? prev.requestedDataTypes.filter(t => t !== dataType)
        : [...prev.requestedDataTypes, dataType]
    }));
  };

  const handleSubmitRequest = async () => {
    if (!requestData.purpose || requestData.requestedDataTypes.length === 0) {
      toast({
        title: "Error",
        description: "Please provide a purpose and select at least one data type",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate request submission
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Consent request sent",
        description: `Request sent to ${selectedPatientForRequest.name}. You'll be notified when they respond.`,
      });

      // Reset form
      setSelectedPatientForRequest(null);
      setRequestData({
        purpose: '',
        message: '',
        duration: 30,
        requestedDataTypes: []
      });
      setAddPatientMode('search');
      setSearchQuery('');
      setSearchResults([]);
      setShowAddPatient(false);
      
      // Refresh patients list
      window.location.reload();
    } catch (error) {
      toast({
        title: "Request failed",
        description: "Failed to send consent request",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const FileViewer = () => {
    if (!viewingFile) return null;

    return (
      <Dialog open={!!viewingFile} onOpenChange={() => setViewingFile(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-2 sm:p-4 mx-auto">
          <DialogHeader className="pb-2 sm:pb-4 pr-8">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base min-w-0">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="truncate pr-2">{viewingFile.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto w-full">
            {viewingFile.type === 'pdf' && (
              <div className="flex items-center justify-center h-[50vh] sm:h-[60vh]">
                <div className="w-full h-full border rounded-lg">
                  <iframe
                    src={viewingFile.url}
                    className="w-full h-full border-0 rounded-lg"
                    title={viewingFile.name}
                    onError={(e) => {
                      console.error('Error loading PDF:', e);
                    }}
                  />
                </div>
              </div>
            )}
            {viewingFile.type === 'image' && (
              <div className="h-[50vh] sm:h-[60vh] bg-gray-50 rounded-lg p-4 flex items-center justify-center w-full text-center">
                <div className="flex items-center justify-center w-full h-full text-center">
                  <img
                    src={viewingFile.url}
                    alt={viewingFile.name}
                    className="max-w-full max-h-full object-contain rounded shadow-sm"
                    style={{ 
                      display: 'block', 
                      margin: '0 auto',
                      textAlign: 'center'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
            {viewingFile.type === 'document' && (
              <div className="flex items-center justify-center h-[50vh] sm:h-[60vh] bg-gray-100 rounded-lg p-4">
                <div className="text-center">
                  <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-base sm:text-lg font-medium">Document Preview</p>
                  <p className="text-sm text-gray-500 mb-4 break-all">{viewingFile.name}</p>
                  <p className="text-xs sm:text-sm text-gray-400 mb-4">
                    Document preview not available in browser.
                  </p>
                  <Button 
                    onClick={() => window.open(viewingFile.url, '_blank')}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Open in New Tab
                  </Button>
                </div>
              </div>
            )}
            {viewingFile.type === 'file' && (
              <div className="flex items-center justify-center h-[60vh] sm:h-[70vh] bg-gray-100 rounded-lg p-4">
                <div className="text-center">
                  <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-base sm:text-lg font-medium">File Preview</p>
                  <p className="text-sm text-gray-500 mb-4 break-all">{viewingFile.name}</p>
                  <p className="text-xs sm:text-sm text-gray-400 mb-4">
                    File preview not available in browser.
                  </p>
                  <Button 
                    onClick={() => window.open(viewingFile.url, '_blank')}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Open in New Tab
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 pt-3 sm:pt-4 border-t mt-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(viewingFile.url, '_blank')}
                className="flex-1 sm:flex-none"
              >
                Open in New Tab
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = viewingFile.url;
                  link.download = viewingFile.name;
                  link.click();
                }}
                className="flex-1 sm:flex-none"
              >
                Download
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 break-all">
              URL: {viewingFile.url}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const DetailsViewer = () => {
    if (!viewingDetails) return null;

    return (
      <Dialog open={!!viewingDetails} onOpenChange={() => setViewingDetails(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-2 sm:p-6">
          <DialogHeader className="pb-2 sm:pb-4">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm sm:text-base min-w-0">
                {getRecordIcon(viewingDetails.recordType || 'health_record')}
                <span className="truncate">{viewingDetails.title || 'Untitled Record'}</span>
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Record Type</label>
                <p className="text-sm">{getRecordTypeLabel(viewingDetails.recordType || 'health_record')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Date</label>
                <p className="text-sm">
                  {viewingDetails.recordDate ? formatDate(new Date(viewingDetails.recordDate)) : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Patient</label>
                <p className="text-sm">{viewingDetails.patientName || 'Unknown Patient'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Doctor</label>
                <p className="text-sm">{viewingDetails.doctorName || 'Unknown Doctor'}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-sm mt-1">{viewingDetails.description || 'No description available'}</p>
            </div>

            {(viewingDetails.recordType === 'prescription') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Medication</label>
                  <p className="text-sm">{viewingDetails.medication || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Dosage</label>
                  <p className="text-sm">{viewingDetails.dosage || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Frequency</label>
                  <p className="text-sm">{viewingDetails.frequency || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Duration</label>
                  <p className="text-sm">{viewingDetails.duration || 'N/A'}</p>
                </div>
              </div>
            )}

            {(viewingDetails.recordType === 'consultation_note') && viewingDetails.notes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <p className="text-sm mt-1">{viewingDetails.notes}</p>
              </div>
            )}

            {viewingDetails.fileUrl && (
              <div>
                <label className="text-sm font-medium text-gray-500">Attached File</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-blue-600 truncate">{viewingDetails.fileName || 'Unknown File'}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openFileViewer(viewingDetails.fileUrl!, viewingDetails.fileName || 'Unknown File')}
                    className="w-full sm:w-auto"
                  >
                    View File
                  </Button>
                </div>
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const filteredRecords = useMemo(() => {
    return patientRecords.filter(record => {
      const typeMatch = selectedRecordType === 'all' || record.recordType === selectedRecordType;
      return typeMatch;
    });
  }, [patientRecords, selectedRecordType]);

  const healthRecords = useMemo(() => 
    filteredRecords.filter(r => r.recordType === 'health_record'), 
    [filteredRecords]
  );
  
  const prescriptions = useMemo(() => 
    filteredRecords.filter(r => r.recordType === 'prescription'), 
    [filteredRecords]
  );
  
  const consultationNotes = useMemo(() => 
    filteredRecords.filter(r => r.recordType === 'consultation_note'), 
    [filteredRecords]
  );

  return (
    <div className="space-y-6">
      {/* File Viewer Modal */}
      <FileViewer />
      
      {/* Details Viewer Modal */}
      <DetailsViewer />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Patients</h1>
          <p className="text-muted-foreground">Manage and view your patient records</p>
        </div>
        <Button 
          variant="medical" 
          onClick={() => setShowAddPatient(!showAddPatient)}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {showAddPatient ? 'Hide Add Patient' : 'Add Patient'}
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground dark:text-gray-400" />
            <input
              type="text"
              placeholder="Enter name, phone, email, or ABDM ID..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />

            
            {/* ENHANCED SEARCH DROPDOWN */}
            {shouldShowDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-900 border-2 border-blue-500 dark:border-blue-400 rounded-md shadow-xl dark:shadow-gray-800 max-h-60 overflow-y-auto">
                {searchTerm !== debouncedSearchTerm ? (
                  <div className="px-4 py-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 dark:border-blue-400 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-300">Searching...</p>
                  </div>
                ) : searchSuggestions.length > 0 ? (
                  <>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-bold">
                  Found {searchSuggestions.length} patients
                </div>
                {searchSuggestions.map((patient, index) => (
                  <div
                    key={patient.id || index}
                    className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    onClick={() => selectPatient(patient)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {patient.name ? patient.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{patient.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">{patient.email || 'No email'}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">{patient.condition || 'General Checkup'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                  </>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <div className="text-gray-500 dark:text-gray-300 mb-4">
                      <User className="h-12 w-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                      <p className="font-medium dark:text-gray-200">No patients found matching "{searchTerm}"</p>
                      <p className="text-sm dark:text-gray-300">This patient might not be in your care yet</p>
              </div>
                    <Button 
                      onClick={() => {
                        handleSearchForNewPatient(searchTerm);
                        setSearchTerm('');
                      }}
                      variant="medical"
                      className="w-full"
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Searching...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Patient "{searchTerm}"
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Patient Section */}
      {showAddPatient && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Add Patient to Your Care
                </CardTitle>
                <CardDescription>
                  Search for patients and request access to their health records
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddPatient(false);
                  setAddPatientMode('search');
                  setSearchQuery('');
                  setSearchResults([]);
                  setSelectedPatientForRequest(null);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {addPatientMode === 'search' ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <UserPlus className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Add New Patient</h3>
                  <p className="text-muted-foreground mb-4">
                    Use the search bar above to find and add patients to your care
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>How it works:</strong> Search for a patient by name, email, or phone number. 
                      If they're not in your care yet, you'll see an "Add Patient" button to request access to their records.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Consent Request Form */
              <div className="space-y-6">
                {/* Selected Patient Info */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Selected Patient:</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                      {selectedPatientForRequest?.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium">{selectedPatientForRequest?.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedPatientForRequest?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Request Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose of Access *</Label>
                    <Input
                      id="purpose"
                      placeholder="e.g., Cardiac consultation and treatment planning"
                      value={requestData.purpose}
                      onChange={(e) => setRequestData(prev => ({ ...prev, purpose: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message to Patient</Label>
                    <Textarea
                      id="message"
                      placeholder="Optional message explaining why you need access to their records..."
                      value={requestData.message}
                      onChange={(e) => setRequestData(prev => ({ ...prev, message: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Access Duration (days)</Label>
                    <Select 
                      value={requestData.duration.toString()} 
                      onValueChange={(value) => setRequestData(prev => ({ ...prev, duration: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Requested Data Types *</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {availableDataTypes.map((dataType) => (
                        <div key={dataType} className="flex items-center space-x-2">
                          <Checkbox
                            id={dataType}
                            checked={requestData.requestedDataTypes.includes(dataType)}
                            onCheckedChange={() => handleDataTypeToggle(dataType)}
                          />
                          <label htmlFor={dataType} className="text-sm font-medium capitalize">
                            {dataType.replace('_', ' ')}
                          </label>
                        </div>
                      ))}
                    </div>
                    {requestData.requestedDataTypes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {requestData.requestedDataTypes.map((type) => (
                          <Badge key={type} variant="outline">
                            {type.replace('_', ' ')}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={handleSubmitRequest}
                    disabled={isSubmitting || !requestData.purpose || requestData.requestedDataTypes.length === 0}
                    className="flex-1"
                    variant="medical"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending Request...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Consent Request
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setAddPatientMode('search');
                      setSelectedPatientForRequest(null);
                    }}
                  >
                    Back to Search
                  </Button>
          </div>

                <div className="bg-accent-light p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-accent" />
                    <div>
                      <p className="font-medium">Patient Notification</p>
                      <p className="text-sm text-muted-foreground">
                        The patient will receive a notification about your consent request and can approve or deny access to their health data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </CardContent>
      </Card>
      )}

      {/* Patient Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                <p className="text-3xl font-bold">{loading ? '...' : patients.length}</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Consents</p>
                <p className="text-3xl font-bold text-accent">
                  {loading ? '...' : patients.filter(p => p.consentStatus === 'active').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Consents</p>
                <p className="text-3xl font-bold text-warning">
                  {loading ? '...' : patients.filter(p => p.consentStatus === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-3xl font-bold">
                  {loading ? '...' : patients.reduce((sum, p) => sum + p.recordCount, 0)}
                </p>
              </div>
              <Brain className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient List */}
      <div className="space-y-4 min-h-[400px]">
        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <CardLoadingSpinner text="Loading patients..." />
            </CardContent>
          </Card>
        ) : patients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No patients found</p>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search or add a new patient' : 'No patients registered yet. Add a new patient to get started.'}
              </p>
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> If you're not seeing patients, you may need to:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 text-left max-w-md mx-auto">
                  <li>• Log in as a doctor to access patient data</li>
                  <li>• Check if Row Level Security policies allow doctor access</li>
                  <li>• Ensure patient profiles exist in the database</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          patients.map((patient) => (
            <div key={patient.id}>
              <Card className="hover:shadow-medium transition-all">
              <CardContent className="p-4 sm:p-6">
                {/* Mobile-first responsive layout */}
                <div className="space-y-4">
                  {/* Patient Info Section */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                      {getInitials(patient.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{patient.name}</h3>
                      <p className="text-muted-foreground text-sm truncate">{patient.email}</p>
                      
                      {/* Patient Details - Stack on mobile, inline on desktop */}
                      <div className="mt-2 space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-4 text-sm text-muted-foreground">
                        <span className="block sm:inline">{patient.age} years • {patient.gender}</span>
                        <span className="block sm:inline">Last visit: {format(patient.lastVisit, 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status and Records Section */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm sm:text-base">{patient.condition}</p>
                        <Badge className={`${getConsentStatusColor(patient.consentStatus)} text-white text-xs`}>
                          {patient.consentStatus}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {patient.recordCount} records
                      </span>
                    </div>
                    
                    {/* Action Buttons - Full width on mobile, auto on desktop */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewPatientRecords(patient.id)}
                        disabled={patient.consentStatus !== 'active'}
                        className="w-full sm:w-auto"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Records
                      </Button>
                      {patient.consentStatus === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/doctor/consents')}
                          className="w-full sm:w-auto"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Request Access
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

              {/* Patient Records Display - Show below patient name when selected */}
              {selectedPatient === patient.id && (
                <Card className="border-primary mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Patient Records</CardTitle>
                <CardDescription>
                          Viewing records for {patient.name}
                </CardDescription>
              </div>
                      <Button variant="outline" onClick={() => {
                        setSelectedPatient(null);
                        setPatientRecords([]);
                        setSelectedRecordType('all');
                      }}>
                        <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                      {/* Record Type Filter */}
                      <div className="flex gap-4">
                        <Select value={selectedRecordType} onValueChange={setSelectedRecordType}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select Record Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="health_record">Health Records</SelectItem>
                            <SelectItem value="prescription">Prescriptions</SelectItem>
                            <SelectItem value="consultation_note">Consultation Notes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Summary Stats */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{patientRecords.length}</div>
                            <p className="text-xs text-muted-foreground">
                              All record types
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Health Records</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{healthRecords.length}</div>
                            <p className="text-xs text-muted-foreground">
                              Patient uploaded records
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
                            <Pill className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{prescriptions.length}</div>
                            <p className="text-xs text-muted-foreground">
                              Created by doctors
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Records Display */}
                      {recordsLoading ? (
                        <div className="text-center py-8">
                          <CardLoadingSpinner text="Loading patient records..." />
                        </div>
                      ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-lg font-medium">No records found</p>
                <p className="text-muted-foreground">
                            {selectedRecordType === 'all' 
                              ? 'This patient has no medical records yet.'
                              : `No ${getRecordTypeLabel(selectedRecordType).toLowerCase()} found for this patient.`
                            }
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredRecords.map((record) => (
                            <Card key={record.id}>
                              <CardHeader className="pb-3">
                                {/* Record Header - Stack on mobile */}
                                <div className="space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex items-center space-x-2 min-w-0">
                                      {getRecordIcon(record.recordType)}
                                      <CardTitle className="text-lg truncate">{record.title}</CardTitle>
                                      <Badge className={getRecordTypeColor(record.recordType)}>
                                        {getRecordTypeLabel(record.recordType)}
                                      </Badge>
                                    </div>
                                    
                                    {/* Action Buttons - Stack on mobile */}
                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => openDetailsViewer(record)}
                                        className="w-full sm:w-auto"
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => openAIModal(record)}
                                        className="w-full sm:w-auto"
                                      >
                                        <Brain className="h-4 w-4 mr-2" />
                                        AI Analytics
                                      </Button>
                                      {record.fileUrl && (
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => openFileViewer(record.fileUrl!, record.fileName || 'Unknown File')}
                                          className="w-full sm:w-auto"
                                        >
                                          <FileText className="h-4 w-4 mr-2" />
                                          View File
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Record Metadata - Stack on mobile */}
                                  <div className="text-sm text-muted-foreground">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                      <div className="flex items-center space-x-1">
                                        <User className="h-4 w-4" />
                                        <span className="truncate">{record.patientName}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>{formatDate(record.recordDate)}</span>
                                      </div>
                                      {record.doctorName && (
                                        <div className="flex items-center space-x-1">
                                          <Stethoscope className="h-4 w-4" />
                                          <span className="truncate">{record.doctorName}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                  {record.description}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
              </div>
                      )}
            </div>
          </CardContent>
        </Card>
      )}
            </div>
          ))
        )}
      </div>

      {/* AI Analysis Modal */}
      {selectedRecordForAI && (
        <AIAnalysisModal
          isOpen={isAIModalOpen}
          onClose={() => {
            setIsAIModalOpen(false);
            setSelectedRecordForAI(null);
          }}
          recordId={selectedRecordForAI.id}
          recordTitle={selectedRecordForAI.title}
          recordType={selectedRecordForAI.type}
          recordDescription={selectedRecordForAI.description}
          fileUrl={selectedRecordForAI.fileUrl}
          fileName={selectedRecordForAI.fileName}
          patientId={selectedRecordForAI.userId}
        />
      )}
    </div>
  );
});

DoctorPatients.displayName = 'DoctorPatients';

export default DoctorPatients;