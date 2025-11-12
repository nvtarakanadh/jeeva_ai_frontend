import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileText, Image, Download, Brain, Search, Filter, Eye, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { HealthRecord, RecordType } from '@/types';
// Supabase removed - using Django API only
import { useAuth } from '@/contexts/AuthContext';
import { createHealthRecord } from '@/services/healthRecordsService';
import { analyzeHealthRecordWithAI, AIAnalysisResult } from '@/services/aiAnalysisService';
import AIAnalysisModal from '@/components/ai/AIAnalysisModal';

export const HealthRecords = () => {
  const { user, session } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState({
    title: '',
    recordType: '' as RecordType | '',
    date: '',
    description: '',
    provider: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<RecordType | 'all'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedRecordForAI, setSelectedRecordForAI] = useState<{
    id: string;
    title: string;
    type: string;
    description?: string;
    fileUrl?: string;
    fileName?: string;
  } | null>(null);
  const [analyzingRecords, setAnalyzingRecords] = useState<Set<string>>(new Set());

  // Fetch health records on component mount
  useEffect(() => {
    if (user && session) {
      console.log('🔄 HealthRecords component mounted, fetching records...');
      fetchHealthRecords();
    } else {
      console.log('⚠️ No user or session, skipping health records fetch');
      setIsLoading(false);
    }
  }, [user, session]);

  const fetchHealthRecords = async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Fetching health records for user:', session.user.id);
      
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Health records fetched:', data?.length || 0);

      const formattedRecords: any[] = data?.map((record: any) => ({
        id: record.id,
        patientId: record.user_id,
        title: record.title,
        type: record.record_type as RecordType,
        description: record.description,
        fileUrl: record.file_url,
        fileName: record.file_name,
        recordDate: new Date(record.service_date),
        uploadedAt: new Date(record.created_at),
        uploadedBy: record.user_id,
        tags: record.tags || [],
        aiAnalysis: null, // We'll populate this separately if needed
      })) || [];

      setRecords(formattedRecords);
      console.log('✅ Records formatted and set:', formattedRecords.length);
    } catch (error: any) {
      console.error('❌ Error fetching health records:', error);
      setError(error.message || "Failed to load health records");
      toast({
        title: "Error loading records",
        description: error.message || "There was an error loading your health records.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test function for debugging AI analysis
  const testAIAnalysis = async () => {
    console.log('🧪 Testing AI analysis...');
    try {
      const testData = {
        title: 'Test Health Record',
        recordType: 'prescription',
        description: 'Test prescription for blood pressure medication',
        serviceDate: new Date().toISOString().split('T')[0],
      };
      
      console.log('🧪 Test data:', testData);
      const result = await analyzeHealthRecordWithAI(testData);
      console.log('🧪 Test AI result:', result);
      return result;
    } catch (error) {
      console.error('🧪 Test AI error:', error);
      console.error('🧪 Error details:', error.message);
      console.error('🧪 Error stack:', error.stack);
    }
  };

  // Make test function available globally for debugging
  (window as any).testAIAnalysis = testAIAnalysis;
  
  // Add function to test AI analysis with a specific record
  (window as any).testAIAnalysisForRecord = async (recordId: string) => {
    console.log('🧪 Testing AI analysis for record:', recordId);
    try {
      // Get the record details
      const { data: record, error: recordError } = await supabase
        .from('health_records')
        .select('*')
        .eq('id', recordId)
        .single();
      
      if (recordError) {
        console.error('❌ Error fetching record:', recordError);
        return;
      }
      
      console.log('📋 Record found:', record);
      
      if (!record) {
        throw new Error('Record not found');
      }
      
      // Test AI analysis
      const result = await triggerAIAnalysis(
        (record as any).id,
        (record as any).title,
        (record as any).record_type,
        (record as any).description || '',
        (record as any).file_url,
        (record as any).file_name
      );
      
      console.log('✅ AI analysis test completed');
      return result;
    } catch (error) {
      console.error('❌ AI analysis test failed:', error);
    }
  };

  // Add function to check AI insights in database
  (window as any).checkAIInsights = async () => {
    console.log('🔍 Checking AI insights in database...');
    try {
      const { data: insights, error } = await supabase
        .from('ai_insights')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('📊 AI insights found:', insights?.length || 0);
      console.log('📋 Insights data:', insights);
      if (error) console.error('❌ Error fetching insights:', error);
      
      return insights;
    } catch (error) {
      console.error('❌ Error checking insights:', error);
    }
  };

  // Add function to check AI insights for specific user
  (window as any).checkUserAIInsights = async (userId: string) => {
    console.log('🔍 Checking AI insights for user:', userId);
    try {
      const { data: insights, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      console.log('📊 AI insights for user', userId, ':', insights?.length || 0);
      console.log('📋 User insights data:', insights);
      return insights;
    } catch (error) {
      console.error('❌ Error checking user AI insights:', error);
      return null;
    }
  };

  // Add function to check all AI insights with user details
  (window as any).checkAllAIInsightsWithUsers = async () => {
    console.log('🔍 Checking all AI insights with user details...');
    try {
      const { data: insights, error } = await supabase
        .from('ai_insights')
        .select(`
          *,
          health_records!inner(
            user_id,
            title,
            record_type
          )
        `)
        .order('created_at', { ascending: false });
      
      console.log('📊 All AI insights with user details:', insights?.length || 0);
      console.log('📋 Insights with users data:', insights);
      return insights;
    } catch (error) {
      console.error('❌ Error checking all AI insights:', error);
      return null;
    }
  };

  // Add function to check health records for a specific user
  (window as any).checkUserHealthRecords = async (userId: string) => {
    console.log('🔍 Checking health records for user:', userId);
    try {
      const { data: records, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      console.log('📊 Health records for user', userId, ':', records?.length || 0);
      console.log('📋 User records data:', records);
      return records;
    } catch (error) {
      console.error('❌ Error checking user health records:', error);
      return null;
    }
  };

  // Add comprehensive debugging function
  (window as any).debugAI = async () => {
    console.log('🔍 === COMPREHENSIVE AI DEBUGGING ===');
    
    try {
      // 1. Check all AI insights
      console.log('1️⃣ Checking all AI insights...');
      const { data: allInsights, error: insightsError } = await supabase
        .from('ai_insights')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('📊 Total AI insights:', allInsights?.length || 0);
      if (allInsights && allInsights.length > 0) {
        console.log('📋 AI insights data:', allInsights);
        console.log('🔍 User IDs in insights:', [...new Set(allInsights.map((i: any) => i.user_id))]);
        console.log('🔍 Record IDs in insights:', [...new Set(allInsights.map((i: any) => i.record_id))]);
      } else {
        console.log('❌ No AI insights found in database');
      }
      
      // 2. Check all health records
      console.log('2️⃣ Checking all health records...');
      const { data: allRecords, error: recordsError } = await supabase
        .from('health_records')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('📊 Total health records:', allRecords?.length || 0);
      if (allRecords && allRecords.length > 0) {
        console.log('📋 Health records data:', allRecords);
        console.log('🔍 User IDs in records:', [...new Set(allRecords.map((r: any) => r.user_id))]);
        console.log('🔍 Record IDs in records:', [...new Set(allRecords.map((r: any) => r.id))]);
      } else {
        console.log('❌ No health records found in database');
      }
      
      // 3. Check current user
      console.log('3️⃣ Checking current user...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.id, user?.email);
      
      // 4. Check if tables exist
      console.log('4️⃣ Checking table existence...');
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['ai_insights', 'health_records']);
      
      console.log('📋 Available tables:', tables);
      
      return {
        insights: allInsights,
        records: allRecords,
        user: user,
        tables: tables
      };
      
    } catch (error) {
      console.error('❌ Debug error:', error);
      return null;
    }
  };

  // Add function to test AI analysis with a simple record
  (window as any).testAIAnalysisSimple = async () => {
    console.log('🧪 === TESTING AI ANALYSIS WITH SIMPLE RECORD ===');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ No user logged in');
        return;
      }
      
      console.log('👤 Testing with user:', user.id);
      
      // Create a simple test record with proper UUID
      const testRecordData = {
        title: 'Test Prescription - ' + new Date().toISOString(),
        description: 'Test prescription for blood pressure medication - Amlodipine 5mg daily',
        recordType: 'prescription' as RecordType,
        serviceDate: new Date().toISOString(),
        fileUrl: undefined,
        fileName: undefined,
        recordId: crypto.randomUUID() // Use proper UUID instead of 'test-' + timestamp
      };
      
      console.log('📝 Test record data:', testRecordData);
      
      // Call AI analysis
      console.log('🤖 Calling AI analysis...');
      const aiResult = await analyzeHealthRecordWithAI({
        ...testRecordData,
        patientId: user.id,
        uploadedBy: user.id
      });
      
      console.log('✅ AI analysis result:', aiResult);
      
      // Save to database
      console.log('💾 Saving to database...');
      const insertData = {
        record_id: testRecordData.recordId,
        user_id: user.id,
        insight_type: aiResult.analysisType || aiResult.analysis_type || 'AI Analysis',
        content: JSON.stringify(aiResult),
        confidence_score: aiResult.confidence,
      };
      
      const { data: insertResult, error: saveError } = await supabase
        .from('ai_insights')
        .insert(insertData as any)
        .select();
      
      if (saveError) {
        console.error('❌ Error saving AI analysis:', saveError);
      } else {
        console.log('✅ AI analysis saved successfully:', insertResult);
      }
      
      return { aiResult, insertResult, saveError };
      
    } catch (error) {
      console.error('❌ Test AI analysis error:', error);
      return { error };
    }
  };

  // Add function to check the correct patient ID for doctor
  (window as any).checkDoctorPatient = async () => {
    console.log('🔍 === CHECKING DOCTOR-PATIENT RELATIONSHIP ===');
    
    try {
      // Get current user (doctor)
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👨‍⚕️ Current doctor user:', user?.id, user?.email);
      
      // Get all health records to see which patients exist
      const { data: records, error } = await supabase
        .from('health_records')
        .select('user_id, title, created_at')
        .order('created_at', { ascending: false });
      
      console.log('📋 All health records:', records);
      
      // Get unique patient IDs
      const patientIds = [...new Set(records?.map((r: any) => r.user_id) || [])];
      console.log('👥 Patient IDs in system:', patientIds);
      
      // Check AI insights for each patient
      for (const patientId of patientIds) {
        const { data: insights } = await supabase
          .from('ai_insights')
          .select('*')
          .eq('user_id', patientId);
        
        console.log(`🔍 Patient ${patientId} has ${insights?.length || 0} AI insights`);
      }
      
      return { doctorId: user?.id, patientIds, records };
      
    } catch (error) {
      console.error('❌ Error checking doctor-patient:', error);
      return { error };
    }
  };

  // Perplexity API utilities removed as not needed

  const triggerAIAnalysis = async (
    recordId: string, 
    title: string, 
    recordType: string, 
    description: string, 
    fileUrl: string | null, 
    fileName: string | null
  ) => {
    try {
      // Add record to analyzing set
      setAnalyzingRecords(prev => new Set(prev).add(recordId));
      
      console.log('🤖 Starting AI analysis for record:', recordId);
      console.log('📋 Record data:', { title, recordType, description });
      console.log('👤 User ID:', user?.id);
      
      // Prepare the health record data for AI analysis
      const healthRecordData = {
        title,
        recordType: recordType,
        description: description || '',
        serviceDate: new Date().toISOString(), // Use full datetime string
        fileUrl: fileUrl || undefined,
        fileName: fileName || undefined,
        recordId: recordId // Pass the record ID to the backend
      };

      console.log('📤 Calling AI analysis service with data:', healthRecordData);

      // Call the AI analysis service
      const aiResult: AIAnalysisResult = await analyzeHealthRecordWithAI({
        ...healthRecordData,
        patientId: user?.id,
        uploadedBy: user?.id
      });

      console.log('✅ AI analysis completed:', aiResult);
      console.log('🔍 Analysis type field:', aiResult.analysisType);
      console.log('🔍 Analysis_type field:', aiResult.analysis_type);

      // Save the analysis to the database
      const insertData = {
        record_id: recordId,
        user_id: user?.id,
        insight_type: aiResult.analysisType || aiResult.analysis_type || 'AI Analysis', // Handle both field names
        // Store full structured result as JSON string to render distinct sections later
        content: JSON.stringify(aiResult),
        confidence_score: aiResult.confidence,
      };

      console.log('💾 Saving to database:', insertData);
      console.log('🔍 Record ID type:', typeof recordId);
      console.log('🔍 User ID type:', typeof user?.id);
      
      const { data: insertResult, error: saveError } = await supabase
        .from('ai_insights')
        .insert(insertData as any)
        .select();

      if (saveError) {
        console.error('❌ Error saving AI analysis:', saveError);
        console.error('❌ Error details:', saveError.message);
        console.error('❌ Error code:', saveError.code);
        console.error('❌ Error hint:', saveError.hint);
        console.error('❌ Full error object:', JSON.stringify(saveError, null, 2));
        
        // Show error notification to user
        toast({
          title: "AI Analysis Save Failed",
          description: "AI analysis completed but could not be saved. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log('✅ AI analysis completed and saved successfully');
        console.log('📊 Insert result:', insertResult);
        
        // Show notification only after analysis is actually completed and saved
        toast({
          title: "AI Analysis Complete",
          description: "AI analysis has been completed and saved. Click the 'AI Analytics' button next to your record to view insights.",
        });
      }
    } catch (error: any) {
      console.error('❌ Error during AI analysis:', error);
      console.error('❌ Error stack:', error.stack);
      
      // Show error notification to user
      toast({
        title: "AI Analysis Failed",
        description: "AI analysis could not be completed. Please try again later.",
        variant: "destructive",
      });
    } finally {
      // Remove record from analyzing set
      setAnalyzingRecords(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordId);
        return newSet;
      });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    multiple: false, // Allow only one file for now
  });

  const handleUpload = async () => {
    if (!uploadData.title || !uploadData.recordType || !uploadData.date) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload records.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      // Upload file to Supabase storage if selected
      if (selectedFiles.length > 0) {
        const file = selectedFiles[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('health-records')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('health-records')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileName = file.name;
      }

      // Save record to database using our service function (which includes notifications)
      const data = await createHealthRecord({
        user_id: session.user.id,
        title: uploadData.title,
        record_type: uploadData.recordType,
        description: uploadData.description,
        service_date: uploadData.date,
        provider_name: uploadData.provider || null,
        file_url: fileUrl,
        file_name: fileName,
        tags: [],
      });

      // Refresh records
      await fetchHealthRecords();
      
      // Reset form
      setUploadData({
        title: '',
        recordType: '',
        date: '',
        description: '',
        provider: '',
      });
      setSelectedFiles([]);

      // Trigger AI analysis in the background
      console.log('🚀 Starting AI analysis trigger for record:', data.id);
      console.log('📋 Record data for AI:', {
        id: data.id,
        title: uploadData.title,
        recordType: uploadData.recordType,
        description: uploadData.description,
        fileUrl,
        fileName
      });
      
      // Trigger AI analysis in the background
      triggerAIAnalysis(data.id, uploadData.title, uploadData.recordType, uploadData.description, fileUrl, fileName);

      toast({
        title: "Upload successful",
        description: "Your health record has been uploaded successfully. AI analysis is being processed in the background.",
      });

      // AI analysis notification will be shown when analysis actually completes
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your record.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesFilter = filterType === 'all' || record.type === filterType;
    const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getRecordTypeColor = (type: RecordType) => {
    const colors = {
      'prescription': 'bg-green-500',
      'lab_report': 'bg-blue-500',
      'mri': 'bg-purple-500',
      'ct_scan': 'bg-orange-500'
    };
    return colors[type] || colors.prescription;
  };

  const getFileIcon = (fileType?: string) => {
    if (fileType?.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
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

  const openAIModal = (record: HealthRecord) => {
    setSelectedRecordForAI({
      id: record.id,
      title: record.title,
      type: record.type,
      description: record.description,
      fileUrl: record.fileUrl,
      fileName: record.fileName
    });
    setIsAIModalOpen(true);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please log in to delete records.",
        variant: "destructive",
      });
      return;
    }

    console.log('🗑️ Starting delete process for record:', recordId);
    setIsDeleting(recordId);

    try {
      // First, get the record to find the file path
      console.log('📋 Fetching record details...');
      const { data: record, error: fetchError } = await supabase
        .from('health_records')
        .select('file_url, file_name')
        .eq('id', recordId)
        .eq('user_id', session.user.id)
        .single();

      console.log('📋 Record fetch result:', { record, fetchError });

      if (fetchError) {
        console.error('❌ Error fetching record:', fetchError);
        throw fetchError;
      }

      if (!record) {
        throw new Error('Record not found or you do not have permission to delete it');
      }

      // Delete the file from storage if it exists
      if ((record as any).file_url) {
        console.log('📁 Deleting file from storage:', (record as any).file_url);
        try {
          // Extract the file path from the URL or use the file_url directly
          const filePath = (record as any).file_url.includes('/') ? (record as any).file_url.split('/').slice(-2).join('/') : (record as any).file_url;
          console.log('📁 Extracted file path:', filePath);
          
          // Try different possible bucket names
          const possibleBuckets = ['medical-files', 'prescriptions', 'consultation-notes', 'health-records', 'files'];
          
          for (const bucket of possibleBuckets) {
            try {
              console.log(`📁 Trying bucket: ${bucket}`);
              await supabase.storage
                .from(bucket)
                .remove([filePath]);
              console.log(`✅ File deleted from bucket: ${bucket}`);
              break; // If successful, break out of the loop
            } catch (bucketError) {
              console.log(`❌ Failed to delete from bucket ${bucket}:`, bucketError);
              // Continue to next bucket
            }
          }
        } catch (storageError) {
          console.warn('⚠️ Could not delete file from storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        }
      } else {
        console.log('ℹ️ No file to delete from storage');
      }

      // Delete the record from the database
      console.log('🗑️ Deleting record from database...');
      const { error: deleteError } = await supabase
        .from('health_records')
        .delete()
        .eq('id', recordId)
        .eq('user_id', session.user.id);

      console.log('🗑️ Database delete result:', { deleteError });

      if (deleteError) {
        console.error('❌ Error deleting record from database:', deleteError);
        throw deleteError;
      }

      console.log('✅ Record deleted successfully, refreshing records...');

      // Refresh records
      await fetchHealthRecords();

      toast({
        title: "Record deleted",
        description: "Your health record has been deleted successfully.",
      });
    } catch (error: any) {
      console.error('❌ Delete failed:', error);
      toast({
        title: "Delete failed",
        description: error.message || "There was an error deleting your record.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
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

  return (
    <div className="space-y-6">
      {/* File Viewer Modal */}
      <FileViewer />
      <div>
        <h1 className="text-3xl font-bold">Health Records</h1>
        <p className="text-muted-foreground">Upload, organize, and manage your medical documents</p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New Record</CardTitle>
          <CardDescription>Add a new medical document to your health timeline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Blood Test Results"
                value={uploadData.title}
                onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recordType">Record Type *</Label>
              <Select 
                value={uploadData.recordType} 
                onValueChange={(value: RecordType) => setUploadData(prev => ({ ...prev, recordType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select record type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prescription">Prescription</SelectItem>
                  <SelectItem value="lab_report">Lab Report</SelectItem>
                  <SelectItem value="mri">MRI</SelectItem>
                  <SelectItem value="ct_scan">CT Scan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Service Date *</Label>
              <Input
                id="date"
                type="date"
                value={uploadData.date}
                onChange={(e) => setUploadData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Input
                id="provider"
                placeholder="Doctor or facility name"
                value={uploadData.provider}
                onChange={(e) => setUploadData(prev => ({ ...prev, provider: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional notes about this record"
              value={uploadData.description}
              onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* File Upload */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/10' 
                : 'border-gray-300 hover:border-primary'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            {selectedFiles.length > 0 ? (
              <div>
                <p className="font-medium">{selectedFiles[0].name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFiles[0].size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Drop your file here, or click to browse</p>
                <p className="text-sm text-muted-foreground">
                  Supports PDF and image files up to 10MB
                </p>
              </div>
            )}
          </div>

          <Button 
            onClick={handleUpload}
            disabled={isUploading || (!selectedFiles.length && !uploadData.title)}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Record'}
          </Button>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search records..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={(value: RecordType | 'all') => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="prescription">Prescriptions</SelectItem>
                <SelectItem value="lab_report">Lab Reports</SelectItem>
                <SelectItem value="mri">MRI</SelectItem>
                <SelectItem value="ct_scan">CT Scan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Records Timeline */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Health Timeline</h2>
        
        {isLoading ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg font-medium">Loading your health records...</p>
              <p className="text-muted-foreground">Please wait while we fetch your data</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-red-500 mb-4">
                <FileText className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-medium">Error loading records</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button 
                onClick={fetchHealthRecords}
                variant="outline"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No records found</p>
              <p className="text-muted-foreground">
                {records.length === 0 
                  ? "Upload your first health record to get started" 
                  : "Try adjusting your search or filter criteria"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                {/* Desktop: Original horizontal layout, Mobile: Vertical layout */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Content section */}
                  <div className="flex items-start gap-3 sm:gap-4 flex-1">
                    <div className="p-2 sm:p-3 bg-primary/10 rounded-lg flex-shrink-0">
                      {getFileIcon(record.fileName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{record.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs text-white ${getRecordTypeColor(record.type)} self-start sm:self-center`}>
                          {record.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      {record.description && (
                        <div className="text-muted-foreground text-sm mb-2 line-clamp-2">{record.description}</div>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <span>{record.recordDate.toLocaleDateString()}</span>
                        {record.fileName && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate">{record.fileName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons - Desktop: horizontal on right, Mobile: vertical stack */}
                  <div className="flex flex-col sm:flex-row lg:flex-row gap-2 lg:gap-2 lg:flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openAIModal(record)}
                      disabled={analyzingRecords.has(record.id)}
                      className="flex-1 sm:flex-none lg:flex-none justify-center sm:justify-start lg:justify-start h-10 sm:h-8 lg:h-8 touch-manipulation"
                    >
                      {analyzingRecords.has(record.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600 mr-2"></div>
                          <span className="hidden sm:inline">Analyzing...</span>
                          <span className="sm:hidden">Analyzing</span>
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">AI Analytics</span>
                          <span className="sm:hidden">AI Analytics</span>
                        </>
                      )}
                    </Button>
                    {record.fileUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openFileViewer(record.fileUrl!, record.fileName || 'Unknown File')}
                        className="flex-1 sm:flex-none lg:flex-none justify-center sm:justify-start lg:justify-start h-10 sm:h-8 lg:h-8 touch-manipulation"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">View File</span>
                        <span className="sm:hidden">View</span>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteRecord(record.id)}
                      disabled={isDeleting === record.id}
                      className="flex-1 sm:flex-none lg:flex-none justify-center sm:justify-start lg:justify-start h-10 sm:h-8 lg:h-8 touch-manipulation text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isDeleting === record.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                          <span className="hidden sm:inline">Deleting...</span>
                          <span className="sm:hidden">Deleting</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Delete</span>
                          <span className="sm:hidden">Delete</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
        />
      )}
    </div>
  );
};

export default HealthRecords;