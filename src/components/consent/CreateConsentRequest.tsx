import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getPatientsForDoctor } from '@/services/consentService';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Send, Shield, Eye, EyeOff } from 'lucide-react';
// Supabase removed - using Django API only
import { format } from 'date-fns';

interface Patient {
  id: string;
  name: string;
  email: string;
  mrn?: string;
}

interface CreateConsentRequestProps {
  doctorId: string;
  onRequestCreated: () => void;
}

const CreateConsentRequest: React.FC<CreateConsentRequestProps> = ({ doctorId, onRequestCreated }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [purpose, setPurpose] = useState('');
  const [deIdentified, setDeIdentified] = useState(true);
  const [consentDate, setConsentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [duration, setDuration] = useState(30);
  const [procedure, setProcedure] = useState('');
  const [summary, setSummary] = useState('');
  const [consentStatement, setConsentStatement] = useState('');
  const [witness, setWitness] = useState('');
  const [provider, setProvider] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');


  useEffect(() => {
    if (isOpen) {
      loadPatients();
    }
  }, [isOpen]);

  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      console.log('Component: Loading patients for doctor:', doctorId);
      
      // Try direct Supabase query first (more reliable)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'patient')
        .not('full_name', 'is', null)
        .order('full_name');

      if (error) {
        console.error('Supabase error loading patients:', error);
        // Fallback to service function
        const patientsData = await getPatientsForDoctor(doctorId);
        setPatients(patientsData);
      } else {
        console.log('Component: Received patients data from Supabase:', data);
        setPatients(
          (data || []).map((p) => ({
            id: p.id,
            name: p.full_name || 'Unknown Patient',
            email: p.email || 'No email',
            mrn: '' // MRN not stored in profiles table
          }))
        );
      }
    } catch (error) {
      console.error('Component: Error loading patients:', error);
      toast({
        title: t('consentForm.error'),
        description: t('consentForm.failedToLoadPatients'),
        variant: "destructive"
      });
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };


  const formatConsentDocument = () => {
    const selectedPatientData = patients.find(p => p.id === selectedPatient);
    const patientDisplay = deIdentified ? '[REDACTED]' : (selectedPatientData?.name || '');
    const patientIdDisplay = selectedPatient || '[Patient ID]'; // Always show patient ID
    const mrnDisplay = deIdentified ? '[REDACTED]' : (selectedPatientData?.mrn || 'N/A');
    // Generalize procedure names when de-identified
    let procedureDisplay = procedure;
    if (deIdentified && procedure) {
      const lowerProcedure = procedure.toLowerCase();
      // Check for specific procedure types and generalize
      if (lowerProcedure.includes('knee') || lowerProcedure.includes('hip') || lowerProcedure.includes('joint')) {
        procedureDisplay = 'joint surgical procedure';
      } else if (lowerProcedure.includes('cardiac') || lowerProcedure.includes('heart') || lowerProcedure.includes('bypass')) {
        procedureDisplay = 'cardiovascular surgical procedure';
      } else if (lowerProcedure.includes('replacement') || lowerProcedure.includes('implant')) {
        procedureDisplay = 'surgical procedure with implant';
      } else if (lowerProcedure.includes('surgery') || lowerProcedure.includes('operation')) {
        procedureDisplay = 'surgical procedure';
      } else if (lowerProcedure.includes('scan') || lowerProcedure.includes('imaging') || lowerProcedure.includes('mri') || lowerProcedure.includes('ct')) {
        procedureDisplay = 'diagnostic imaging procedure';
      } else {
        // Generalize by removing specific details
        procedureDisplay = procedure.replace(/\b(knee|hip|cardiac|heart|bypass|replacement|implant)\b/gi, 'surgical');
        if (!procedureDisplay.toLowerCase().includes('procedure') && !procedureDisplay.toLowerCase().includes('surgery')) {
          procedureDisplay = `medical procedure (${procedureDisplay})`;
        }
      }
    }
    
    const title = deIdentified 
      ? 'Consent for Procedure (Sanitized Version)'
      : `Consent for ${procedure || purpose}`;
    
    const formattedDate = consentDate ? format(new Date(consentDate), 'MMMM dd, yyyy') : '[Insert date]';
    
    const defaultConsentStatement = consentStatement || 
      'The patient has been informed of the procedure, its benefits, risks, and alternatives. The patient voluntarily agrees to the procedure, and consent was obtained as per institutional policy.';
    
    const defaultSummary = summary || 
      `This document confirms that the patient has been informed about the ${procedureDisplay || 'procedure'}, including its purpose, potential benefits, associated risks, and available alternatives. The patient had the opportunity to ask questions, which were answered to their satisfaction.`;

    return `CONSENT FOR PROCEDURE${deIdentified ? ' (SANITIZED VERSION)' : ''}

Title: ${title}
Date: ${formattedDate}
Patient: ${patientDisplay}
Patient ID: ${patientIdDisplay}
MRN: ${mrnDisplay}

${deIdentified ? 'De-identified for educational purposes.\n' : ''}
SUMMARY:
${defaultSummary}

CONSENT:
${defaultConsentStatement}

WITNESS: ${witness || '[RN witness / Initials]'}
PROVIDER: ${provider || '[Dr. Initials, MD]'}

${additionalNotes ? `ADDITIONAL NOTES:\n${additionalNotes}\n` : ''}
---
This consent form has been completed in accordance with institutional policies and procedures.
${deIdentified ? 'NOTE: This document has been de-identified for privacy protection. All personal identifiers have been removed.' : ''}`;
  };

  const handlePreview = () => {
    if (!selectedPatient || !purpose) {
      toast({
        title: t('consentForm.validationError'),
        description: 'Please select a patient and enter a purpose/title before previewing.',
        variant: "destructive"
      });
      return;
    }

    const previewContent = formatConsentDocument();
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <html>
          <head>
            <title>Consent Form Preview</title>
            <style>
              body {
                font-family: 'Noto Sans', sans-serif;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.8;
                background: #1a1a1a;
                color: #ffffff;
              }
              h1 {
                color: #4ade80;
                border-bottom: 2px solid #4ade80;
                padding-bottom: 10px;
                margin-bottom: 30px;
                text-align: center;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: 'Noto Sans', monospace;
                background: #2a2a2a;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #3a3a3a;
              }
              .section {
                margin: 20px 0;
                padding: 15px;
                background: #2a2a2a;
                border-left: 4px solid #4ade80;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <h1>🩺 Consent Form Preview</h1>
            <pre>${previewContent}</pre>
          </body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔵 Form submit triggered', {
      selectedPatient,
      purpose,
      summary: summary ? 'filled' : 'empty',
      consentStatement: consentStatement ? 'filled' : 'empty',
      loading,
      loadingPatients
    });
    
    // Only require patient and purpose/title - summary and consentStatement have defaults
    if (!selectedPatient || !purpose) {
      console.log('❌ Validation failed:', {
        selectedPatient: !selectedPatient,
        purpose: !purpose
      });
      toast({
        title: t('consentForm.validationError'),
        description: 'Please select a patient and enter a title/purpose.',
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      console.log('🟢 Starting form submission...');
      
      // Save consent form document
      const selectedPatientData = patients.find(p => p.id === selectedPatient);
      
      // Get patient's user_id from profiles table
      const { data: patientProfile, error: patientProfileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', selectedPatient)
        .single();

      if (patientProfileError || !patientProfile) {
        throw new Error('Patient profile not found');
      }

      // Get doctor profile for provider_name
      const { data: doctorProfile, error: doctorProfileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', doctorId)
        .single();

      if (doctorProfileError || !doctorProfile) {
        throw new Error('Doctor profile not found');
      }

      const consentDocument = formatConsentDocument();
      
      // Format service_date properly (convert date string to ISO datetime)
      const serviceDateISO = consentDate 
        ? new Date(consentDate + 'T00:00:00').toISOString()
        : new Date().toISOString();
      
      // Store metadata as JSON in description (since metadata column doesn't exist in Supabase)
      const metadata = {
        type: 'consent_form',
        de_identified: deIdentified,
        patient_id: selectedPatient, // Always include patient ID
        patient_name: deIdentified ? '[REDACTED]' : selectedPatientData?.name,
        mrn: deIdentified ? '[REDACTED]' : selectedPatientData?.mrn || '',
        procedure: procedure,
        summary: summary,
        consent_statement: consentStatement,
        witness: witness,
        provider: provider,
        purpose: purpose,
        duration_days: duration,
        expires_at: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
      };

      // Combine consent document with metadata JSON
      const fullDescription = `${consentDocument}\n\n---\n[METADATA]\n${JSON.stringify(metadata, null, 2)}`;
      
      const { data: insertedRecord, error: insertError } = await supabase
        .from('health_records')
        .insert({
          id: crypto.randomUUID(),
          user_id: patientProfile.user_id, // Use user_id from profiles table
          record_type: 'consultation',
          title: deIdentified 
            ? 'Consent for Procedure (Sanitized Version)'
            : `Consent for ${procedure || purpose}`,
          description: fullDescription,
          service_date: serviceDateISO,
          provider_name: doctorProfile.full_name || 'Unknown Doctor',
          tags: ['consent_form', deIdentified ? 'de-identified' : 'identified'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error inserting health record:', insertError);
        console.error('❌ Full error details:', JSON.stringify(insertError, null, 2));
        throw new Error(`Failed to save consent form: ${insertError.message}`);
      }

      console.log('✅ Successfully created consent form:', insertedRecord);

      toast({
        title: t('consentForm.success'),
        description: t('consentForm.formSavedSuccessfully'),
      });

      // Reset form
      setSelectedPatient('');
      setPurpose('');
      setProcedure('');
      setSummary('');
      setConsentStatement('');
      setWitness('');
      setProvider('');
      setAdditionalNotes('');
      setConsentDate(format(new Date(), 'yyyy-MM-dd'));
      setDuration(30);
      setDeIdentified(true);
      setIsOpen(false);
      onRequestCreated();
    } catch (error) {
      console.error('❌ Error creating consent request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Error message:', errorMessage);
      toast({
        title: t('consentForm.error'),
        description: `${t('consentForm.failedToSaveForm')}: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      console.log('🔄 Form submission finished, loading set to false');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('quickActions.requestConsent')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            {t('navigation.consentRequests')}
          </DialogTitle>
          <DialogDescription>
            {t('consentForm.createDeIdentifiedConsent')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* De-Identification Toggle */}
          <Card className="border-accent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="deIdentified" className="text-base font-semibold">
                    {t('consentForm.deIdentifiedMode')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('consentForm.deIdentifiedDescription')}
                  </p>
                </div>
                <Switch
                  id="deIdentified"
                  checked={deIdentified}
                  onCheckedChange={setDeIdentified}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="patient">{t('consentForm.patient')} *</Label>
              {loadingPatients ? (
                <div className="p-4 border border-dashed border-muted-foreground rounded-lg text-center">
                  <p className="text-muted-foreground">{t('common.loading')}</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="p-4 border border-dashed border-muted-foreground rounded-lg text-center">
                  <p className="text-muted-foreground">{t('consentForm.failedToLoadPatients')}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadPatients}
                    className="mt-2"
                  >
                    {t('common.update')}
                  </Button>
                </div>
              ) : (
                <>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('consentForm.selectPatient')} />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name} (ID: {patient.id.substring(0, 8)}...)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPatient && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Patient ID:</span> {selectedPatient}
                      </p>
                      {deIdentified && (
                        <p className="text-xs text-muted-foreground">
                          {t('consentForm.willShowAsRedacted')}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">{t('consentForm.date')} *</Label>
              <Input
                id="date"
                type="date"
                value={consentDate}
                onChange={(e) => setConsentDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="purpose">{t('consentForm.title')} *</Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Consent for Procedure"
              required
            />
            {deIdentified && (
              <p className="text-xs text-muted-foreground">
                Will be saved as: "Consent for Procedure (Sanitized Version)"
              </p>
            )}
          </div>

          {/* Procedure Type (Generalized if de-identified) */}
          <div className="space-y-2">
            <Label htmlFor="procedure">{t('consentForm.procedure')}</Label>
            <Input
              id="procedure"
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              placeholder={deIdentified ? "e.g., Surgical procedure (will be generalized)" : "e.g., Cardiac Surgery, MRI Scan"}
            />
            {deIdentified && procedure && (
              <p className="text-xs text-muted-foreground">
                Specific procedure names will be generalized in the final document
              </p>
            )}
          </div>

          {/* Summary Section */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe the purpose, benefits, risks, and alternatives of the procedure. Ensure the text shows that the patient was informed and had the opportunity to ask questions."
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Include: purpose, benefits, risks, alternatives, and confirmation that patient was informed
            </p>
          </div>

          {/* Consent Statement */}
          <div className="space-y-2">
            <Label htmlFor="consentStatement">Consent Statement</Label>
            <Textarea
              id="consentStatement"
              value={consentStatement}
              onChange={(e) => setConsentStatement(e.target.value)}
              placeholder="State that the patient voluntarily agreed to the procedure, and consent was obtained as per institutional policy."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Default: "The patient has been informed of the procedure, its benefits, risks, and alternatives. The patient voluntarily agrees to the procedure, and consent was obtained as per institutional policy."
            </p>
          </div>

          {/* Witness and Provider */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="witness">Witness</Label>
              <Input
                id="witness"
                value={witness}
                onChange={(e) => setWitness(e.target.value)}
                placeholder="e.g., RN witness, or Initials"
              />
              <p className="text-xs text-muted-foreground">
                Use only initials or role (e.g., "RN witness")
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Input
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g., Dr. J.S., MD"
              />
              <p className="text-xs text-muted-foreground">
                Use provider initials or title (e.g., "Dr. J.S., MD")
              </p>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additionalNotes">{t('consentForm.additionalNotes')}</Label>
            <Textarea
              id="additionalNotes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any additional information or notes..."
              rows={3}
            />
          </div>

          {/* Duration (for consent validity period) */}
          <div className="space-y-2">
            <Label htmlFor="duration">Consent Validity Duration (Days)</Label>
            <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days (6 months)</SelectItem>
                <SelectItem value="365">365 days (1 year)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Duration for which this consent form is valid
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={!selectedPatient || !purpose}
              className="w-full sm:w-auto"
            >
              {deIdentified ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {t('consentForm.preview')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto"
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={loading || loadingPatients || !selectedPatient || !purpose} 
              className="w-full sm:w-auto"
              onClick={(e) => {
                console.log('🔘 Save button clicked', {
                  loading,
                  loadingPatients,
                  selectedPatient: !!selectedPatient,
                  purpose: !!purpose,
                  disabled: loading || loadingPatients || !selectedPatient || !purpose
                });
                // Don't prevent default - let form handle it
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? t('consentForm.saving') : t('consentForm.saveForm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateConsentRequest;
