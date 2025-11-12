// Supabase removed - using Django API only

export interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: 'consultation' | 'blocked' | 'followup' | 'meeting' | 'reminder';
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected';
  doctor_id: string;
  patient_id?: string;
  notes?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  patient_name?: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: 'consultation' | 'blocked' | 'followup' | 'meeting' | 'reminder';
  status?: 'pending' | 'confirmed' | 'cancelled' | 'rejected';
  doctor_id: string;
  patient_id?: string;
  notes?: string;
  is_available?: boolean;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  event_type?: 'consultation' | 'blocked' | 'followup' | 'meeting' | 'reminder';
  status?: 'pending' | 'confirmed' | 'cancelled' | 'rejected';
  patient_id?: string;
  notes?: string;
  is_available?: boolean;
}

export class EventService {
  /**
   * Get all events for a doctor
   */
  static async getDoctorEvents(doctorId: string): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles!events_patient_id_fkey(full_name)
        `)
        .eq('doctor_id', doctorId)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }

      // Transform the data to include patient name
      const events = data?.map(event => ({
        ...event,
        patient_name: event.profiles?.full_name || null
      })) || [];

      console.log('Fetched events:', events);
      return events;
    } catch (error) {
      console.error('Error in getDoctorEvents:', error);
      return [];
    }
  }

  /**
   * Create a new event
   */
  static async createEvent(eventData: CreateEventData): Promise<Event | null> {
    try {
      console.log('Creating event with data:', eventData);
      
      // Validate required fields
      if (!eventData.title || !eventData.start_time || !eventData.end_time || !eventData.event_type || !eventData.doctor_id) {
        console.error('Missing required fields:', {
          title: eventData.title,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          event_type: eventData.event_type,
          doctor_id: eventData.doctor_id
        });
        throw new Error('Missing required fields');
      }

      const { data, error } = await supabase
        .from('events')
        .insert([{
          title: eventData.title,
          description: eventData.description || null,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          event_type: eventData.event_type,
          status: eventData.status || 'confirmed',
          doctor_id: eventData.doctor_id,
          patient_id: eventData.patient_id || null,
          notes: eventData.notes || null,
          is_available: eventData.is_available !== undefined ? eventData.is_available : false
        }])
        .select(`
          *,
          profiles!events_patient_id_fkey(full_name)
        `)
        .single();

      if (error) {
        console.error('Error creating event:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      // Transform the data to include patient name
      const event = {
        ...data,
        patient_name: data.profiles?.full_name || null
      };

      console.log('Event created successfully:', event);
      return event;
    } catch (error) {
      console.error('Error in createEvent:', error);
      return null;
    }
  }

  /**
   * Update an event
   */
  static async updateEvent(eventId: string, updates: UpdateEventData): Promise<Event | null> {
    try {
      console.log('Updating event:', { eventId, updates });
      
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select(`
          *,
          profiles!events_patient_id_fkey(full_name)
        `)
        .single();

      if (error) {
        console.error('Error updating event:', error);
        throw error;
      }

      // Transform the data to include patient name
      const event = {
        ...data,
        patient_name: data.profiles?.full_name || null
      };

      console.log('Event updated successfully:', event);
      return event;
    } catch (error) {
      console.error('Error in updateEvent:', error);
      return null;
    }
  }

  /**
   * Delete an event
   */
  static async deleteEvent(eventId: string): Promise<boolean> {
    try {
      console.log('Deleting event:', eventId);
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        throw error;
      }

      console.log('Event deleted successfully');
      return true;
    } catch (error) {
      console.error('Error in deleteEvent:', error);
      return false;
    }
  }

  /**
   * Get available time slots for a doctor on a specific date
   */
  static async getAvailableSlots(doctorId: string, date: string): Promise<{ start: string; end: string }[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('events')
        .select('start_time, end_time, is_available')
        .eq('doctor_id', doctorId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .eq('is_available', false)
        .order('start_time');

      if (error) {
        console.error('Error fetching blocked slots:', error);
        throw error;
      }

      // Generate available slots (simplified - you can make this more sophisticated)
      const availableSlots = [];
      const workingHours = [
        { start: 9, end: 12 },
        { start: 14, end: 17 }
      ];

      for (const period of workingHours) {
        for (let hour = period.start; hour < period.end; hour++) {
          const slotStart = new Date(startOfDay);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hour + 1, 0, 0, 0);

          // Check if this slot is blocked
          const isBlocked = data?.some(blocked => {
            const blockedStart = new Date(blocked.start_time);
            const blockedEnd = new Date(blocked.end_time);
            return (slotStart < blockedEnd && slotEnd > blockedStart);
          });

          if (!isBlocked) {
            availableSlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString()
            });
          }
        }
      }

      return availableSlots;
    } catch (error) {
      console.error('Error in getAvailableSlots:', error);
      return [];
    }
  }

  /**
   * Create a consultation request from patient
   */
  static async createConsultationRequest(
    doctorId: string,
    patientId: string,
    startTime: string,
    endTime: string,
    notes?: string
  ): Promise<Event | null> {
    try {
      const eventData: CreateEventData = {
        title: 'Consultation Request',
        start_time: startTime,
        end_time: endTime,
        event_type: 'consultation',
        status: 'pending',
        doctor_id: doctorId,
        patient_id: patientId,
        notes: notes,
        is_available: false
      };

      return await this.createEvent(eventData);
    } catch (error) {
      console.error('Error creating consultation request:', error);
      return null;
    }
  }

  /**
   * Approve a consultation request
   */
  static async approveConsultation(eventId: string): Promise<Event | null> {
    try {
      return await this.updateEvent(eventId, { 
        status: 'confirmed',
        is_available: false 
      });
    } catch (error) {
      console.error('Error approving consultation:', error);
      return null;
    }
  }

  /**
   * Reject a consultation request
   */
  static async rejectConsultation(eventId: string): Promise<Event | null> {
    try {
      return await this.updateEvent(eventId, { 
        status: 'rejected',
        is_available: true 
      });
    } catch (error) {
      console.error('Error rejecting consultation:', error);
      return null;
    }
  }

  /**
   * Create a blocked time slot
   */
  static async createBlockedTime(
    doctorId: string,
    startTime: string,
    endTime: string,
    title: string = 'Unavailable',
    notes?: string
  ): Promise<Event | null> {
    try {
      const eventData: CreateEventData = {
        title: title,
        start_time: startTime,
        end_time: endTime,
        event_type: 'blocked',
        status: 'confirmed',
        doctor_id: doctorId,
        notes: notes,
        is_available: false
      };

      return await this.createEvent(eventData);
    } catch (error) {
      console.error('Error creating blocked time:', error);
      return null;
    }
  }

  /**
   * Create a follow-up reminder
   */
  static async createFollowUp(
    doctorId: string,
    patientId: string,
    startTime: string,
    endTime: string,
    title: string,
    notes?: string
  ): Promise<Event | null> {
    try {
      const eventData: CreateEventData = {
        title: title,
        start_time: startTime,
        end_time: endTime,
        event_type: 'followup',
        status: 'confirmed',
        doctor_id: doctorId,
        patient_id: patientId,
        notes: notes,
        is_available: false
      };

      return await this.createEvent(eventData);
    } catch (error) {
      console.error('Error creating follow-up:', error);
      return null;
    }
  }

  /**
   * Create a meeting
   */
  static async createMeeting(
    doctorId: string,
    startTime: string,
    endTime: string,
    title: string,
    notes?: string
  ): Promise<Event | null> {
    try {
      const eventData: CreateEventData = {
        title: title,
        start_time: startTime,
        end_time: endTime,
        event_type: 'meeting',
        status: 'confirmed',
        doctor_id: doctorId,
        notes: notes,
        is_available: false
      };

      return await this.createEvent(eventData);
    } catch (error) {
      console.error('Error creating meeting:', error);
      return null;
    }
  }
}
