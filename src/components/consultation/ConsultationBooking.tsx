import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Calendar from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, User, Stethoscope, CheckCircle, FileText, Plus, X, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ButtonLoadingSpinner } from '@/components/ui/loading-spinner';
import ConsultationConsentRequest from '@/components/consent/ConsultationConsentRequest';
// Supabase removed - using Django API only
import { useAuth } from '@/contexts/AuthContext';
import { autoMatchRecords, createConsultationWithSharedRecords, type SharedRecord } from '@/services/recordSharingService';

interface Doctor {
  id: string;
  full_name: string;
  specialization: string;
  hospital_affiliation: string;
}

interface ConsultationBookingProps {
  onBookingComplete?: (consultationId: string) => void;
}

const ConsultationBooking: React.FC<ConsultationBookingProps> = ({ onBookingComplete }) => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [consultationDate, setConsultationDate] = useState<Date>();
  const [consultationTime, setConsultationTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showConsent, setShowConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [consultationId, setConsultationId] = useState<string>('');
  
  // Record sharing states
  const [autoMatchedRecords, setAutoMatchedRecords] = useState<SharedRecord[]>([]);
  const [availableRecords, setAvailableRecords] = useState<SharedRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [showRecordSelection, setShowRecordSelection] = useState(false);

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  useEffect(() => {
    loadDoctors();
  }, []);

  // Auto-match records when reason changes
  useEffect(() => {
    if (reason && reason.length > 2 && user?.id) {
      handleAutoMatchRecords();
    }
  }, [reason, user?.id]);

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, specialization, hospital_affiliation')
        .eq('role', 'doctor')
        .order('full_name');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast({
        title: "Error",
        description: "Failed to load doctors list",
        variant: "destructive"
      });
    }
  };

  const handleAutoMatchRecords = async () => {
    if (!user?.id || !reason) return;

    setIsLoadingRecords(true);
    try {
      const result = await autoMatchRecords(user.id, reason);
      setAutoMatchedRecords(result.autoMatchedRecords);
      setAvailableRecords(result.availableRecords);
      
      // Auto-select the matched records
      setSelectedRecords(result.autoMatchedRecords.map(record => record.id));
      
      if (result.autoMatchedRecords.length > 0) {
        toast({
          title: "Records Auto-Matched",
          description: `Found ${result.autoMatchedRecords.length} relevant health records`,
        });
      }
    } catch (error) {
      console.error('Error auto-matching records:', error);
      toast({
        title: "Error",
        description: "Failed to auto-match health records",
        variant: "destructive"
      });
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleBookingSubmit = async () => {
    
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please log in to book consultations.",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedDoctor || !consultationDate || !consultationTime || !reason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // First get the patient's profile ID
      const { data: patientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError || !patientProfile) {
        throw new Error('Patient profile not found');
      }

      // Create consultation with shared records
      const consultation = await createConsultationWithSharedRecords({
        patient_id: patientProfile.id,
        doctor_id: selectedDoctor,
        consultation_date: consultationDate.toISOString().split('T')[0],
        consultation_time: consultationTime,
        reason: reason,
        notes: notes,
        shared_records: selectedRecords
      });

      // Store consultation ID and show consent request
      setConsultationId(consultation.id);
      setShowConsent(true);

    } catch (error) {
      console.error('Error creating consultation:', error);
      toast({
        title: "Error",
        description: "Failed to book consultation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConsentGiven = async (consentId: string) => {
    try {
      // Update consultation with consent
      const { error } = await supabase
        .from('consultations')
        .update({ consent_id: consentId, status: 'confirmed' })
        .eq('id', consultationId);

      if (error) throw error;

      toast({
        title: "Consultation Booked",
        description: "Your consultation has been successfully booked with consent granted.",
      });

      onBookingComplete?.(consultationId);
      setShowConsent(false);
    } catch (error) {
      console.error('Error updating consultation:', error);
      toast({
        title: "Error",
        description: "Failed to confirm consultation",
        variant: "destructive"
      });
    }
  };

  const handleConsentDenied = async () => {
    try {
      // Update consultation without consent
      const { error } = await supabase
        .from('consultations')
        .update({ status: 'scheduled_no_consent' })
        .eq('id', consultationId);

      if (error) throw error;

      toast({
        title: "Consultation Booked",
        description: "Your consultation has been booked. The doctor will only see basic information.",
      });

      onBookingComplete?.(consultationId);
      setShowConsent(false);
    } catch (error) {
      console.error('Error updating consultation:', error);
      toast({
        title: "Error",
        description: "Failed to confirm consultation",
        variant: "destructive"
      });
    }
  };

  const selectedDoctorData = doctors.find(d => d.id === selectedDoctor);

  if (showConsent && selectedDoctorData && consultationDate) {
    return (
      <ConsultationConsentRequest
        patientId={user?.id || ''}
        doctorId={selectedDoctor}
        doctorName={selectedDoctorData.full_name}
        consultationDate={format(consultationDate, 'PPP')}
        onConsentGiven={handleConsentGiven}
        onConsentDenied={handleConsentDenied}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          <CardTitle>Book Consultation</CardTitle>
        </div>
        <CardDescription>
          Schedule a consultation with a doctor and manage your medical records access
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label htmlFor="doctor">Select Doctor *</Label>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{doctor.full_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {doctor.specialization} • {doctor.hospital_affiliation}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Consultation Date */}
          <div className="space-y-2">
            <Label>Consultation Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !consultationDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {consultationDate ? format(consultationDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={consultationDate}
                  onSelect={setConsultationDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Consultation Time */}
          <div className="space-y-2">
            <Label htmlFor="time">Consultation Time *</Label>
            <Select value={consultationTime} onValueChange={setConsultationTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{time}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason for Consultation */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Consultation *</Label>
            <Input
              id="reason"
              placeholder="e.g., Annual checkup, specific symptoms"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        {/* Health Records Sharing Section */}
        {(autoMatchedRecords.length > 0 || availableRecords.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Health Records Sharing</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRecordSelection(!showRecordSelection)}
              >
                {showRecordSelection ? 'Hide' : 'Manage'} Records
              </Button>
            </div>

            {/* Auto-Matched Records */}
            {autoMatchedRecords.length > 0 && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base">Auto-Matched Records</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {autoMatchedRecords.length} found
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    These records were automatically matched based on your consultation reason
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {autoMatchedRecords.map((record) => (
                    <div key={record.id} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded border">
                      <Checkbox
                        checked={selectedRecords.includes(record.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRecords(prev => [...prev, record.id]);
                          } else {
                            setSelectedRecords(prev => prev.filter(id => id !== record.id));
                          }
                        }}
                      />
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{record.title}</p>
                        <p className="text-xs text-gray-500">
                          {record.record_type} • {format(new Date(record.service_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Auto-matched
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Manual Record Selection */}
            {showRecordSelection && availableRecords.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Add More Records</CardTitle>
                  <CardDescription className="text-sm">
                    Select additional health records to share with your doctor
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                  {availableRecords.map((record) => (
                    <div key={record.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded border">
                      <Checkbox
                        checked={selectedRecords.includes(record.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRecords(prev => [...prev, record.id]);
                          } else {
                            setSelectedRecords(prev => prev.filter(id => id !== record.id));
                          }
                        }}
                      />
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{record.title}</p>
                        <p className="text-xs text-gray-500">
                          {record.record_type} • {format(new Date(record.service_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Selected Records Summary */}
            {selectedRecords.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{selectedRecords.length} record{selectedRecords.length !== 1 ? 's' : ''} selected for sharing</span>
              </div>
            )}
          </div>
        )}

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional information you'd like the doctor to know..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Doctor Info Preview */}
        {selectedDoctorData && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">{selectedDoctorData.full_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedDoctorData.specialization}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedDoctorData.hospital_affiliation}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleBookingSubmit}
            disabled={isLoading || !selectedDoctor || !consultationDate || !consultationTime || !reason}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <ButtonLoadingSpinner />
                Booking...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Book Consultation
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsultationBooking;
