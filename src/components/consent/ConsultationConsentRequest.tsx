import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Clock, CheckCircle, XCircle, User, Calendar, FileText, Pill, Stethoscope } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { createConsentRequest } from '@/services/consentService';
import { RecordType } from '@/types';
// Supabase removed - using Django API only

interface ConsultationConsentRequestProps {
  patientId: string;
  doctorId: string;
  doctorName: string;
  consultationDate: string;
  onConsentGiven: (consentId: string) => void;
  onConsentDenied: () => void;
}

const ConsultationConsentRequest: React.FC<ConsultationConsentRequestProps> = ({
  patientId,
  doctorId,
  doctorName,
  consultationDate,
  onConsentGiven,
  onConsentDenied
}) => {
  const [selectedDataTypes, setSelectedDataTypes] = useState<RecordType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dataTypeOptions: { type: RecordType; label: string; description: string; icon: React.ReactNode }[] = [
    {
      type: 'prescription',
      label: 'Prescriptions',
      description: 'Current and past medications, dosages, and treatments',
      icon: <Pill className="h-4 w-4" />
    },
    {
      type: 'lab_report',
      label: 'Lab Reports',
      description: 'Blood tests, urine tests, and other laboratory results',
      icon: <FileText className="h-4 w-4" />
    },
    {
      type: 'mri',
      label: 'MRI',
      description: 'Magnetic Resonance Imaging studies and results',
      icon: <FileText className="h-4 w-4" />
    },
    {
      type: 'ct_scan',
      label: 'CT Scan',
      description: 'Computed Tomography scans and results',
      icon: <FileText className="h-4 w-4" />
    }
  ];

  const handleDataTypeToggle = (type: RecordType) => {
    setSelectedDataTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleConsentResponse = async (status: 'approved' | 'denied') => {
    if (status === 'approved' && selectedDataTypes.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one type of data to share.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (status === 'approved') {
        console.log('Creating consent request with:', {
          patientId,
          doctorId,
          purpose: `Consultation with Dr. ${doctorName} on ${consultationDate}`,
          requestedDataTypes: selectedDataTypes,
          duration: 7
        });

        // Create consent request
        const consentRequest = await createConsentRequest({
          patientId,
          doctorId,
          purpose: `Consultation with Dr. ${doctorName} on ${consultationDate}`,
          requestedDataTypes: selectedDataTypes,
          duration: 7, // 7 days default
          message: `I consent to share my medical records with Dr. ${doctorName} for consultation purposes.`
        });

        console.log('Consent request created:', consentRequest);

        // Immediately approve the consent request
        const { error: approveError } = await supabase
          .from('consent_requests')
          .update({ 
            status: 'approved',
            responded_at: new Date().toISOString()
          })
          .eq('id', consentRequest.id);

        if (approveError) {
          console.error('Error approving consent request:', approveError);
          throw approveError;
        }

        onConsentGiven(consentRequest.id);
        
        toast({
          title: "Consent Granted",
          description: `You have granted Dr. ${doctorName} access to your selected medical records.`,
        });
      } else {
        onConsentDenied();
        
        toast({
          title: "Consent Denied",
          description: "You have chosen not to share your medical records for this consultation.",
        });
      }
    } catch (error) {
      console.error('Error handling consent:', error);
      toast({
        title: "Error",
        description: "Failed to process your consent decision. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-primary">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Medical Records Consent</CardTitle>
        </div>
        <CardDescription>
          Dr. {doctorName} is requesting access to your medical records for your consultation on {consultationDate}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Your Privacy Matters:</strong> You control what information to share. 
            You can revoke access at any time after the consultation.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h4 className="font-medium">What information would you like to share?</h4>
          <p className="text-sm text-muted-foreground">
            Select the types of medical records you're comfortable sharing with Dr. {doctorName}:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dataTypeOptions.map((option) => (
              <div
                key={option.type}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedDataTypes.includes(option.type)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleDataTypeToggle(option.type)}
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={selectedDataTypes.includes(option.type)}
                    onChange={() => handleDataTypeToggle(option.type)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      {option.icon}
                      <span className="font-medium text-sm">{option.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedDataTypes.length > 0 ? (
              <span className="text-primary">
                {selectedDataTypes.length} data type{selectedDataTypes.length > 1 ? 's' : ''} selected
              </span>
            ) : (
              <span>No data types selected</span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => handleConsentResponse('denied')}
              disabled={isSubmitting}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Deny Access
            </Button>
            <Button
              onClick={() => handleConsentResponse('approved')}
              disabled={isSubmitting || selectedDataTypes.length === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Grant Access
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsultationConsentRequest;
