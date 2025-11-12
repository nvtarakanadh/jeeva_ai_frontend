import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ConsentRequest, ConsentStatus, RecordType } from '@/types';
import { format } from 'date-fns';
import { CardLoadingSpinner, ButtonLoadingSpinner } from '@/components/ui/loading-spinner';
import { Shield, Clock, CheckCircle, XCircle, AlertCircle, User, Calendar, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getPatientConsentRequests, respondToConsentRequest, revokeConsentRequest } from '@/services/consentService';
import { useAuth } from '@/contexts/AuthContext';
// Supabase removed - using Django API only

const ConsentManagement = () => {
  const { user } = useAuth();
  const [consentRequests, setConsentRequests] = useState<ConsentRequest[]>([]);
  const [selectedDataTypes, setSelectedDataTypes] = useState<RecordType[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [patientProfileId, setPatientProfileId] = useState<string | null>(null);

  // Load patient profile ID first, then consent requests
  useEffect(() => {
    if (user?.id) {
      loadPatientProfile();
    }
  }, [user?.id]);

  const loadPatientProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .eq('role', 'patient')
        .single();

      if (error) throw error;
      setPatientProfileId(profile.id);
    } catch (error) {
      console.error('Error loading patient profile:', error);
      toast({
        title: "Error",
        description: "Failed to load patient profile",
        variant: "destructive"
      });
    }
  };

  // Load consent requests when profile ID is available
  useEffect(() => {
    if (patientProfileId) {
      loadConsentRequests();
    }
  }, [patientProfileId]);

  const loadConsentRequests = async () => {
    if (!patientProfileId) return;
    
    try {
      setLoading(true);
      const requests = await getPatientConsentRequests(patientProfileId);
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

  const handleConsentResponse = async (requestId: string, status: 'approved' | 'denied', dataTypes?: RecordType[]) => {
    try {
      const updatedRequest = await respondToConsentRequest(requestId, { status, dataTypes });
      setConsentRequests(prev => prev.map(request => 
        request.id === requestId ? updatedRequest : request
      ));

      toast({
        title: status === 'approved' ? "Consent Approved" : "Consent Denied",
        description: `Request from ${consentRequests.find(r => r.id === requestId)?.requesterName} has been ${status}`,
      });

      setSelectedRequest(null);
      setSelectedDataTypes([]);
    } catch (error) {
      console.error('Error responding to consent request:', error);
      toast({
        title: "Error",
        description: "Failed to update consent",
        variant: "destructive"
      });
    }
  };

  const handleRevokeConsent = async (requestId: string) => {
    try {
      const updatedRequest = await revokeConsentRequest(requestId);
      setConsentRequests(prev => prev.map(request => 
        request.id === requestId ? updatedRequest : request
      ));

      toast({
        title: "Consent Revoked",
        description: "Access has been revoked successfully",
      });
    } catch (error) {
      console.error('Error revoking consent:', error);
      toast({
        title: "Error",
        description: "Failed to revoke consent",
        variant: "destructive"
      });
    }
  };

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
      expired: <AlertCircle className="h-4 w-4" />
    };
    return icons[status];
  };

  const pendingRequests = consentRequests.filter(r => r.status === 'pending');
  const activeConsents = consentRequests.filter(r => r.status === 'approved');
  const inactiveConsents = consentRequests.filter(r => ['denied', 'revoked', 'expired'].includes(r.status));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Consent Management</h1>
          <p className="text-muted-foreground">
            Control who has access to your health data and for what purpose
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadConsentRequests}
          disabled={loading}
        >
          {loading ? <ButtonLoadingSpinner /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-3xl font-bold text-warning">{pendingRequests.length}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Consents</p>
                <p className="text-3xl font-bold text-accent">{activeConsents.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-3xl font-bold">{consentRequests.length}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading ? (
        <Card>
          <CardContent className="text-center py-12">
            <CardLoadingSpinner text="Loading consent requests..." />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-warning">Pending Consent Requests</h2>
              {pendingRequests.map((request) => (
            <Card key={request.id} className="border-warning">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {request.requesterName}
                    </CardTitle>
                    <CardDescription>{request.purpose}</CardDescription>
                  </div>
                  <Badge className={`${getStatusColor(request.status)} text-white`}>
                    {getStatusIcon(request.status)}
                    <span className="ml-1 capitalize">{request.status}</span>
                  </Badge>
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
                  <span>Duration: {request.duration} days</span>
                </div>

                {selectedRequest === request.id ? (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-semibold">Select data to share:</h4>
                    <div className="space-y-2">
                      {request.requestedDataTypes.map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={selectedDataTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedDataTypes(prev => [...prev, type]);
                              } else {
                                setSelectedDataTypes(prev => prev.filter(t => t !== type));
                              }
                            }}
                          />
                          <label htmlFor={type} className="text-sm font-medium capitalize">
                            {type.replace('_', ' ')}
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="medical"
                        onClick={() => handleConsentResponse(request.id, 'approved', selectedDataTypes)}
                        disabled={selectedDataTypes.length === 0}
                      >
                        Approve Consent
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleConsentResponse(request.id, 'denied')}
                      >
                        Deny
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(null);
                          setSelectedDataTypes([]);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedRequest(request.id)}
                    >
                      Review Request
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleConsentResponse(request.id, 'denied')}
                    >
                      Deny
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active Consents */}
      {activeConsents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-accent">Active Consents</h2>
          {activeConsents.map((request) => (
            <Card key={request.id} className="border-accent">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {request.requesterName}
                    </CardTitle>
                    <CardDescription>{request.purpose}</CardDescription>
                  </div>
                  <Badge className={`${getStatusColor(request.status)} text-white`}>
                    {getStatusIcon(request.status)}
                    <span className="ml-1 capitalize">{request.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Shared Data Types:</h4>
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
                    <CheckCircle className="h-3 w-3" />
                    Approved: {request.respondedAt && format(request.respondedAt, 'PPP')}
                  </span>
                  {request.expiresAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expires: {format(request.expiresAt, 'PPP')}
                    </span>
                  )}
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRevokeConsent(request.id)}
                >
                  Revoke Access
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inactive Consents */}
      {inactiveConsents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-muted-foreground">Consent History</h2>
          {inactiveConsents.map((request) => (
            <Card key={request.id} className="opacity-75">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {request.requesterName}
                    </CardTitle>
                    <CardDescription>{request.purpose}</CardDescription>
                  </div>
                  <Badge className={`${getStatusColor(request.status)} text-white`}>
                    {getStatusIcon(request.status)}
                    <span className="ml-1 capitalize">{request.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Requested: {format(request.requestedAt, 'PPP')}</span>
                  {request.respondedAt && (
                    <span>Responded: {format(request.respondedAt, 'PPP')}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default ConsentManagement;