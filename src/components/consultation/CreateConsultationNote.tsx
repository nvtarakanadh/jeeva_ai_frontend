import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Stethoscope, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { ButtonLoadingSpinner } from '@/components/ui/loading-spinner';
import { createConsultationNote, uploadConsultationNoteFile } from '@/services/prescriptionService';
import { useAuth } from '@/contexts/AuthContext';
// Supabase removed - using Django API only

interface CreateConsultationNoteProps {
  patientId: string;
  patientName: string;
  consultationId?: string;
  onNoteCreated?: (noteId: string) => void;
  onCancel?: () => void;
}

const CreateConsultationNote: React.FC<CreateConsultationNoteProps> = ({
  patientId,
  patientName,
  consultationId,
  onNoteCreated,
  onCancel
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    diagnosis: '',
    recommendations: '',
    follow_up_required: false,
    follow_up_date: '',
    consultation_date: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please log in to create consultation notes.",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.title || !formData.diagnosis || !formData.recommendations) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create consultation note
      const note = await createConsultationNote({
        patient_id: patientId,
        doctor_id: user!.id,
        title: formData.title,
        description: formData.description,
        diagnosis: formData.diagnosis,
        recommendations: formData.recommendations,
        follow_up_required: formData.follow_up_required,
        follow_up_date: formData.follow_up_date || undefined,
        consultation_date: formData.consultation_date
      });

      // Upload file if selected
      if (selectedFile) {
        const fileUrl = await uploadConsultationNoteFile(selectedFile, note.id);
        
        // Update note with file URL
        const { error } = await supabase
          .from('consultation_notes')
          .update({
            file_url: fileUrl,
            file_name: selectedFile.name
          })
          .eq('id', note.id);

        if (error) throw error;
      }

      toast({
        title: "Consultation Note Created",
        description: `Consultation note for ${patientName} has been created successfully.`,
      });

      onNoteCreated?.(note.id);
    } catch (error: any) {
      console.error('Error creating consultation note:', error);
      
      // Check if it's a table doesn't exist error
      if (error.message?.includes('Could not find the table') || 
          error.message?.includes('relation') || 
          error.message?.includes('does not exist')) {
        toast({
          title: "Database Setup Required",
          description: "The consultation notes table needs to be created in the database. Please contact your administrator.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create consultation note. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          <CardTitle>Create Consultation Note</CardTitle>
        </div>
        <CardDescription>
          Create a consultation note for {patientName}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Note Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Follow-up consultation"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="consultation_date">Consultation Date *</Label>
              <Input
                id="consultation_date"
                type="date"
                value={formData.consultation_date}
                onChange={(e) => handleInputChange('consultation_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the consultation..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Medical Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Medical Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis *</Label>
              <Textarea
                id="diagnosis"
                placeholder="Enter the diagnosis..."
                value={formData.diagnosis}
                onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recommendations">Recommendations *</Label>
              <Textarea
                id="recommendations"
                placeholder="Enter treatment recommendations, lifestyle changes, etc."
                value={formData.recommendations}
                onChange={(e) => handleInputChange('recommendations', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="follow_up_required"
                  checked={formData.follow_up_required}
                  onCheckedChange={(checked) => handleInputChange('follow_up_required', checked as boolean)}
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
                    onChange={(e) => handleInputChange('follow_up_date', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Attach Additional Files (Optional)</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              {selectedFile ? (
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a file here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, PNG, JPG up to 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <ButtonLoadingSpinner className="text-white" />
                Creating...
              </>
            ) : (
                <>
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Create Note
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateConsultationNote;
