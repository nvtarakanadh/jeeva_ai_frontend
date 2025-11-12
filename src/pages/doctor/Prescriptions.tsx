import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pill, Plus, Calendar, User, FileText, Download, Edit, Trash2, Eye, Stethoscope, X, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createPrescription, Prescription } from '@/services/prescriptionService';
import { getOptimizedPrescriptionsForDoctor, getOptimizedPatientsForDoctor, clearPrescriptionCache, PatientForPrescription } from '@/services/optimizedPrescriptionService';
import { toast } from '@/hooks/use-toast';
// Supabase removed - using Django API only
import { format } from 'date-fns';
import { PageSkeleton } from '@/components/ui/skeleton-loading';
import { useDropzone } from 'react-dropzone';
import { PrescriptionAnalysisModal } from '@/components/ai/PrescriptionAnalysisModal';
import { analyzeHealthRecord } from '@/services/aiAnalysisService';
import { getAIAnalysisForRecord } from '@/services/aiAnalysisService';
import { InlineLoadingSpinner } from '@/components/ui/loading-spinner';

const Prescriptions = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<PatientForPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('all');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewingFile, setViewingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisPrescription, setAnalysisPrescription] = useState<Prescription | null>(null);
  const [isCreatingPrescription, setIsCreatingPrescription] = useState(false);
  const [analyzingPrescriptions, setAnalyzingPrescriptions] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    patient_id: '',
    title: '',
    description: '',
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    prescription_date: new Date().toISOString().split('T')[0],
  });

  // File upload configuration
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    multiple: false
  });

  const removeFile = () => {
    setSelectedFile(null);
  };

  useEffect(() => {
    const loadAllData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get doctor profile once
        const { data: doctorProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (profileError || !doctorProfile) {
          throw new Error('Doctor profile not found');
        }

        const doctorId = (doctorProfile as { id: string }).id;

        // Load both prescriptions and patients in parallel
        const [prescriptionsData, patientsData] = await Promise.all([
          getOptimizedPrescriptionsForDoctor(doctorId),
          getOptimizedPatientsForDoctor(doctorId)
        ]);

        setPrescriptions(prescriptionsData);
        setPatients(patientsData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load prescriptions data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [user]);

  // Polling for AI Analysis results for prescriptions waiting for analysis
  useEffect(() => {
    if (analyzingPrescriptions.size === 0) return;
    const interval = setInterval(async () => {
      const toRemove: string[] = [];
      for (const id of analyzingPrescriptions) {
        const result = await getAIAnalysisForRecord(id);
        if (result) {
          toRemove.push(id);
          toast({
            title: 'AI Analysis Complete',
            description: 'AI Analytics is now available for a prescription.',
          });
        }
      }
      if (toRemove.length > 0) {
        setAnalyzingPrescriptions(prev => {
          const next = new Set(prev);
          toRemove.forEach(id => next.delete(id));
          return next;
        });
        refreshData(); // to immediately show soon-to-be-available analytics
      }
    }, 5000); // polling interval
    return () => clearInterval(interval);
  }, [analyzingPrescriptions]);

  // Clear on unmount
  useEffect(() => {
    return () => setAnalyzingPrescriptions(new Set());
  }, []);

  const refreshData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get doctor profile once
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !doctorProfile) {
        throw new Error('Doctor profile not found');
      }

      const doctorId = (doctorProfile as { id: string }).id;

      // Clear cache and reload data
      clearPrescriptionCache(doctorId);
      
      // Load both prescriptions and patients in parallel
      const [prescriptionsData, patientsData] = await Promise.all([
        getOptimizedPrescriptionsForDoctor(doctorId),
        getOptimizedPatientsForDoctor(doctorId)
      ]);

      setPrescriptions(prescriptionsData);
      setPatients(patientsData);
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation: require EITHER file or enough text
    if (!selectedFile && (!formData.title || !formData.medication || !formData.patient_id)) {
      toast({
        title: 'Missing data',
        description: 'Please fill in the core text fields or attach a prescription file.',
        variant: 'destructive',
      });
      return;
    }
    setIsCreatingPrescription(true);
    try {
      // Get doctor's profile ID
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (profileError || !doctorProfile) throw new Error('Doctor profile not found');
      const doctorId = (doctorProfile as { id: string }).id;
      const prescriptionData = { ...formData, doctor_id: doctorId };

      // Create prescription in DB
      const prescription = await createPrescription(prescriptionData);
      let publicUrl = undefined;
      let fileName = undefined;

      // File upload (if any), and update
      if (selectedFile) {
        try {
          const fileExt = selectedFile.name.split('.').pop();
          fileName = `${prescription.id}.${fileExt}`;
          const filePath = `prescriptions/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from('medical-files')
            .upload(filePath, selectedFile);
          if (uploadError) throw uploadError;
          const { data: { publicUrl: url } } = supabase.storage
            .from('medical-files').getPublicUrl(filePath);
          publicUrl = url;
          const { error: updateError } = await (supabase
            .from('prescriptions') as any)
            .update({ file_url: publicUrl, file_name: selectedFile.name })
            .eq('id', prescription.id);
          if (updateError) throw updateError;
        } catch (fileError) {
          console.error('File upload error:', fileError);
          toast({ title: 'Warning', description: 'Prescription created but file upload failed', variant: 'destructive' });
        }
      }

      // Ready to close dialog/UI and show loader per-prescription AI in background!
      setIsCreateOpen(false);
      setSelectedFile(null);
      setFormData({ patient_id: '', title: '', description: '', medication: '', dosage: '', frequency: '', duration: '', instructions: '', prescription_date: new Date().toISOString().split('T')[0] });
      refreshData();
      setIsCreatingPrescription(false); // UI enabled, modal closed

      // Fire-and-forget AI analysis in background
      setAnalyzingPrescriptions(prev => new Set(prev).add(prescription.id));
      toast({ title: 'AI analysis is running in background.' });
      analyzeHealthRecord({
        title: prescription.title,
        description: prescription.description,
        record_type: 'prescription',
        service_date: prescription.prescription_date,
        file_url: publicUrl,
        file_name: selectedFile?.name,
        record_id: prescription.id,
        patient_id: prescription.patient_id,
        uploaded_by: prescription.doctor_id,
      })
        .then(() => {
          setAnalyzingPrescriptions(prev => { const next = new Set(prev); next.delete(prescription.id); return next; });
          toast({ title: 'AI analysis completed and available!' });
          refreshData();
        })
        .catch(() => {
          setAnalyzingPrescriptions(prev => { const next = new Set(prev); next.delete(prescription.id); return next; });
          toast({ title: 'AI analysis failed', variant: 'destructive' });
        });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create prescription', variant: 'destructive' });
      setIsCreatingPrescription(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  const getFileType = (fileName: string, fileUrl?: string) => {
    // First try to get extension from file name
    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    // If no extension in name, try to get from URL
    if (!extension && fileUrl) {
      const urlExtension = fileUrl.split('.').pop()?.toLowerCase();
      if (urlExtension && ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(urlExtension)) {
        if (['pdf'].includes(urlExtension)) return 'pdf';
        return 'image';
      }
    }
    
    // Check extension
    if (['pdf'].includes(extension || '')) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) return 'image';
    if (['doc', 'docx'].includes(extension || '')) return 'document';
    
    // Default to trying to display as image or pdf based on URL
    if (fileUrl?.includes('.pdf') || fileUrl?.includes('pdf')) return 'pdf';
    if (fileUrl?.includes('.jpg') || fileUrl?.includes('.jpeg') || fileUrl?.includes('.png') || fileUrl?.includes('.gif')) return 'image';
    
    return 'file';
  };

  const openFileViewer = async (fileUrl: string, fileName: string) => {
    try {
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
      
      // Get file type with both name and URL for better detection
      const fileType = getFileType(fileName || 'Unknown File', displayUrl);
      setViewingFile({ url: displayUrl, name: fileName || 'Unknown File', type: fileType });
    } catch (error) {
      // Still try to open with the original URL
      const fileType = getFileType(fileName || 'Unknown File', fileUrl);
      setViewingFile({ url: fileUrl, name: fileName || 'Unknown File', type: fileType });
    }
  };

  const handleDownload = async (prescription: Prescription) => {
    if (!prescription.file_url) {
      toast({
        title: "No File Available",
        description: "This prescription doesn't have an attached file.",
        variant: "destructive"
      });
      return;
    }
    await openFileViewer(prescription.file_url, prescription.file_name || 'Prescription File');
  };

  const handleEdit = (prescription: Prescription) => {
    setEditingPrescription(prescription);
    setFormData({
      patient_id: prescription.patient_id,
      title: prescription.title,
      description: prescription.description || '',
      medication: prescription.medication,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      duration: prescription.duration,
      instructions: prescription.instructions || '',
      prescription_date: prescription.prescription_date,
    });
    setIsEditModalOpen(true);
  };

  const handleView = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsViewModalOpen(true);
  };

  const handleUpdatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrescription) return;

    try {
      
      // First get the doctor's profile ID
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (profileError || !doctorProfile) {
        throw new Error('Doctor profile not found');
      }

      const doctorId = (doctorProfile as { id: string }).id;

      const updateData = {
        ...formData,
        doctor_id: doctorId,
      };


      // Cast builder to any to avoid overly strict TS inference from generated types
      const { error } = await (supabase
        .from('prescriptions') as any)
        .update(updateData)
        .eq('id', editingPrescription.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Prescription updated successfully",
      });

      setIsEditModalOpen(false);
      setEditingPrescription(null);
      setFormData({
        patient_id: '',
        title: '',
        description: '',
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        prescription_date: new Date().toISOString().split('T')[0],
      });
      
      refreshData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update prescription",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (prescription: Prescription) => {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', prescription.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Prescription deleted successfully",
      });

      refreshData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete prescription",
        variant: "destructive",
      });
    }
  };

  const handleAnalysis = (prescription: Prescription) => {
    setAnalysisPrescription(prescription);
    setIsAnalysisModalOpen(true);
  };

  const filteredPrescriptions = prescriptions.filter(prescription => 
    selectedPatient === 'all' || prescription.patient_id === selectedPatient
  );

  // Get unique patients from prescriptions
  const uniquePatientIds = Array.from(new Set(prescriptions.map(p => p.patient_id)));
  const uniquePatients = uniquePatientIds.map(patientId => {
    const prescription = prescriptions.find(p => p.patient_id === patientId);
    return {
      id: patientId,
      name: prescription?.profiles?.full_name || 'Unknown Patient'
    };
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Prescriptions</h1>
            <p className="text-muted-foreground">
              Create and manage patient prescriptions
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prescriptions</h1>
          <p className="text-muted-foreground">
            Create and manage patient prescriptions
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Prescription
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Prescription</DialogTitle>
              <DialogDescription>
                Create a prescription for a patient. This will be saved to their profile.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePrescription} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient">Patient</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
                    required={!selectedFile} // Only required if no file is selected
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients
                        .filter((patient, index, self) => 
                          patient.id && index === self.findIndex(p => p.id === patient.id)
                        )
                        .map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.full_name} ({patient.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prescription_date">Prescription Date</Label>
                  <Input
                    id="prescription_date"
                    type="date"
                    value={formData.prescription_date}
                    onChange={(e) => setFormData({ ...formData, prescription_date: e.target.value })}
                    required={!selectedFile} // Only required if no file is selected
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Blood Pressure Medication"
                  required={!selectedFile} // Only required if no file is selected
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the prescription"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="medication">Medication</Label>
                  <Input
                    id="medication"
                    value={formData.medication}
                    onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
                    placeholder="e.g., Lisinopril"
                    required={!selectedFile} // Only required if no file is selected
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage</Label>
                  <Input
                    id="dosage"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="e.g., 10mg"
                    required={!selectedFile} // Only required if no file is selected
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                    required={!selectedFile} // Only required if no file is selected
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Once daily">Once daily</SelectItem>
                      <SelectItem value="Twice daily">Twice daily</SelectItem>
                      <SelectItem value="Three times daily">Three times daily</SelectItem>
                      <SelectItem value="Four times daily">Four times daily</SelectItem>
                      <SelectItem value="As needed">As needed</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 30 days"
                    required={!selectedFile} // Only required if no file is selected
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Special instructions for the patient"
                  rows={3}
                />
              </div>

              {/* File Upload Section */}
              <div className="space-y-2">
                <Label>Prescription File (Optional)</Label>
                {!selectedFile ? (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {isDragActive
                        ? 'Drop the file here...'
                        : 'Drag & drop a prescription file here, or click to select'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports PDF, PNG, JPG files
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingPrescription}>
                  {isCreatingPrescription ? (
                    <>
                      <InlineLoadingSpinner />
                      <span className="ml-2">Creating...</span>
                    </>
                  ) : (
                    "Create Prescription"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prescriptions</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prescriptions.length}</div>
            <p className="text-xs text-muted-foreground">
              Created by you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniquePatients.length}</div>
            <p className="text-xs text-muted-foreground">
              With prescriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {prescriptions.filter(p => {
                const prescriptionDate = new Date(p.prescription_date);
                const now = new Date();
                return prescriptionDate.getMonth() === now.getMonth() && 
                       prescriptionDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Prescriptions created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Patient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Patients</SelectItem>
            {uniquePatients.map(patient => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {filteredPrescriptions.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No prescriptions found</p>
            </CardContent>
          </Card>
        ) : (
          filteredPrescriptions.map((prescription) => (
            <Card key={prescription.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Pill className="h-4 w-4" />
                    <CardTitle className="text-lg">{prescription.title}</CardTitle>
                    <Badge className="bg-green-100 text-green-800">Prescription</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(prescription)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleView(prescription)}>
                      <FileText className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    {prescription.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnalysis(prescription)}
                        disabled={analyzingPrescriptions.has(prescription.id)}
                      >
                        {analyzingPrescriptions.has(prescription.id) ? (
                          <>
                            <InlineLoadingSpinner />
                            <span className="ml-2">AI Analytics</span>
                          </>
                        ) : (
                          <>
                            <Stethoscope className="h-4 w-4 mr-2" />
                            AI Analytics
                          </>
                        )}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(prescription)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{prescription.profiles?.full_name || 'Unknown Patient'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(prescription.prescription_date)}</span>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Medication</Label>
                      <p className="text-sm text-muted-foreground">{prescription.medication}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Dosage</Label>
                      <p className="text-sm text-muted-foreground">{prescription.dosage}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Frequency</Label>
                      <p className="text-sm text-muted-foreground">{prescription.frequency}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Duration</Label>
                      <p className="text-sm text-muted-foreground">{prescription.duration}</p>
                    </div>
                  </div>
                  {prescription.instructions && (
                    <div>
                      <Label className="text-sm font-medium">Instructions</Label>
                      <p className="text-sm text-muted-foreground">{prescription.instructions}</p>
                    </div>
                  )}
                  {prescription.description && (
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm text-muted-foreground">{prescription.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Prescription Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Prescription Details
            </DialogTitle>
            <DialogDescription>
              Complete prescription information and instructions
            </DialogDescription>
          </DialogHeader>
          
          {selectedPrescription && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold">{selectedPrescription.title}</h3>
                  <Badge className="bg-blue-100 text-blue-800">Prescription</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Patient ID: {selectedPrescription.patient_id}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(selectedPrescription.prescription_date), 'MMMM do, yyyy')}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedPrescription.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedPrescription.description}
                  </p>
                </div>
              )}

              {/* Prescription Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      Medication Details
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Medication Name</span>
                        <p className="text-lg font-semibold text-gray-900">{selectedPrescription.medication}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Dosage</span>
                        <p className="text-gray-900">{selectedPrescription.dosage}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Frequency</span>
                        <p className="text-gray-900">{selectedPrescription.frequency}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Duration</span>
                        <p className="text-gray-900">{selectedPrescription.duration}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Instructions
                    </h4>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Special Instructions</span>
                      <p className="text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg">
                        {selectedPrescription.instructions || 'No special instructions provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Attachment (if any) */}
              {selectedPrescription.file_url && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Attached File</h4>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-800">{selectedPrescription.file_name || 'Prescription File'}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(selectedPrescription)}
                      className="ml-auto"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View file
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Prescription Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Prescription
            </DialogTitle>
            <DialogDescription>
              Update prescription details and instructions
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdatePrescription} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-patient">Patient</Label>
                <Select
                  value={formData.patient_id}
                  onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients
                      .filter((patient, index, self) => 
                        patient.id && index === self.findIndex(p => p.id === patient.id)
                      )
                      .map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.full_name} ({patient.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-prescription_date">Prescription Date</Label>
                <Input
                  id="edit-prescription_date"
                  type="date"
                  value={formData.prescription_date}
                  onChange={(e) => setFormData({ ...formData, prescription_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-medication">Medication</Label>
                <Input
                  id="edit-medication"
                  value={formData.medication}
                  onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dosage">Dosage</Label>
                <Input
                  id="edit-dosage"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-frequency">Frequency</Label>
                <Input
                  id="edit-frequency"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-duration">Duration</Label>
                <Input
                  id="edit-duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-instructions">Instructions</Label>
              <Textarea
                id="edit-instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPrescription(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Update Prescription
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* File Viewer Modal */}
      {viewingFile && (
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
      )}

      {/* Prescription Analysis Modal */}
      <PrescriptionAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        prescription={analysisPrescription}
      />
    </div>
  );
};

export default Prescriptions;
