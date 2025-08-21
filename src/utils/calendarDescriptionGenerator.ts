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
  // Get event type config to fetch the display_name
  let eventTypeConfig: any = null;
  let eventTypeConfigId = eventTypeOrConfigId;
  
  if (eventTypeOrConfigId && !isUUID(eventTypeOrConfigId)) {
    // It's an event_type string, need to find the config
    const { data } = await supabase
      .from('event_type_configs')
      .select('id, display_name')
      .eq('tenant_id', tenantId)
      .eq('event_type', eventTypeOrConfigId)
      .eq('is_active', true)
      .single();
    
    eventTypeConfig = data;
    eventTypeConfigId = data?.id;
  } else if (eventTypeConfigId) {
    // It's already a UUID, get the config
    const { data } = await supabase
      .from('event_type_configs')
      .select('id, display_name')
      .eq('tenant_id', tenantId)
      .eq('id', eventTypeConfigId)
      .eq('is_active', true)
      .single();
    
    eventTypeConfig = data;
  }
  
  // Use display_name from config, fallback to event_type
  const eventTitle = eventTypeConfig?.display_name ? 
    `${eventTypeConfig.display_name} Event` : 
    (eventData.event_type ? `${eventData.event_type} Event` : eventData.title);
  
  let description = `${eventTitle}\n`;
  
  // Add date and time - match preview format exactly
  const eventDate = new Date(eventData.event_date).toLocaleDateString('en-GB');
  const startTime = eventData.start_time || 'Start Time';
  const endTime = eventData.end_time || 'End Time';
  
  description += `${eventDate}, ${startTime} - ${endTime}\n\n`;

  // Add contact information
  if (eventData.primary_contact_name || eventData.primary_contact_number) {
    description += `Primary Contact: ${eventData.primary_contact_name || '[Contact Name]'}\n`;
    description += `Primary Contact No.: ${eventData.primary_contact_number || '[Contact Number]'}\n`;
  }
  if (eventData.secondary_contact_name || eventData.secondary_contact_number) {
    description += `Secondary Contact: ${eventData.secondary_contact_name || '[Secondary Contact]'}\n`;
    description += `Secondary Contact No.: ${eventData.secondary_contact_number || '[Secondary Number]'}\n`;
  }
  
  description += '\n';

  // Process forms - match preview logic exactly
  for (let index = 0; index < eventForms.length; index++) {
    const form = eventForms[index];
    
    description += await generateSectionDescription(
      form,
      tenantId,
      eventTypeConfigId,
      eventData.guest_mixture
    );
    
    // Add separator between forms (not after the last one)
    if (index < eventForms.length - 1) {
      description += '\n------------------------------------------------------------\n\n';
    }
  }

  return description.trim();
}

async function generateSectionDescription(
  form: EventForm,
  tenantId: string,
  eventTypeConfigId?: string,
  guestMixture?: string
): Promise<string> {
  let section = '';

  // Use form times if available, keep 24-hour format
  const formStartTime = form.start_time || '';
  const formEndTime = form.end_time || '';
  const timeDisplay = formStartTime && formEndTime ? `${formStartTime} - ${formEndTime}` : 
                     formStartTime ? formStartTime : '[Time Slot]';

  // Use form label directly (like in preview: ${mapping.forms.name} - [Time Slot]:)
  section += `${form.form_label} - ${timeDisplay}:\n`;
  section += `Men Count: ${form.men_count || '[Men Count]'}\n`;
  section += `Ladies Count: ${form.ladies_count || '[Ladies Count]'}\n`;
  section += `Guest Mix: ${guestMixture || '[Guest Mix]'}\n\n`;

  // Get calendar sync configuration for this form
  const config = await getCalendarSyncConfig(tenantId, eventTypeConfigId || '', form.form_id);
  
  if (config && config.selected_fields?.length > 0) {
    // Use configured fields in the exact order they were selected (like preview)
    const formFields = await getFormFields(form.form_id, tenantId);
    
    for (const fieldId of config.selected_fields) {
      const field = formFields.find(f => f.id === fieldId);
      if (!field) continue;

      const response = form.form_responses[fieldId];
      if (!response) continue;

      let shouldShow = false;

      if (field.field_type.includes('toggle')) {
        // For toggle fields: only show if enabled AND (no pricing filter OR has pricing/notes)
        shouldShow = response.enabled === true && 
                    (!config.show_pricing_fields_only || 
                     (response.price && parseFloat(response.price) > 0) || 
                     (response.notes && response.notes.trim()));
      } else {
        // For non-toggle fields (text, etc.): show if has content AND meets pricing filter
        const hasContent = (response.notes && response.notes.trim()) || 
                          (response.value && response.value.trim()) ||
                          (response.price && parseFloat(response.price) > 0);
        
        shouldShow = hasContent && 
                    (!config.show_pricing_fields_only || 
                     (response.price && parseFloat(response.price) > 0) || 
                     (response.notes && response.notes.trim()));
      }

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

      let shouldShow = false;

      if (field.field_type.includes('toggle')) {
        // Only show enabled toggles with pricing/notes
        shouldShow = response.enabled === true && 
                    ((response.price && parseFloat(response.price) > 0) || 
                     (response.notes && response.notes.trim()));
      } else {
        // Show non-toggle fields that have content
        shouldShow = (response.price && parseFloat(response.price) > 0) || 
                    (response.notes && response.notes.trim()) ||
                    (response.value && response.value.trim());
      }

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