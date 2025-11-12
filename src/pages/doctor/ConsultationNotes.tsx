import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Stethoscope, Plus, Calendar, User, FileText, Download, Edit, Trash2, Eye, CheckCircle, X, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getConsultationNotesForDoctor, createConsultationNote, ConsultationNote } from '@/services/prescriptionService';
import { getPatientsForDoctor } from '@/services/consentService';
import { toast } from '@/hooks/use-toast';
// Supabase removed - using Django API only
import { format } from 'date-fns';
import { PageLoadingSpinner } from '@/components/ui/loading-spinner';
import { useDropzone } from 'react-dropzone';

const ConsultationNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ConsultationNote[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('all');
  const [selectedNote, setSelectedNote] = useState<ConsultationNote | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ConsultationNote | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    patient_id: '',
    title: '',
    description: '',
    diagnosis: '',
    recommendations: '',
    follow_up_required: false,
    follow_up_date: '',
    consultation_date: new Date().toISOString().split('T')[0],
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
    if (user) {
      loadConsultationNotes();
      loadPatients();
    }
  }, [user]);

  const loadConsultationNotes = async () => {
    try {
      setLoading(true);
      
      // First get the doctor's profile ID
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !doctorProfile) {
        throw new Error('Doctor profile not found');
      }

      const data = await getConsultationNotesForDoctor(doctorProfile.id);
      setNotes(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load consultation notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      // First get the doctor's profile ID
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !doctorProfile) {
        throw new Error('Doctor profile not found');
      }

      const data = await getPatientsForDoctor(doctorProfile.id);
      setPatients(data);
    } catch (error) {
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // First get the doctor's profile ID
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !doctorProfile) {
        throw new Error('Doctor profile not found');
      }

      const noteData = {
        ...formData,
        doctor_id: doctorProfile.id,
        follow_up_date: formData.follow_up_required ? formData.follow_up_date : undefined,
      };

      const note = await createConsultationNote(noteData);
      
      // Upload file if selected
      if (selectedFile) {
        try {
          // Upload file to Supabase storage
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${note.id}.${fileExt}`;
          const filePath = `consultation-notes/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('medical-files')
            .upload(filePath, selectedFile);
          
          if (uploadError) throw uploadError;
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('medical-files')
            .getPublicUrl(filePath);
          
          // Update consultation note with file URL
          const { error: updateError } = await supabase
            .from('consultation_notes')
            .update({
              file_url: publicUrl,
              file_name: selectedFile.name
            })
            .eq('id', note.id);
          
          if (updateError) throw updateError;
        } catch (fileError) {
          console.error('File upload error:', fileError);
          toast({
            title: "Warning",
            description: "Consultation note created but file upload failed",
            variant: "destructive",
          });
        }
      }
      
      toast({
        title: "Success",
        description: "Consultation note created successfully",
      });
      
      setIsCreateOpen(false);
      setSelectedFile(null);
      setFormData({
        patient_id: '',
        title: '',
        description: '',
        diagnosis: '',
        recommendations: '',
        follow_up_required: false,
        follow_up_date: '',
        consultation_date: new Date().toISOString().split('T')[0],
      });
      
      loadConsultationNotes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create consultation note",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  const handleEdit = (note: ConsultationNote) => {
    setEditingNote(note);
    setFormData({
      patient_id: note.patient_id,
      title: note.title,
      description: note.description || '',
      diagnosis: note.diagnosis || '',
      recommendations: note.recommendations || '',
      follow_up_required: note.follow_up_required || false,
      follow_up_date: note.follow_up_date || '',
      consultation_date: note.consultation_date,
    });
    setIsEditModalOpen(true);
  };

  const handleView = (note: ConsultationNote) => {
    setSelectedNote(note);
    setIsViewModalOpen(true);
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

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


      const updateData = {
        ...formData,
        doctor_id: doctorProfile.id,
      };


      const { error } = await supabase
        .from('consultation_notes')
        .update(updateData)
        .eq('id', editingNote.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Consultation note updated successfully",
      });

      setIsEditModalOpen(false);
      setEditingNote(null);
      setFormData({
        patient_id: '',
        title: '',
        description: '',
        diagnosis: '',
        recommendations: '',
        follow_up_required: false,
        follow_up_date: '',
        consultation_date: new Date().toISOString().split('T')[0],
      });
      
      loadConsultationNotes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update consultation note",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (note: ConsultationNote) => {
    try {
      const { error } = await supabase
        .from('consultation_notes')
        .delete()
        .eq('id', note.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Consultation note deleted successfully",
      });

      loadConsultationNotes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete consultation note",
        variant: "destructive",
      });
    }
  };

  const filteredNotes = notes.filter(note => 
    selectedPatient === 'all' || note.patient_id === selectedPatient
  );

  // Get unique patients from consultation notes
  const uniquePatientIds = Array.from(new Set(notes.map(n => n.patient_id)));
  const uniquePatients = uniquePatientIds.map(patientId => {
    const note = notes.find(n => n.patient_id === patientId);
    return {
      id: patientId,
      name: note?.profiles?.full_name || 'Unknown Patient'
    };
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Consultation Notes</h1>
            <p className="text-muted-foreground">
              Create and manage patient consultation notes
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <PageLoadingSpinner text="Loading consultation notes..." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Consultation Notes</h1>
          <p className="text-muted-foreground">
            Create and manage patient consultation notes
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Consultation Note</DialogTitle>
              <DialogDescription>
                Create a consultation note for a patient. This will be saved to their profile.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateNote} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient">Patient</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.full_name} ({patient.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultation_date">Consultation Date</Label>
                  <Input
                    id="consultation_date"
                    type="date"
                    value={formData.consultation_date}
                    onChange={(e) => setFormData({ ...formData, consultation_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Follow-up Consultation"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the consultation"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Medical diagnosis or findings"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                  placeholder="Treatment recommendations and next steps"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="follow_up_required"
                  checked={formData.follow_up_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, follow_up_required: checked as boolean })}
                />
                <Label htmlFor="follow_up_required">Follow-up required</Label>
              </div>

              {formData.follow_up_required && (
                <div className="space-y-2">
                  <Label htmlFor="follow_up_date">Follow-up Date</Label>
                  <Input
                    id="follow_up_date"
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  />
                </div>
              )}

              {/* File Upload Section */}
              <div className="space-y-2">
                <Label>Consultation Note File (Optional)</Label>
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
                        : 'Drag & drop a consultation note file here, or click to select'}
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
                <Button type="submit">Create Note</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notes.length}</div>
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
              With consultation notes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow-ups Required</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notes.filter(n => n.follow_up_required).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending follow-ups
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

      {/* Notes List */}
      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No consultation notes found</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotes.map((note) => (
            <Card key={note.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Stethoscope className="h-4 w-4" />
                    <CardTitle className="text-lg">{note.title}</CardTitle>
                    <Badge className="bg-purple-100 text-purple-800">Consultation Note</Badge>
                    {note.follow_up_required && (
                      <Badge className="bg-orange-100 text-orange-800">Follow-up Required</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(note)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleView(note)}>
                      <FileText className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    {note.file_url && (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(note)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{note.profiles?.full_name || 'Unknown Patient'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(note.consultation_date)}</span>
                    </div>
                    {note.follow_up_date && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Follow-up: {formatDate(note.follow_up_date)}</span>
                      </div>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {note.description && (
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm text-muted-foreground">{note.description}</p>
                    </div>
                  )}
                  {note.diagnosis && (
                    <div>
                      <Label className="text-sm font-medium">Diagnosis</Label>
                      <p className="text-sm text-muted-foreground">{note.diagnosis}</p>
                    </div>
                  )}
                  {note.recommendations && (
                    <div>
                      <Label className="text-sm font-medium">Recommendations</Label>
                      <p className="text-sm text-muted-foreground">{note.recommendations}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Consultation Note Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Consultation Note Details
            </DialogTitle>
            <DialogDescription>
              Complete consultation information and medical notes
            </DialogDescription>
          </DialogHeader>
          
          {selectedNote && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold">{selectedNote.title}</h3>
                  <div className="flex gap-2">
                    <Badge className="bg-purple-100 text-purple-800">Consultation Note</Badge>
                    {selectedNote.follow_up_required && (
                      <Badge className="bg-orange-100 text-orange-800">Follow-up Required</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Patient ID: {selectedNote.patient_id}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(selectedNote.consultation_date), 'MMMM do, yyyy')}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedNote.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedNote.description}
                  </p>
                </div>
              )}

              {/* Medical Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Diagnosis
                    </h4>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-red-900">{selectedNote.diagnosis || 'No diagnosis provided'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Recommendations
                    </h4>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-green-900">{selectedNote.recommendations || 'No recommendations provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Follow-up Information */}
              {selectedNote.follow_up_required && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Follow-up Required
                  </h4>
                  <p className="text-orange-800">
                    {selectedNote.follow_up_date 
                      ? `Follow-up scheduled for ${format(new Date(selectedNote.follow_up_date), 'MMMM do, yyyy')}`
                      : 'Follow-up required - date to be determined'
                    }
                  </p>
                </div>
              )}

              {/* File Attachment (if any) */}
              {selectedNote.file_url && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Attached File</h4>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-800">{selectedNote.file_name || 'Consultation Note File'}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Consultation Note Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Consultation Note
            </DialogTitle>
            <DialogDescription>
              Update consultation note details and medical information
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateNote} className="space-y-4">
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
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} ({patient.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-consultation_date">Consultation Date</Label>
                <Input
                  id="edit-consultation_date"
                  type="date"
                  value={formData.consultation_date}
                  onChange={(e) => setFormData({ ...formData, consultation_date: e.target.value })}
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
                <Label htmlFor="edit-diagnosis">Diagnosis</Label>
                <Textarea
                  id="edit-diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-recommendations">Recommendations</Label>
                <Textarea
                  id="edit-recommendations"
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-follow-up"
                  checked={formData.follow_up_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, follow_up_required: !!checked })}
                />
                <Label htmlFor="edit-follow-up">Follow-up Required</Label>
              </div>
              
              {formData.follow_up_required && (
                <div className="space-y-2">
                  <Label htmlFor="edit-follow-up-date">Follow-up Date</Label>
                  <Input
                    id="edit-follow-up-date"
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingNote(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Update Consultation Note
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsultationNotes;
