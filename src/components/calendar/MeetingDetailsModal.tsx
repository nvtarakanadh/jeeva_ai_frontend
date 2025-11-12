import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/services/scheduleService';
import { getSharedRecordsForConsultation, type SharedRecord } from '@/services/recordSharingService';
import AIAnalysisTags from '@/components/ai/AIAnalysisTags';
import AIAnalysisModal from '@/components/ai/AIAnalysisModal';
import { toast } from '@/hooks/use-toast';
import { Calendar, Clock, User, Stethoscope, Briefcase, Activity, X, FileText, Eye, Sparkles, Brain } from 'lucide-react';
import { format } from 'date-fns';
// Supabase removed - using Django API only

interface MeetingDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
}

const MeetingDetailsModal: React.FC<MeetingDetailsModalProps> = ({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const [sharedRecords, setSharedRecords] = useState<SharedRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedRecordForAI, setSelectedRecordForAI] = useState<{
    id: string;
    title: string;
    type: string;
    description?: string;
    fileUrl?: string;
    fileName?: string;
    userId?: string;
  } | null>(null);
  const [viewingFile, setViewingFile] = useState<{ url: string; name: string; type: string } | null>(null);

  useEffect(() => {
    if (isOpen && event && event.type === 'consultation' && (event.status === 'confirmed' || event.status === 'scheduled')) {
      loadSharedRecords();
    }
  }, [isOpen, event]);

  const loadSharedRecords = async () => {
    if (!event) return;
    
    setLoadingRecords(true);
    try {
      const records = await getSharedRecordsForConsultation(event.id);
      setSharedRecords(records);
    } catch (error) {
      console.error('Error loading shared records:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const getFileType = (fileName: string) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(extension || '')) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) return 'image';
    if (['doc', 'docx'].includes(extension || '')) return 'document';
    return 'file';
  };

  const openFileViewer = async (fileUrl: string, fileName: string) => {
    try {
      const fileType = getFileType(fileName);
      
      // If it's already a full URL, use it directly
      let displayUrl = fileUrl;
      
      // Check if it's a Supabase storage path and try different bucket names
      if (fileUrl && !fileUrl.startsWith('http')) {
        // Try different possible bucket names
        const possibleBuckets = ['medical-files', 'prescriptions', 'consultation-notes', 'health-records', 'files'];
        
        for (const bucket of possibleBuckets) {
          try {
            const { data } = supabase.storage
              .from(bucket)
              .getPublicUrl(fileUrl);
            
            if (data.publicUrl) {
              displayUrl = data.publicUrl;
              break;
            }
          } catch (bucketError) {
            // Continue to next bucket
          }
        }
      }
      
      setViewingFile({ url: displayUrl, name: fileName, type: fileType });
    } catch (error) {
      // Still try to open with the original URL
      const fileType = getFileType(fileName);
      setViewingFile({ url: fileUrl, name: fileName, type: fileType });
    }
  };

  const openAIModal = (record: SharedRecord) => {
    setSelectedRecordForAI({
      id: record.id,
      title: record.title,
      type: record.record_type,
      description: record.title,
      fileUrl: record.file_url,
      fileName: record.file_name,
      userId: event?.patientId
    });
    setIsAIModalOpen(true);
  };

  if (!event) return null;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return <Stethoscope className="h-5 w-5" />;
      case 'operation':
        return <Activity className="h-5 w-5" />;
      case 'meeting':
        return <Briefcase className="h-5 w-5" />;
      case 'available':
        return <Clock className="h-5 w-5" />;
      default:
        return <Calendar className="h-5 w-5" />;
    }
  };

  const getEventColor = (type: string, status?: string) => {
    if (type === 'available') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return type === 'consultation' 
          ? 'bg-blue-100 text-blue-800 border-blue-200'
          : type === 'operation'
          ? 'bg-red-100 text-red-800 border-red-200'
          : 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return type === 'consultation' 
          ? 'bg-blue-100 text-blue-800 border-blue-200'
          : type === 'operation'
          ? 'bg-red-100 text-red-800 border-red-200'
          : 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'consultation':
        return 'Consultation';
      case 'operation':
        return 'Operation';
      case 'meeting':
        return 'Meeting';
      case 'available':
        return 'Available Slot';
      default:
        return 'Event';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getEventIcon(event.type)}
            <span>{event.title}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Event Type and Status */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getTypeText(event.type)}
            </Badge>
            <Badge 
              className={`text-xs ${getEventColor(event.type, event.status)}`}
            >
              {getStatusText(event.status)}
            </Badge>
          </div>

          {/* Date and Time */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Date:</span>
              <span>{format(event.start, 'EEEE, MMMM do, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Time:</span>
              <span>
                {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
              </span>
            </div>
          </div>

          {/* Patient Information */}
          {event.patientName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Patient:</span>
              <span className="font-medium text-blue-600">{event.patientName}</span>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Notes:</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                {event.notes}
              </p>
            </div>
          )}

          {/* Shared Records (for consultations) */}
          {event.type === 'consultation' && (event.status === 'confirmed' || event.status === 'scheduled') && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Patient Shared Records:</h4>
              {loadingRecords ? (
                <div className="text-sm text-gray-500">Loading records...</div>
              ) : sharedRecords.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sharedRecords.map((record) => (
                    <div key={record.id} className="p-2 border rounded-md bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3 text-gray-500" />
                            <span className="text-sm font-medium">{record.title}</span>
                            <div className="flex items-center gap-1">
                              {record.is_auto_matched && (
                                <Badge variant="secondary" className="text-xs">
                                  <Sparkles className="h-2 w-2 mr-1" />
                                  Auto
                                </Badge>
                              )}
                              {record.ai_analysis && (
                                <AIAnalysisTags 
                                  priority={record.ai_analysis.priority}
                                  riskLevel={record.ai_analysis.risk_level}
                                  className="text-xs"
                                />
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            {record.record_type} • {format(new Date(record.service_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 px-2"
                            onClick={() => openFileViewer(record.file_url || '', record.file_name || 'Unknown File')}
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 px-2"
                            onClick={() => openAIModal(record)}
                          >
                            <Brain className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No records shared for this consultation</div>
              )}
            </div>
          )}

          {/* Duration */}
          <div className="text-sm text-gray-500">
            Duration: {Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60))} minutes
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            {onEdit && event.type !== 'available' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit(event)}
                className="flex-1"
              >
                Edit
              </Button>
            )}
            {onDelete && event.type !== 'available' && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => onDelete(event)}
                className="flex-1"
              >
                Delete
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* File Viewer Modal */}
      {viewingFile && (
        <Dialog open={!!viewingFile} onOpenChange={() => setViewingFile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {viewingFile.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {viewingFile.type === 'pdf' && (
                <div className="w-full h-[70vh] border rounded-lg">
                  <iframe
                    src={viewingFile.url}
                    className="w-full h-full border-0 rounded-lg"
                    title={viewingFile.name}
                    onError={(e) => {
                      console.error('Error loading PDF:', e);
                    }}
                  />
                </div>
              )}
              {viewingFile.type === 'image' && (
                <div className="flex items-center justify-center h-[70vh] bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <img
                      src={viewingFile.url}
                      alt={viewingFile.name}
                      className="max-w-full max-h-[60vh] object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="mt-4 space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(viewingFile.url, '_blank')}
                      >
                        Open in New Tab
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = viewingFile.url;
                          link.download = viewingFile.name;
                          link.click();
                        }}
                      >
                        Download
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 break-all">
                      URL: {viewingFile.url}
                    </p>
                  </div>
                </div>
              )}
              {viewingFile.type === 'document' && (
                <div className="flex items-center justify-center h-[70vh] bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">Document Preview</p>
                    <p className="text-sm text-gray-500 mb-4">{viewingFile.name}</p>
                    <p className="text-sm text-gray-400 mb-4">
                      Document preview not available in browser.
                    </p>
                    <Button 
                      onClick={() => window.open(viewingFile.url, '_blank')}
                      variant="outline"
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              )}
              {viewingFile.type === 'file' && (
                <div className="flex items-center justify-center h-[70vh] bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">File Preview</p>
                    <p className="text-sm text-gray-500 mb-4">{viewingFile.name}</p>
                    <p className="text-sm text-gray-400 mb-4">
                      File preview not available in browser.
                    </p>
                    <Button 
                      onClick={() => window.open(viewingFile.url, '_blank')}
                      variant="outline"
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-gray-500 truncate max-w-md">
                URL: {viewingFile.url}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(viewingFile.url, '_blank')}
                >
                  Open in New Tab
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = viewingFile.url;
                    link.download = viewingFile.name;
                    link.click();
                  }}
                >
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Analysis Modal */}
      {selectedRecordForAI && (
        <AIAnalysisModal
          isOpen={isAIModalOpen}
          onClose={() => {
            setIsAIModalOpen(false);
            setSelectedRecordForAI(null);
          }}
          recordId={selectedRecordForAI.id}
          recordTitle={selectedRecordForAI.title}
          recordType={selectedRecordForAI.type}
          recordDescription={selectedRecordForAI.description}
          fileUrl={selectedRecordForAI.fileUrl}
          fileName={selectedRecordForAI.fileName}
          patientId={selectedRecordForAI.userId}
        />
      )}

      {/* File Viewer Modal */}
      {viewingFile && (
        <Dialog open={!!viewingFile} onOpenChange={() => setViewingFile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {viewingFile.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {viewingFile.type === 'pdf' && (
                <div className="w-full h-[70vh] border rounded-lg">
                  <iframe
                    src={viewingFile.url}
                    className="w-full h-full border-0 rounded-lg"
                    title={viewingFile.name}
                    onError={(e) => {
                      console.error('Error loading PDF:', e);
                    }}
                  />
                </div>
              )}
              {viewingFile.type === 'image' && (
                <div className="flex items-center justify-center h-[70vh] bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <img
                      src={viewingFile.url}
                      alt={viewingFile.name}
                      className="max-w-full max-h-[60vh] object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-gray-600">If image doesn't load, try these options:</p>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(viewingFile.url, '_blank')}
                        >
                          Open in New Tab
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = viewingFile.url;
                            link.download = viewingFile.name;
                            link.click();
                          }}
                        >
                          Download
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 break-all">
                        URL: {viewingFile.url}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {viewingFile.type === 'document' && (
                <div className="flex items-center justify-center h-[70vh] bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">Document Preview</p>
                    <p className="text-sm text-gray-500 mb-4">{viewingFile.name}</p>
                    <p className="text-sm text-gray-400 mb-4">
                      Document preview not available in browser.
                    </p>
                    <Button 
                      onClick={() => window.open(viewingFile.url, '_blank')}
                      variant="outline"
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              )}
              {viewingFile.type === 'file' && (
                <div className="flex items-center justify-center h-[70vh] bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">File Preview</p>
                    <p className="text-sm text-gray-500 mb-4">{viewingFile.name}</p>
                    <p className="text-sm text-gray-400 mb-4">
                      File preview not available in browser.
                    </p>
                    <Button 
                      onClick={() => window.open(viewingFile.url, '_blank')}
                      variant="outline"
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-gray-500 truncate max-w-md">
                URL: {viewingFile.url}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(viewingFile.url, '_blank')}
                >
                  Open in New Tab
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = viewingFile.url;
                    link.download = viewingFile.name;
                    link.click();
                  }}
                >
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default MeetingDetailsModal;
