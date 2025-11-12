import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, User, Stethoscope, PlusCircle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { PageLoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { getPatientConsultations, Consultation } from '@/services/consultationService';
import { toast } from '@/hooks/use-toast';
import ConsultationBooking from '@/components/consultation/ConsultationBooking';
// Supabase removed - using Django API only

const PatientConsultations = () => {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadConsultations();
    }
  }, [user?.id]);

  const loadConsultations = async () => {
    try {
      setLoading(true);
      
      // First get the patient's profile ID
      const { data: patientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (profileError || !patientProfile) {
        throw new Error('Patient profile not found');
      }

      const data = await getPatientConsultations(patientProfile.id);
      setConsultations(data);
    } catch (error) {
      console.error('Error loading consultations:', error);
      toast({
        title: "Error",
        description: "Failed to load consultations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'scheduled_no_consent':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'scheduled_no_consent':
        return <AlertCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'confirmed':
        return 'Confirmed';
      case 'scheduled_no_consent':
        return 'Scheduled (No Consent)';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const upcomingConsultations = consultations.filter(c => 
    ['scheduled', 'confirmed', 'scheduled_no_consent'].includes(c.status)
  );
  const pastConsultations = consultations.filter(c => 
    ['completed', 'cancelled'].includes(c.status)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Consultations</h1>
            <p className="text-muted-foreground">
              Manage your doctor appointments and medical records access
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <PageLoadingSpinner text="Loading consultations..." />
        </div>
      </div>
    );
  }

  if (showBooking) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Book Consultation</h1>
            <p className="text-muted-foreground">
              Schedule a consultation with a doctor
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowBooking(false)}>
            Back to Consultations
          </Button>
        </div>
        <ConsultationBooking onBookingComplete={() => {
          setShowBooking(false);
          loadConsultations();
        }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Consultations</h1>
          <p className="text-muted-foreground">
            Manage your doctor appointments and medical records access
          </p>
        </div>
        <Button onClick={() => setShowBooking(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Book Consultation
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingConsultations.length}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {consultations.filter(c => c.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Past consultations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Consent</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {consultations.filter(c => c.status === 'confirmed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Full access granted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Consultations Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingConsultations.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastConsultations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingConsultations.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No upcoming consultations</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => setShowBooking(true)}
                  >
                    Book Your First Consultation
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingConsultations.map((consultation) => (
                <Card key={consultation.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Stethoscope className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">
                          Dr. {consultation.doctor?.full_name}
                        </CardTitle>
                        <Badge className={getStatusColor(consultation.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(consultation.status)}
                            <span>{getStatusLabel(consultation.status)}</span>
                          </div>
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(consultation.consultation_date), 'PPP')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {consultation.consultation_time}
                        </p>
                      </div>
                    </div>
                    <CardDescription>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{consultation.doctor?.specialization}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{consultation.consultation_time}</span>
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-medium text-sm">Reason for Consultation:</h4>
                        <p className="text-sm text-muted-foreground">{consultation.reason}</p>
                      </div>
                      {consultation.notes && (
                        <div>
                          <h4 className="font-medium text-sm">Notes:</h4>
                          <p className="text-sm text-muted-foreground">{consultation.notes}</p>
                        </div>
                      )}
                      {consultation.status === 'scheduled_no_consent' && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <AlertCircle className="h-4 w-4 inline mr-1" />
                            You haven't granted access to your medical records. 
                            The doctor will only see basic information.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastConsultations.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No past consultations</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pastConsultations.map((consultation) => (
                <Card key={consultation.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Stethoscope className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">
                          Dr. {consultation.doctor?.full_name}
                        </CardTitle>
                        <Badge className={getStatusColor(consultation.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(consultation.status)}
                            <span>{getStatusLabel(consultation.status)}</span>
                          </div>
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(consultation.consultation_date), 'PPP')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {consultation.consultation_time}
                        </p>
                      </div>
                    </div>
                    <CardDescription>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{consultation.doctor?.specialization}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{consultation.consultation_time}</span>
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-medium text-sm">Reason for Consultation:</h4>
                        <p className="text-sm text-muted-foreground">{consultation.reason}</p>
                      </div>
                      {consultation.notes && (
                        <div>
                          <h4 className="font-medium text-sm">Notes:</h4>
                          <p className="text-sm text-muted-foreground">{consultation.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientConsultations;
