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
  // PRIORITIZE FORM DATA: Calculate total guests from forms first, fallback to event
  const formTotalGuests = eventForms.reduce((sum, form) => 
    sum + (form.men_count || 0) + (form.ladies_count || 0), 0
  );
  const eventTotalGuests = (eventData.men_count || 0) + (eventData.ladies_count || 0);
  const totalGuests = formTotalGuests > 0 ? formTotalGuests : eventTotalGuests;

  // PRIORITIZE FORM TIMING: Get timing information from forms first if event times are missing
  let startTime = eventData.start_time;
  let endTime = eventData.end_time;
  
  // If event has no times OR we have forms with times, use forms timing
  if ((!startTime || !endTime) && eventForms.length > 0) {
    const formsWithTimes = eventForms.filter(form => form.start_time && form.end_time);
    if (formsWithTimes.length > 0) {
      const startTimes = formsWithTimes.map(form => form.start_time!).sort();
      const endTimes = formsWithTimes.map(form => form.end_time!).sort();
      startTime = startTimes[0]; // Earliest start time
      endTime = endTimes[endTimes.length - 1]; // Latest end time
    }
  }

  // PRIORITIZE FORM CONTACT INFO: Extract from forms if available
  let primaryContactName = eventData.primary_contact_name;
  let primaryContactNumber = eventData.primary_contact_number;
  let secondaryContactName = eventData.secondary_contact_name;
  let secondaryContactNumber = eventData.secondary_contact_number;

  // Check forms for contact information that might override event data
  if (eventForms.length > 0) {
    for (const form of eventForms) {
      if (form.form_responses) {
        // Look for contact fields in form responses
        Object.entries(form.form_responses).forEach(([fieldId, response]: [string, any]) => {
          if (response && response.value) {
            const fieldName = response.field_name?.toLowerCase() || '';
            
            // Map common contact field names
            if (fieldName.includes('primary') && fieldName.includes('name') && !primaryContactName) {
              primaryContactName = response.value;
            } else if (fieldName.includes('primary') && (fieldName.includes('phone') || fieldName.includes('contact')) && !primaryContactNumber) {
              primaryContactNumber = response.value;
            } else if (fieldName.includes('secondary') && fieldName.includes('name') && !secondaryContactName) {
              secondaryContactName = response.value;
            } else if (fieldName.includes('secondary') && (fieldName.includes('phone') || fieldName.includes('contact')) && !secondaryContactNumber) {
              secondaryContactNumber = response.value;
            }
          }
        });
      }
    }
  }

  // Prepare customer data (prioritize selectedCustomer over form/event data)
  const customerData = selectedCustomer ? {
    name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
    email: selectedCustomer.email,
    phone: selectedCustomer.phone || primaryContactNumber
  } : {
    name: primaryContactName || 'Unknown',
    email: null,
    phone: primaryContactNumber
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
    primary_contact_name: primaryContactName,
    primary_contact_number: primaryContactNumber,
    secondary_contact_name: secondaryContactName,
    secondary_contact_number: secondaryContactNumber,
    ethnicity: eventData.ethnicity,
    event_forms: eventForms,
    customers: customerData,
    external_calendar_id: eventData.external_calendar_id
  };
};