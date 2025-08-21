import { supabase } from '@/integrations/supabase/client';

interface EventForm {
  id: string;
  form_label: string;
  start_time?: string;
  end_time?: string;
  men_count?: number;
  ladies_count?: number;
  form_responses: Record<string, any>;
  form_id: string;
}

interface EventData {
  id: string;
  title: string;
  event_date: string;
  event_end_date?: string;
  start_time?: string;
  end_time?: string;
  event_type: string;
  primary_contact_name?: string;
  primary_contact_number?: string;
  secondary_contact_name?: string;
  secondary_contact_number?: string;
  men_count?: number;
  ladies_count?: number;
  guest_mixture?: string;
}

interface FormField {
  id: string;
  name: string;
  field_type: string;
}

export async function generateCalendarDescription(
  eventData: EventData,
  eventForms: EventForm[],
  tenantId: string,
  eventTypeOrConfigId?: string
): Promise<string> {
  // If eventTypeOrConfigId is not a UUID, we need to find the event_type_config_id
  let eventTypeConfigId = eventTypeOrConfigId;
  
  if (eventTypeOrConfigId && !isUUID(eventTypeOrConfigId)) {
    // It's an event_type string, need to find the config ID
    const { data: eventTypeConfig } = await supabase
      .from('event_type_configs')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('event_type', eventTypeOrConfigId)
      .eq('is_active', true)
      .single();
    
    eventTypeConfigId = eventTypeConfig?.id;
  }
  let description = `${eventData.title}\n`;
  
  // Add date and time
  const eventDate = new Date(eventData.event_date).toLocaleDateString('en-GB');
  const startTime = eventData.start_time ? formatTime(eventData.start_time) : '';
  const endTime = eventData.end_time ? formatTime(eventData.end_time) : '';
  
  if (startTime && endTime) {
    description += `${eventDate}, ${startTime} - ${endTime}\n\n`;
  } else {
    description += `${eventDate}\n\n`;
  }

  // Add contact information
  if (eventData.primary_contact_name) {
    description += `Primary Contact: ${eventData.primary_contact_name}\n`;
  }
  if (eventData.primary_contact_number) {
    description += `Primary Contact No.: ${eventData.primary_contact_number}\n`;
  }
  
  description += '\n';

  // Handle different event types
  if (eventData.event_type === 'All Day' && eventForms.length >= 2) {
    // All Day events - show both Nikkah and Reception
    const nikkahtForm = eventForms.find(form => 
      form.form_label.toLowerCase().includes('nikkah')
    );
    const receptionForm = eventForms.find(form => 
      form.form_label.toLowerCase().includes('reception')
    );

    if (nikkahtForm) {
      description += await generateSectionDescription(
        'Nikkah',
        nikkahtForm,
        tenantId,
        eventTypeConfigId,
        eventData.guest_mixture
      );
      
      if (receptionForm) {
        description += '\n------------------------------------------------------------\n\n';
      }
    }

    if (receptionForm) {
      description += await generateSectionDescription(
        'Reception',
        receptionForm,
        tenantId,
        eventTypeConfigId,
        eventData.guest_mixture
      );
    }
  } else {
    // Single event type
    for (const form of eventForms) {
      const sectionName = form.form_label.toLowerCase().includes('nikkah') ? 'Nikkah' :
                         form.form_label.toLowerCase().includes('reception') ? 'Reception' :
                         eventData.event_type || 'Event';
      
      description += await generateSectionDescription(
        sectionName,
        form,
        tenantId,
        eventTypeConfigId,
        eventData.guest_mixture
      );
    }
  }

  return description.trim();
}

