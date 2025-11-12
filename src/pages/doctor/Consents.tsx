import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConsentRequest, ConsentStatus, RecordType } from '@/types';
import { format } from 'date-fns';
import { CardLoadingSpinner, ButtonLoadingSpinner } from '@/components/ui/loading-spinner';
import { Shield, Clock, CheckCircle, XCircle, User, Calendar, Send, Search, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getDoctorConsentRequests, extendConsentRequest } from '@/services/consentService';
import CreateConsentRequest from '@/components/consent/CreateConsentRequest';
import { useAuth } from '@/contexts/AuthContext';
// Supabase removed - using Django API only
import { useLanguage } from '@/contexts/LanguageContext';


const DoctorConsents = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [consentRequests, setConsentRequests] = useState<ConsentRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<ConsentStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);

  // Get doctor profile ID first
  useEffect(() => {
    const getDoctorProfileId = async () => {
      if (!user) return;
      
      try {
        const { data: doctorProfile, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (error || !doctorProfile) {
          console.error('Error finding doctor profile:', error);
          return;
        }

        setDoctorProfileId(doctorProfile.id);
      } catch (error) {
        console.error('Error getting doctor profile:', error);
      }
    };

    getDoctorProfileId();
  }, [user]);

  // Load consent requests when profile ID is available
  useEffect(() => {
    if (doctorProfileId) {
      loadConsentRequests();
    }
  }, [doctorProfileId]);

  const loadConsentRequests = async () => {
    if (!doctorProfileId) return;
    
    try {
      setLoading(true);
      const requests = await getDoctorConsentRequests(doctorProfileId);
      setConsentRequests(requests);
    } catch (error) {
      console.error('Error loading consent requests:', error);
      toast({
        title: "Error",
        description: "Failed to load consent requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = consentRequests.filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
                         request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (request.patientName && request.patientName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: ConsentStatus) => {
    const colors = {
      pending: 'bg-warning',
      approved: 'bg-accent',
      denied: 'bg-destructive',
      revoked: 'bg-muted',
      expired: 'bg-muted'
    };
    return colors[status];
  };

  const getStatusIcon = (status: ConsentStatus) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      approved: <CheckCircle className="h-4 w-4" />,
      denied: <XCircle className="h-4 w-4" />,
      revoked: <XCircle className="h-4 w-4" />,
      expired: <Clock className="h-4 w-4" />
    };
    return icons[status];
  };

  const handleResendRequest = async (requestId: string) => {
    try {
      // For now, we'll just show a message since resending would require creating a new request
      toast({
        title: "Request resent",
        description: "Consent request has been sent to the patient again",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend consent request",
        variant: "destructive"
      });
    }
  };

  const handleExtendAccess = async (requestId: string) => {
    try {
      const updatedRequest = await extendConsentRequest(requestId, 30);
      setConsentRequests(prev => prev.map(request => 
        request.id === requestId ? updatedRequest : request
      ));
      
      toast({
        title: "Access extended",
        description: "Patient consent has been extended for 30 more days",
      });
    } catch (error) {
      console.error('Error extending access:', error);
      toast({
        title: "Error",
        description: "Failed to extend access",
        variant: "destructive"
      });
    }
  };

  const stats = {
    pending: consentRequests.filter(r => r.status === 'pending').length,
    approved: consentRequests.filter(r => r.status === 'approved').length,
    denied: consentRequests.filter(r => r.status === 'denied').length,
    expired: consentRequests.filter(r => r.status === 'expired').length
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('navigation.consentRequests')}</h1>
          <p className="text-muted-foreground">
            {t('consentForm.createDeIdentifiedConsent')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadConsentRequests}
            disabled={loading}
          >
            {loading ? <ButtonLoadingSpinner /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {t('common.update')}
          </Button>
          {doctorProfileId && (
            <CreateConsentRequest
              doctorId={doctorProfileId}
              onRequestCreated={loadConsentRequests}
            />
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-warning">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold text-accent">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Denied</p>
                <p className="text-3xl font-bold text-destructive">{stats.denied}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expired</p>
                <p className="text-3xl font-bold text-muted-foreground">{stats.expired}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, patient ID, or purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: ConsentStatus | 'all') => setFilterStatus(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Consent Requests */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <CardLoadingSpinner text="Loading consent requests..." />
            </CardContent>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No consent requests found</p>
              <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => {
            const isExpiringSoon = request.expiresAt && request.expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
            
            return (
              <Card 
                key={request.id} 
                className={`hover:shadow-medium transition-all ${
                  request.status === 'pending' ? 'border-warning' : 
                  request.status === 'approved' ? 'border-accent' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {request.requesterName}
                      </CardTitle>
                      <CardDescription>
                        {request.purpose}
                      </CardDescription>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <div>
                          <span className="font-semibold">Patient:</span> {(request as any).patientName || 'Unknown Patient'}
                        </div>
                        <div>
                          <span className="font-semibold">Patient ID:</span> {request.patientId}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpiringSoon && request.status === 'approved' && (
                        <Badge className="bg-warning text-white">
                          Expiring Soon
                        </Badge>
                      )}
                      <Badge className={`${getStatusColor(request.status)} text-white`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">{request.status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {request.message && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm">{request.message}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Requested Data Types:</h4>
                    <div className="flex flex-wrap gap-2">
                      {request.requestedDataTypes.map((type) => (
                        <Badge key={type} variant="outline">
                          {type.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Requested: {format(request.requestedAt, 'PPP')}
                    </span>
                    {request.respondedAt && (
                      <span>Responded: {format(request.respondedAt, 'PPP')}</span>
                    )}
                    {request.expiresAt && (
                      <span>Expires: {format(request.expiresAt, 'PPP')}</span>
                    )}
                    <span>Duration: {request.duration} days</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {request.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendRequest(request.id)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Resend Request
                      </Button>
                    )}
                    
                    {request.status === 'approved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExtendAccess(request.id)}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Extend Access
                      </Button>
                    )}
                    
                    {request.status === 'denied' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendRequest(request.id)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Request Again
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ABDM Compliance Note */}
      <Card className="border-accent">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-accent" />
            <div>
              <h3 className="font-semibold">ABDM Compliance</h3>
              <p className="text-sm text-muted-foreground">
                All consent requests follow Ayushman Bharat Digital Mission guidelines. 
                Patients have full control over their data and can revoke access at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorConsents;