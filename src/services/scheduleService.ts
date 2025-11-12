// Supabase removed - using Django API only
import { Tables } from '@/integrations/supabase/types';

// Define the calendar event interface that matches what the calendar component expects
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'consultation' | 'operation' | 'meeting' | 'available' | 'blocked' | 'followup' | 'reminder';
  patientName?: string;
  notes?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  doctorId?: string;
  patientId?: string;
}

// Type for consultation data from Supabase
type Consultation = Tables<'consultations'>;

export class ScheduleService {
  /**
   * Get all calendar events for a doctor
   */
  static async getDoctorEvents(doctorId: string): Promise<CalendarEvent[]> {
    try {
      // Fetch consultations for the doctor
      const { data: consultations, error: consultationError } = await supabase
        .from('consultations')
        .select(`
          id,
          patient_id,
          doctor_id,
          consultation_date,
          consultation_time,
          reason,
          notes,
          status,
          profiles!consultations_patient_id_fkey(full_name)
        `)
        .eq('doctor_id', doctorId)
        .order('consultation_date', { ascending: true });

      if (consultationError) {
        console.error('Error fetching consultations:', consultationError);
        throw consultationError;
      }

      console.log('Fetched consultations:', consultations);

      // Convert consultations to calendar events
      const events: CalendarEvent[] = consultations?.map((consultation: any) => {
        const consultationDate = new Date(consultation.consultation_date);
        const [hours, minutes] = consultation.consultation_time.split(':').map(Number);
        
        // Set the time for the consultation
        const startTime = new Date(consultationDate);
        startTime.setHours(hours, minutes, 0, 0);
        
      // Calculate end time (default 30 minutes since duration columns don't exist yet)
      const endTime = new Date(startTime.getTime() + 30 * 60000);

        const patientName = consultation.profiles?.full_name || '';
        
        // Determine event type based on patient_id and status
        let eventType: 'consultation' | 'blocked' | 'followup' | 'meeting' | 'reminder' = 'consultation';
        let title = consultation.reason;
        
        if (!consultation.patient_id) {
          // No patient means it's a non-consultation event
          if (consultation.status === 'cancelled') {
            eventType = 'blocked';
          } else {
            // Try to determine type from reason
            const reason = consultation.reason?.toLowerCase() || '';
            if (reason.includes('meeting')) {
              eventType = 'meeting';
            } else if (reason.includes('reminder')) {
              eventType = 'reminder';
            } else if (reason.includes('follow') || reason.includes('followup')) {
              eventType = 'followup';
            } else {
              eventType = 'blocked';
            }
          }
        } else {
          // Has patient - determine if it's consultation or followup
          const reason = consultation.reason?.toLowerCase() || '';
          if (reason.includes('follow') || reason.includes('followup')) {
            eventType = 'followup';
            title = `Follow-up - ${patientName}`;
          } else {
            eventType = 'consultation';
            title = `Consultation - ${patientName}`;
          }
        }
        
        return {
          id: consultation.id,
          title: title,
          start: startTime,
          end: endTime,
          type: eventType,
          patientName: patientName,
          notes: consultation.notes,
          status: consultation.status === 'scheduled' ? 'pending' : 
                  consultation.status === 'confirmed' ? 'confirmed' : 
                  consultation.status === 'cancelled' ? 'cancelled' : 'pending',
          doctorId: consultation.doctor_id,
          patientId: consultation.patient_id,
        };
      }) || [];

      return events;
    } catch (error) {
      console.error('Error in getDoctorEvents:', error);
      return [];
    }
  }

  /**
   * Get events for a specific date range
   */
  static async getEventsForDateRange(
    doctorId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<CalendarEvent[]> {
    try {
      const { data: consultations, error } = await supabase
        .from('consultations')
        .select(`
          id,
          patient_id,
          doctor_id,
          consultation_date,
          consultation_time,
          reason,
          notes,
          status,
          profiles!consultations_patient_id_fkey(full_name)
        `)
        .eq('doctor_id', doctorId)
        .gte('consultation_date', startDate.toISOString().split('T')[0])
        .lte('consultation_date', endDate.toISOString().split('T')[0])
        .order('consultation_date', { ascending: true });

      if (error) {
        console.error('Error fetching consultations for date range:', error);
        throw error;
      }

      return consultations?.map((consultation) => {
        const consultationDate = new Date(consultation.consultation_date);
        const [hours, minutes] = consultation.consultation_time.split(':').map(Number);
        
        const startTime = new Date(consultationDate);
        startTime.setHours(hours, minutes, 0, 0);
        
      // Calculate end time (default 30 minutes since duration columns don't exist yet)
      const endTime = new Date(startTime.getTime() + 30 * 60000);

        return {
          id: consultation.id,
          title: `Consultation - ${consultation.profiles?.full_name || 'Unknown Patient'}`,
          start: startTime,
          end: endTime,
          type: 'consultation',
          patientName: consultation.profiles?.full_name || 'Unknown Patient',
          notes: consultation.notes || consultation.reason,
          status: consultation.status === 'scheduled' ? 'pending' : 
                  consultation.status === 'confirmed' ? 'confirmed' : 
                  consultation.status === 'cancelled' ? 'cancelled' : 'pending',
          doctorId: consultation.doctor_id,
          patientId: consultation.patient_id,
        };
      }) || [];
    } catch (error) {
      console.error('Error in getEventsForDateRange:', error);
      return [];
    }
  }

  /**
   * Create a new consultation event
   */
  static async createConsultation(consultationData: {
    patientId: string | null;
    doctorId: string;
    consultationDate: string;
    consultationTime: string;
    reason: string;
    notes?: string;
    status?: string;
    durationMinutes?: number;
  }): Promise<CalendarEvent | null> {
    try {
      console.log('Creating consultation with data:', consultationData);
      
      const { data, error } = await supabase
        .from('consultations')
        .insert([{
          patient_id: consultationData.patientId, // Can be null now
          doctor_id: consultationData.doctorId,
          consultation_date: consultationData.consultationDate,
          consultation_time: consultationData.consultationTime,
          reason: consultationData.reason,
          notes: consultationData.notes,
          status: (consultationData.status as any) || 'scheduled'
        }])
        .select(`
          id,
          patient_id,
          doctor_id,
          consultation_date,
          consultation_time,
          reason,
          notes,
          status,
          profiles!consultations_patient_id_fkey(full_name)
        `)
        .single();

      if (error) {
        console.error('Error creating consultation:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      // Convert to calendar event
      const consultationDate = new Date(data.consultation_date);
      const [hours, minutes] = data.consultation_time.split(':').map(Number);
      
      const startTime = new Date(consultationDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      // Calculate end time using database values
      let endTime: Date;
      if ((data as any).end_time) {
        // Use end_time from database if available
        const [endHours, endMinutes] = (data as any).end_time.split(':').map(Number);
        endTime = new Date(consultationDate);
        endTime.setHours(endHours, endMinutes, 0, 0);
      } else {
        // Fallback to calculating from duration_minutes
        const duration = (data as any).duration_minutes || 30;
        endTime = new Date(startTime.getTime() + duration * 60000);
      }

      const patientName = data.profiles?.full_name || 'Unknown Patient';
      
      return {
        id: data.id,
        title: `Consultation - ${patientName}`,
        start: startTime,
        end: endTime,
        type: 'consultation',
        patientName: patientName,
        notes: data.notes || data.reason,
        status: data.status === 'scheduled' ? 'pending' : 
                data.status === 'confirmed' ? 'confirmed' : 
                data.status === 'cancelled' ? 'cancelled' : 'pending',
        doctorId: data.doctor_id,
        patientId: data.patient_id,
      };
    } catch (error) {
      console.error('Error in createConsultation:', error);
      return null;
    }
  }

  /**
   * Update a consultation event
   */
  static async updateConsultation(
    consultationId: string, 
    updates: Partial<{
      consultationDate: string;
      consultationTime: string;
      reason: string;
      notes: string;
      status: 'scheduled' | 'confirmed' | 'scheduled_no_consent' | 'completed' | 'cancelled';
    }>
  ): Promise<CalendarEvent | null> {
    try {
      console.log('Updating consultation:', { consultationId, updates });
      
      // Convert camelCase to snake_case for Supabase
      const supabaseUpdates: any = {};
      if (updates.consultationDate) supabaseUpdates.consultation_date = updates.consultationDate;
      if (updates.consultationTime) supabaseUpdates.consultation_time = updates.consultationTime;
      if (updates.reason) supabaseUpdates.reason = updates.reason;
      if (updates.notes) supabaseUpdates.notes = updates.notes;
      if (updates.status) supabaseUpdates.status = updates.status;

      console.log('Supabase updates:', supabaseUpdates);

      const { data, error } = await supabase
        .from('consultations')
        .update(supabaseUpdates)
        .eq('id', consultationId)
        .select(`
          id,
          patient_id,
          doctor_id,
          consultation_date,
          consultation_time,
          reason,
          notes,
          status,
          profiles!consultations_patient_id_fkey(full_name)
        `)
        .single();

      if (error) {
        console.error('Error updating consultation:', error);
        throw error;
      }

      console.log('Consultation updated successfully:', data);
      console.log('Updated consultation details:', {
        id: data.id,
        reason: data.reason,
        notes: data.notes,
        consultation_date: data.consultation_date,
        consultation_time: data.consultation_time,
        status: data.status
      });

      // Convert to calendar event
      const consultationDate = new Date(data.consultation_date);
      const [hours, minutes] = data.consultation_time.split(':').map(Number);
      
      const startTime = new Date(consultationDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      // Calculate end time using database values
      let endTime: Date;
      if ((data as any).end_time) {
        // Use end_time from database if available
        const [endHours, endMinutes] = (data as any).end_time.split(':').map(Number);
        endTime = new Date(consultationDate);
        endTime.setHours(endHours, endMinutes, 0, 0);
      } else {
        // Fallback to calculating from duration_minutes
        const duration = (data as any).duration_minutes || 30;
        endTime = new Date(startTime.getTime() + duration * 60000);
      }

      const patientName = data.profiles?.full_name || 'Unknown Patient';
      
      return {
        id: data.id,
        title: `Consultation - ${patientName}`,
        start: startTime,
        end: endTime,
        type: 'consultation',
        patientName: patientName,
        notes: data.notes || data.reason,
        status: data.status === 'scheduled' ? 'pending' : 
                data.status === 'confirmed' ? 'confirmed' : 
                data.status === 'cancelled' ? 'cancelled' : 'pending',
        doctorId: data.doctor_id,
        patientId: data.patient_id,
      };
    } catch (error) {
      console.error('Error in updateConsultation:', error);
      return null;
    }
  }

  /**
   * Delete a consultation event
   */
  static async deleteConsultation(consultationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('consultations')
        .delete()
        .eq('id', consultationId);

      if (error) {
        console.error('Error deleting consultation:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteConsultation:', error);
      return false;
    }
  }
}
