import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Pill, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { ButtonLoadingSpinner } from '@/components/ui/loading-spinner';
import { createPrescription, uploadPrescriptionFile } from '@/services/prescriptionService';
import { useAuth } from '@/contexts/AuthContext';
// Supabase removed - using Django API only

interface CreatePrescriptionProps {
  patientId: string;
  patientName: string;
  onPrescriptionCreated?: (prescriptionId: string) => void;
  onCancel?: () => void;
}

const CreatePrescription: React.FC<CreatePrescriptionProps> = ({
  patientId,
  patientName,
  onPrescriptionCreated,
  onCancel
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    prescription_date: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const frequencyOptions = [
    'Once daily',
    'Twice daily',
    'Three times daily',
    'Four times daily',
    'Every 6 hours',
    'Every 8 hours',
    'Every 12 hours',
    'As needed',
    'Before meals',
    'After meals',
    'At bedtime'
  ];

  const durationOptions = [
    '1 day',
    '3 days',
    '5 days',
    '1 week',
    '2 weeks',
    '3 weeks',
    '1 month',
    '2 months',
    '3 months',
    '6 months',
    '1 year',
    'Ongoing'
  ];

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

  const handleInputChange = (field: string, value: string) => {
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
        description: "Please log in to create prescriptions.",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.title || !formData.medication || !formData.dosage || !formData.frequency || !formData.duration) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      
      // Create prescription
      const prescription = await createPrescription({
        patient_id: patientId,
        doctor_id: user!.id,
        title: formData.title,
        description: formData.description,
        medication: formData.medication,
        dosage: formData.dosage,
        frequency: formData.frequency,
        duration: formData.duration,
        instructions: formData.instructions,
        prescription_date: formData.prescription_date
      });
      

      // Upload file if selected
      if (selectedFile) {
        const fileUrl = await uploadPrescriptionFile(selectedFile, prescription.id);
        
        // Update prescription with file URL
        const { error } = await supabase
          .from('prescriptions')
          .update({
            file_url: fileUrl,
            file_name: selectedFile.name
          })
          .eq('id', prescription.id);

        if (error) throw error;
      }

      toast({
        title: "Prescription Created",
        description: `Prescription for ${patientName} has been created successfully.`,
      });

      onPrescriptionCreated?.(prescription.id);
    } catch (error: any) {
      console.error('🔧 CreatePrescription: Error creating prescription:', error);
      console.error('🔧 CreatePrescription: Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      // Check if it's a table doesn't exist error
      if (error.message?.includes('Could not find the table') ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')) {
        toast({
          title: "Database Setup Required",
          description: "The prescriptions table needs to be created in the database. Please contact your administrator.",
          variant: "destructive"
        });
      } else if (error.message?.includes('Key is not present in table')) {
        toast({
          title: "User Profile Error",
          description: "Your user profile is not properly set up. Please log out and log back in.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to create prescription: ${error.message}`,
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
          <Pill className="h-5 w-5 text-primary" />
          <CardTitle>Create Prescription</CardTitle>
        </div>
        <CardDescription>
          Create a new prescription for {patientName}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Prescription Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Antibiotic for UTI"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prescription_date">Prescription Date *</Label>
              <Input
                id="prescription_date"
                type="date"
                value={formData.prescription_date}
                onChange={(e) => handleInputChange('prescription_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the prescription..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Medication Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Medication Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medication">Medication Name *</Label>
                <Input
                  id="medication"
                  placeholder="e.g., Amoxicillin"
                  value={formData.medication}
                  onChange={(e) => handleInputChange('medication', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dosage">Dosage *</Label>
                <Input
                  id="dosage"
                  placeholder="e.g., 500mg"
                  value={formData.dosage}
                  onChange={(e) => handleInputChange('dosage', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Select value={formData.frequency} onValueChange={(value) => handleInputChange('frequency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration *</Label>
                <Select value={formData.duration} onValueChange={(value) => handleInputChange('duration', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Special Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="e.g., Take with food, avoid alcohol, etc."
                value={formData.instructions}
                onChange={(e) => handleInputChange('instructions', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Attach Prescription File (Optional)</Label>
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
                  <Pill className="h-4 w-4 mr-2" />
                  Create Prescription
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreatePrescription;
