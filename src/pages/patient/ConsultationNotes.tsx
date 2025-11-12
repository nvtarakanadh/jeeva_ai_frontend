import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Stethoscope, Download, Eye, Calendar, User, Search, Filter, CheckCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { PageLoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { getConsultationNotesForPatient, ConsultationNote } from '@/services/prescriptionService';
import { toast } from '@/hooks/use-toast';
// Supabase removed - using Django API only

const PatientConsultationNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ConsultationNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDoctor, setFilterDoctor] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [selectedNote, setSelectedNote] = useState<ConsultationNote | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadConsultationNotes();
    }
  }, [user?.id]);

  const loadConsultationNotes = async () => {
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


      const data = await getConsultationNotesForPatient(patientProfile.id);
      setNotes(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load consultation notes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.recommendations.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDoctor = filterDoctor === 'all' || note.profiles?.full_name === filterDoctor;
    const matchesYear = filterYear === 'all' || 
                       new Date(note.consultation_date).getFullYear().toString() === filterYear;
    
    return matchesSearch && matchesDoctor && matchesYear;
  });

  const uniqueDoctors = Array.from(
    new Set(notes.map(n => n.profiles?.full_name).filter(Boolean))
  );

  const uniqueYears = Array.from(
    new Set(notes.map(n => new Date(n.consultation_date).getFullYear().toString()))
  ).sort((a, b) => parseInt(b) - parseInt(a));

  const currentYearNotes = filteredNotes.filter(n => 
    new Date(n.consultation_date).getFullYear() === new Date().getFullYear()
  );

  const pastNotes = filteredNotes.filter(n => 
    new Date(n.consultation_date).getFullYear() < new Date().getFullYear()
  );

  const handleDownload = async (note: ConsultationNote) => {
    if (!note.file_url) {
      toast({
        title: "No File Available",
        description: "This consultation note doesn't have an attached file.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = note.file_url;
      link.download = note.file_name || `consultation-note-${note.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({
        title: "Download Error",
        description: "Failed to download the consultation note file.",
        variant: "destructive"
      });
    }
  };

  const handleView = (note: ConsultationNote) => {
    setSelectedNote(note);
    setIsViewModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Consultation Notes</h1>
            <p className="text-muted-foreground">
              View and download your consultation notes from doctors
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
          <h1 className="text-3xl font-bold">My Consultation Notes</h1>
          <p className="text-muted-foreground">
            View and download your consultation notes from doctors
          </p>
        </div>
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
              All time consultation notes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Year</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentYearNotes.length}</div>
            <p className="text-xs text-muted-foreground">
              Notes in {new Date().getFullYear()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Files</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notes.filter(n => n.file_url).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Downloadable notes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search consultation notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterDoctor} onValueChange={setFilterDoctor}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {uniqueDoctors.map((doctor) => (
                  <SelectItem key={doctor} value={doctor}>
                    Dr. {doctor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {uniqueYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notes Tabs */}
      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">
            Current Year ({currentYearNotes.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past Years ({pastNotes.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({filteredNotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {currentYearNotes.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Stethoscope className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No consultation notes this year</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {currentYearNotes.map((note) => (
                <Card key={note.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Stethoscope className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{note.title}</CardTitle>
                        {note.file_url && (
                          <Badge variant="secondary">Has File</Badge>
                        )}
                        {note.follow_up_required && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Follow-up Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(note)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        {note.file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(note)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>Dr. {note.profiles?.full_name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(note.consultation_date), 'PPP')}</span>
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Diagnosis:</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {note.diagnosis}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Recommendations:</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {note.recommendations}
                        </p>
                      </div>

                      {note.description && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Description:</h4>
                          <p className="text-sm text-muted-foreground">{note.description}</p>
                        </div>
                      )}

                      {note.follow_up_required && note.follow_up_date && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-sm text-orange-800">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            <strong>Follow-up scheduled for:</strong> {format(new Date(note.follow_up_date), 'PPP')}
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
          {pastNotes.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No past consultation notes</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pastNotes.map((note) => (
                <Card key={note.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Stethoscope className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{note.title}</CardTitle>
                        {note.file_url && (
                          <Badge variant="secondary">Has File</Badge>
                        )}
                        {note.follow_up_required && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Follow-up Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(note)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        {note.file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(note)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>Dr. {note.profiles?.full_name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(note.consultation_date), 'PPP')}</span>
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Diagnosis:</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {note.diagnosis}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Recommendations:</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {note.recommendations}
                        </p>
                      </div>

                      {note.description && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Description:</h4>
                          <p className="text-sm text-muted-foreground">{note.description}</p>
                        </div>
                      )}

                      {note.follow_up_required && note.follow_up_date && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-sm text-orange-800">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            <strong>Follow-up scheduled for:</strong> {format(new Date(note.follow_up_date), 'PPP')}
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

        <TabsContent value="all" className="space-y-4">
          {filteredNotes.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No consultation notes found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredNotes.map((note) => (
                <Card key={note.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Stethoscope className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{note.title}</CardTitle>
                        {note.file_url && (
                          <Badge variant="secondary">Has File</Badge>
                        )}
                        {note.follow_up_required && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Follow-up Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(note)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        {note.file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(note)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>Dr. {note.profiles?.full_name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(note.consultation_date), 'PPP')}</span>
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Diagnosis:</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {note.diagnosis}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Recommendations:</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {note.recommendations}
                        </p>
                      </div>

                      {note.description && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Description:</h4>
                          <p className="text-sm text-muted-foreground">{note.description}</p>
                        </div>
                      )}

                      {note.follow_up_required && note.follow_up_date && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-sm text-orange-800">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            <strong>Follow-up scheduled for:</strong> {format(new Date(note.follow_up_date), 'PPP')}
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
      </Tabs>

      {/* Consultation Note Details Modal */}
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
                    <span>Dr. {selectedNote.profiles?.full_name || 'Unknown Doctor'}</span>
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
                      onClick={() => handleDownload(selectedNote)}
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
    </div>
  );
};

export default PatientConsultationNotes;
