// Centralized function to prepare calendar event data consistently
import { EventForm } from '@/hooks/useEventForms';

interface EventData {
  id: string;
  title: string;
  event_date: string | null;
  event_end_date?: string | null;
  start_time: string | null;
  end_time: string | null;
  event_type: string | null;
  primary_contact_name: string | null;
  primary_contact_number: string | null;
  secondary_contact_name: string | null;
  secondary_contact_number: string | null;
  ethnicity?: string[] | null;
  men_count?: number;
  ladies_count?: number;
  external_calendar_id?: string;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
}

export const prepareCalendarEventData = (
  eventData: EventData,
  eventForms: EventForm[] = [],
  selectedCustomer?: Customer | null
) => {
  // Calculate total guests from event or forms
  const eventTotalGuests = (eventData.men_count || 0) + (eventData.ladies_count || 0);
  const formTotalGuests = eventForms.reduce((sum, form) => 
    sum + (form.men_count || 0) + (form.ladies_count || 0), 0
  );
  const totalGuests = formTotalGuests > 0 ? formTotalGuests : eventTotalGuests;

  // Get timing information (use forms if event times are missing)
  let startTime = eventData.start_time;
  let endTime = eventData.end_time;
  
  if ((!startTime || !endTime) && eventForms.length > 0) {
    const formsWithTimes = eventForms.filter(form => form.start_time && form.end_time);
    if (formsWithTimes.length > 0) {
      const startTimes = formsWithTimes.map(form => form.start_time!).sort();
      const endTimes = formsWithTimes.map(form => form.end_time!).sort();
      startTime = startTimes[0];
      endTime = endTimes[endTimes.length - 1];
    }
  }

  // Prepare customer data
  const customerData = selectedCustomer ? {
    name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
    email: selectedCustomer.email,
    phone: selectedCustomer.phone || eventData.primary_contact_number
  } : {
    name: eventData.primary_contact_name || 'Unknown',
    email: null,
    phone: eventData.primary_contact_number
  };

  return {
    id: eventData.id,
    event_name: eventData.title,
    event_start_date: eventData.event_date || '',
    event_end_date: eventData.event_end_date || eventData.event_date || '',
    start_time: startTime || '09:00',
    end_time: endTime || '17:00',
    event_type: eventData.event_type || '',
    estimated_guests: totalGuests,
    total_guests: totalGuests,
    primary_contact_name: eventData.primary_contact_name,
    primary_contact_number: eventData.primary_contact_number,
    secondary_contact_name: eventData.secondary_contact_name,
    secondary_contact_number: eventData.secondary_contact_number,
    ethnicity: eventData.ethnicity,
    event_forms: eventForms,
    customers: customerData,
    external_calendar_id: eventData.external_calendar_id
  };
};