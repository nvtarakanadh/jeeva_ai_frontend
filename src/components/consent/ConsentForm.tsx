import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { FileText, Plus, Save, Eye, EyeOff, Download, Shield } from 'lucide-react';
import { format } from 'date-fns';
// Django API only
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';

interface ConsentFormData {
  title: string;
  date: string;
  patientId: string;
  patientName: string;
  mrn: string;
  procedure: string;
  consentDetails: string;
  additionalNotes: string;
  deIdentified: boolean;
}

interface ConsentFormProps {
  onFormSaved?: () => void;
}

const ConsentForm: React.FC<ConsentFormProps> = ({ onFormSaved }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Array<{ id: string; name: string; mrn?: string }>>([]);
  const [formData, setFormData] = useState<ConsentFormData>({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    patientId: '',
    patientName: '',
    mrn: '',
    procedure: '',
    consentDetails: '',
    additionalNotes: '',
    deIdentified: true
  });

  useEffect(() => {
    if (isOpen) {
      loadPatients();
    }
  }, [isOpen]);

  const loadPatients = async () => {
    try {
      // Only doctors can load patients
      if (user?.role !== 'doctor') {
        console.warn('Only doctors can load patients');
        setPatients([]);
        return;
      }

      const patientsData = await authService.getPatients();
      setPatients(
        patientsData.map((p) => ({
          id: p.id,
          name: p.name || 'Unknown Patient',
          mrn: '' // MRN not available in current API response
        }))
      );
    } catch (error) {
      console.error('Error loading patients:', error);
      toast({
        title: t('consentForm.error'),
        description: t('consentForm.failedToLoadPatients'),
        variant: 'destructive'
      });
    }
  };

  const handlePatientChange = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    setFormData({
      ...formData,
      patientId,
      patientName: patient?.name || '',
      mrn: patient?.mrn || ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.date || !formData.patientId || !formData.procedure) {
      toast({
        title: t('consentForm.validationError'),
        description: t('consentForm.fillRequiredFields'),
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Get doctor profile ID
      const { data: doctorProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!doctorProfile) {
        throw new Error('Doctor profile not found');
      }

      // Prepare consent form data
      const consentData = {
        title: formData.title,
        date: formData.date,
        patient_id: formData.patientId,
        patient_name: formData.deIdentified ? '[REDACTED / Patient ID only]' : formData.patientName,
        mrn: formData.deIdentified ? '[REDACTED]' : formData.mrn,
        procedure: formData.procedure,
        consent_details: formData.consentDetails,
        additional_notes: formData.additionalNotes,
        de_identified: formData.deIdentified,
        doctor_id: doctorProfile.id,
        created_at: new Date().toISOString()
      };

      // Save to database (assuming a consent_forms table exists)
      // If the table doesn't exist, we'll save it as a health record
      const { error: saveError } = await supabase
        .from('health_records')
        .insert({
          id: crypto.randomUUID(),
          patient_id: formData.patientId,
          record_type: 'consultation',
          title: formData.deIdentified 
            ? `${formData.title} (Sanitized Version)`
            : formData.title,
          description: `Consent Form: ${formData.procedure}\n\n${formData.consentDetails}\n\n${formData.additionalNotes ? `Additional Notes: ${formData.additionalNotes}` : ''}`,
          record_date: formData.date,
          uploaded_at: new Date().toISOString(),
          uploaded_by: doctorProfile.id,
          metadata: {
            type: 'consent_form',
            de_identified: formData.deIdentified,
            patient_name: formData.deIdentified ? '[REDACTED]' : formData.patientName,
            mrn: formData.deIdentified ? '[REDACTED]' : formData.mrn,
            procedure: formData.procedure,
            consent_details: formData.consentDetails
          }
        });

      if (saveError) throw saveError;

      toast({
        title: t('consentForm.success'),
        description: t('consentForm.formSavedSuccessfully')
      });

      // Reset form
      setFormData({
        title: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        patientId: '',
        patientName: '',
        mrn: '',
        procedure: '',
        consentDetails: '',
        additionalNotes: '',
        deIdentified: true
      });

      setIsOpen(false);
      onFormSaved?.();
    } catch (error) {
      console.error('Error saving consent form:', error);
      toast({
        title: t('consentForm.error'),
        description: t('consentForm.failedToSaveForm'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    const previewContent = `
${formData.deIdentified ? 'Sanitized (De-Identified) Consent Note Example' : 'Consent Note'}

Title: ${formData.title || '[Insert title]'}${formData.deIdentified ? ' (Sanitized Version)' : ''}
Date: ${formData.date || '[Insert date]'}
Patient: ${formData.deIdentified ? '[REDACTED / Patient ID only]' : formData.patientName || '[Insert patient name]'}
MRN: ${formData.deIdentified ? '[REDACTED]' : formData.mrn || '[Insert MRN]'}

Procedure: ${formData.procedure || '[Insert procedure]'}

Consent Details:
${formData.consentDetails || '[Insert consent details]'}

${formData.additionalNotes ? `Additional Notes:\n${formData.additionalNotes}` : ''}
    `.trim();

    // Create a new window with the preview
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
                line-height: 1.6;
                background: #1a1a1a;
                color: #ffffff;
              }
              h1 {
                color: #4ade80;
                border-bottom: 2px solid #4ade80;
                padding-bottom: 10px;
                margin-bottom: 30px;
              }
              .field {
                margin-bottom: 15px;
              }
              .label {
                font-weight: bold;
                color: #94a3b8;
              }
              .value {
                margin-top: 5px;
                padding: 8px;
                background: #2a2a2a;
                border-radius: 4px;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
              }
            </style>
          </head>
          <body>
            <h1>${formData.deIdentified ? '🩺 Sanitized (De-Identified) Consent Note Example' : '🩺 Consent Note'}</h1>
            <pre>${previewContent}</pre>
          </body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          {t('consentForm.createConsentForm')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            {t('consentForm.createConsentForm')}
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
                  checked={formData.deIdentified}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, deIdentified: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">
                {t('consentForm.title')} *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('consentForm.titlePlaceholder')}
                required
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">
                {t('consentForm.date')} *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="patient">
                {t('consentForm.patient')} *
              </Label>
              <Select
                value={formData.patientId}
                onValueChange={handlePatientChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('consentForm.selectPatient')} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.patientId && (
                <p className="text-xs text-muted-foreground">
                  {formData.deIdentified
                    ? t('consentForm.willShowAsRedacted')
                    : `${t('consentForm.patientName')}: ${formData.patientName}`}
                </p>
              )}
            </div>

            {/* MRN */}
            <div className="space-y-2">
              <Label htmlFor="mrn">
                {t('consentForm.mrn')}
              </Label>
              <Input
                id="mrn"
                value={formData.mrn}
                onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                placeholder={t('consentForm.mrnPlaceholder')}
              />
              {formData.deIdentified && formData.mrn && (
                <p className="text-xs text-muted-foreground">
                  {t('consentForm.willShowAsRedacted')}
                </p>
              )}
            </div>

            {/* Procedure */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="procedure">
                {t('consentForm.procedure')} *
              </Label>
              <Input
                id="procedure"
                value={formData.procedure}
                onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                placeholder={t('consentForm.procedurePlaceholder')}
                required
              />
            </div>

            {/* Consent Details */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="consentDetails">
                {t('consentForm.consentDetails')} *
              </Label>
              <Textarea
                id="consentDetails"
                value={formData.consentDetails}
                onChange={(e) => setFormData({ ...formData, consentDetails: e.target.value })}
                placeholder={t('consentForm.consentDetailsPlaceholder')}
                rows={6}
                required
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="additionalNotes">
                {t('consentForm.additionalNotes')}
              </Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                placeholder={t('consentForm.additionalNotesPlaceholder')}
                rows={4}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={!formData.title || !formData.procedure}
            >
              {formData.deIdentified ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {t('consentForm.preview')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || !formData.title || !formData.date || !formData.patientId || !formData.procedure}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? t('consentForm.saving') : t('consentForm.saveForm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConsentForm;