async function generateSectionDescription(
  sectionName: string,
  form: EventForm,
  tenantId: string,
  eventTypeConfigId?: string,
  guestMixture?: string
): Promise<string> {
  let section = '';

  // Get time from form if available, otherwise use a time placeholder
  const formStartTime = form.start_time ? formatTime(form.start_time) : '';
  const formEndTime = form.end_time ? formatTime(form.end_time) : '';
  const timeDisplay = formStartTime && formEndTime ? `${formStartTime} - ${formEndTime}` : 
                     formStartTime ? formStartTime : '[Time Slot]';

  section += `${sectionName} - ${timeDisplay}:\n`;
  section += `Men Count: ${form.men_count || 0}\n`;
  section += `Ladies Count: ${form.ladies_count || 0}\n`;
  section += `Guest Mix: ${guestMixture || 'Mixed'}\n\n`;

  // Get calendar sync configuration for this form
  const config = await getCalendarSyncConfig(tenantId, eventTypeConfigId || '', form.form_id);
  
  if (config && config.selected_fields?.length > 0) {
    // Use configured fields
    const formFields = await getFormFields(form.form_id, tenantId);
    const selectedFieldIds = config.selected_fields;
    
    for (const fieldId of selectedFieldIds) {
      const field = formFields.find(f => f.id === fieldId);
      if (!field) continue;

      const response = form.form_responses[fieldId];
      if (!response) continue;

      // Apply conditional display logic
      const shouldShow = !config.show_pricing_fields_only || 
                        (response.price && parseFloat(response.price) > 0) || 
                        (response.notes && response.notes.trim()) ||
                        (response.enabled === true && field.field_type.includes('toggle'));

      if (shouldShow) {
        section += formatFieldForCalendar(field, response);
      }
    }
  } else {
    // Fallback: show all relevant fields with values
    const formFields = await getFormFields(form.form_id, tenantId);
    
    for (const [fieldId, response] of Object.entries(form.form_responses)) {
      const field = formFields.find(f => f.id === fieldId);
      if (!field || !response) continue;

      // Skip system fields
      if (isSystemField(field.name)) continue;

      // Only show if has pricing, notes, or is enabled toggle
      const shouldShow = (response.price && parseFloat(response.price) > 0) || 
                        (response.notes && response.notes.trim()) ||
                        (response.enabled === true && field.field_type.includes('toggle'));

      if (shouldShow) {
        section += formatFieldForCalendar(field, response);
      }
    }
  }

  return section;
}

function formatFieldForCalendar(field: FormField, response: any): string {
  let line = `${field.name}`;

  // Handle toggle fields specifically
  if (field.field_type.includes('toggle')) {
    const toggleValue = response.enabled ? 'Yes' : 'No';
    line += ` - ${toggleValue}`;
    
    if (response.notes && response.notes.trim()) {
      line += ` - ${response.notes.trim()}`;
    }
  } else if (response.notes && response.notes.trim()) {
    // For non-toggle fields, show notes if available
    line += ` - ${response.notes.trim()}`;
  } else if (response.value) {
    // Fallback to value if no notes
    line += ` - ${response.value}`;
  }

  return line + '\n';
}

function formatTime(timeStr: string): string {
  try {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const min = minutes || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${min} ${ampm}`;
  } catch {
    return timeStr;
  }
}

// Helper function to check if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isSystemField(fieldName: string): boolean {
  const systemFields = [
    'quick_time_option',
    'men_count',
    'ladies_count',
    'guest_mixture',
    'primary_contact',
    'secondary_contact',
    'event_date',
    'start_time',
    'end_time'
  ];
  return systemFields.includes(fieldName.toLowerCase());
}

function hasValue(response: any): boolean {
  if (!response) return false;
  
  return !!(
    response.value ||
    response.notes ||
    response.enabled === true ||
    (response.price && parseFloat(response.price) > 0)
  );
}

async function getCalendarSyncConfig(tenantId: string, eventTypeConfigId: string, formId: string) {
  try {
    const { data, error } = await supabase
      .from('calendar_sync_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('event_type_config_id', eventTypeConfigId)
      .eq('form_id', formId)
      .eq('is_active', true)
      .single();

    return error ? null : data;
  } catch {
    return null;
  }
}

async function getFormFields(formId: string, tenantId: string): Promise<FormField[]> {
  try {
    const { data, error } = await supabase
      .from('form_fields')
      .select('id, name, field_type')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    return error ? [] : (data || []);
  } catch {
    return [];
  }
}

async function getFormIdByName(tenantId: string, formName: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('forms')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('name', `%${formName}%`)
      .single();

    return error ? null : data?.id;
  } catch {
    return null;
  }
}