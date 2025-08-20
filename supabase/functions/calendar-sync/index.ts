import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
}

interface EventData {
  id: string;
  event_name: string;
  event_type: string;
  event_start_date: string;
  event_end_date?: string;
  start_time: string;
  end_time: string;
  estimated_guests: number;
  total_guests?: number;
  venue_area?: string;
  form_responses?: any;
  primary_contact_name?: string;
  primary_contact_number?: string;
  secondary_contact_name?: string;
  secondary_contact_number?: string;
  ethnicity?: string[];
  event_forms?: any[];
  customers?: {
    name: string;
    email?: string;
    phone?: string;
  } | null;
}

class CalendarService {
  constructor(
    private integration: any,
    private supabase: any
  ) {}

  async refreshTokenIfNeeded(): Promise<string> {
    const expiresAt = new Date(this.integration.token_expires_at);
    const now = new Date();
    
    console.log('Token check:', { expiresAt, now, timeDiff: expiresAt.getTime() - now.getTime() });
    
    // Refresh if token has expired or expires within 5 minutes
    if (expiresAt.getTime() <= now.getTime() || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      console.log('Refreshing token...');
      
      if (!this.integration.refresh_token) {
        throw new Error('No refresh token available. Please re-authenticate with your calendar provider.');
      }

      if (this.integration.provider === 'google') {
        return await this.refreshGoogleToken();
      } else if (this.integration.provider === 'outlook') {
        return await this.refreshOutlookToken();
      } else {
        throw new Error(`Unsupported provider: ${this.integration.provider}`);
      }
    }

    return this.integration.access_token;
  }

  private async refreshGoogleToken(): Promise<string> {
    const refreshData = {
      client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
      refresh_token: this.integration.refresh_token,
      grant_type: 'refresh_token',
    };

    console.log('Attempting Google token refresh...');
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(refreshData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google token refresh failed:', response.status, errorText);
      throw new Error(`Google token refresh failed (${response.status}): ${errorText}`);
    }

    const tokenData = await response.json();
    console.log('Google token refresh successful');

    // Update the database with new token
    const { error: updateError } = await this.supabase
      .from('calendar_integrations')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        // Update refresh token if provided (Google sometimes provides a new one)
        ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
      })
      .eq('id', this.integration.id);

    if (updateError) {
      console.error('Failed to update token in database:', updateError);
      throw new Error('Failed to update token in database');
    }

    // Update the integration object for subsequent calls
    this.integration.access_token = tokenData.access_token;
    this.integration.token_expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    return tokenData.access_token;
  }

  private async refreshOutlookToken(): Promise<string> {
    const refreshData = {
      client_id: Deno.env.get('MICROSOFT_CLIENT_ID'),
      client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET'),
      refresh_token: this.integration.refresh_token,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
    };

    console.log('Attempting Outlook token refresh...');
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(refreshData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Outlook token refresh failed:', response.status, errorText);
      throw new Error(`Outlook token refresh failed (${response.status}): ${errorText}`);
    }

    const tokenData = await response.json();
    console.log('Outlook token refresh successful');

    // Update the database with new token
    const { error: updateError } = await this.supabase
      .from('calendar_integrations')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        // Update refresh token if provided
        ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
      })
      .eq('id', this.integration.id);

    if (updateError) {
      console.error('Failed to update token in database:', updateError);
      throw new Error('Failed to update token in database');
    }

    // Update the integration object for subsequent calls
    this.integration.access_token = tokenData.access_token;
    this.integration.token_expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    return tokenData.access_token;
  }

  async createEvent(eventData: EventData): Promise<{ success: boolean; externalId?: string; error?: string }> {
    try {
      console.log('Creating calendar event with data:', eventData);
      const accessToken = await this.refreshTokenIfNeeded();
      const calendarEvent = await this.formatEventForCalendar(eventData);
      console.log('Formatted calendar event:', calendarEvent);

      if (this.integration.provider === 'google') {
        return await this.createGoogleEvent(calendarEvent, accessToken);
      } else {
        return await this.createOutlookEvent(calendarEvent, accessToken);
      }
    } catch (error) {
      console.error('Create event error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateEvent(eventData: EventData, externalId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = await this.refreshTokenIfNeeded();
      const calendarEvent = await this.formatEventForCalendar(eventData);

      if (this.integration.provider === 'google') {
        return await this.updateGoogleEvent(calendarEvent, externalId, accessToken);
      } else {
        return await this.updateOutlookEvent(calendarEvent, externalId, accessToken);
      }
    } catch (error) {
      console.error('Update event error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteEvent(externalId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = await this.refreshTokenIfNeeded();

      if (this.integration.provider === 'google') {
        return await this.deleteGoogleEvent(externalId, accessToken);
      } else {
        return await this.deleteOutlookEvent(externalId, accessToken);
      }
    } catch (error) {
      console.error('Delete event error:', error);
      return { success: false, error: error.message };
    }
  }

  private async formatEventForCalendar(eventData: EventData): Promise<CalendarEvent> {
    // Handle multi-day events
    const startDate = eventData.event_start_date;
    const endDate = eventData.event_end_date || eventData.event_start_date;
    
    const startDateTime = `${startDate}T${eventData.start_time}`;
    const endDateTime = `${endDate}T${eventData.end_time}`;
    
    // Default timezone - this should be configurable per tenant in future
    const timeZone = 'Europe/London';
    
    // Get tenant ID for custom formatting logic
    const tenantId = eventData.event_forms?.[0]?.tenant_id;
    
    // Custom formatting for specific tenant and "All Day" event type
    if (tenantId === 'e2a03656-036e-4041-a24e-c06e85747906' && eventData.event_type === 'All Day') {
      return await this.formatCustomAllDayEvent(eventData, startDateTime, endDateTime, timeZone);
    }
    
    // Build comprehensive description with all event details (original logic)
    let description = `Event Type: ${eventData.event_type}\n`;
    
    // Display guest counts from forms if available
    if (eventData.event_forms && eventData.event_forms.length > 0) {
      const guestCounts = eventData.event_forms
        .filter((form: any) => form.guest_count > 0)
        .map((form: any) => form.guest_count);
      
      if (guestCounts.length > 0) {
        description += `Guests: ${guestCounts.join(' & ')}\n`;
      } else {
        description += `Guests: ${eventData.total_guests || eventData.estimated_guests}\n`;
      }
    } else {
      description += `Guests: ${eventData.total_guests || eventData.estimated_guests}\n`;
    }
    
    // Customer information
    if (eventData.customers) {
      description += `\nCustomer: ${eventData.customers.name}\n`;
      if (eventData.customers.email) description += `Email: ${eventData.customers.email}\n`;
      if (eventData.customers.phone) description += `Phone: ${eventData.customers.phone}\n`;
    }

    // Contact information
    if (eventData.primary_contact_name) {
      description += `\nPrimary Contact: ${eventData.primary_contact_name}\n`;
      if (eventData.primary_contact_number) description += `Phone: ${eventData.primary_contact_number}\n`;
    }
    
    if (eventData.secondary_contact_name) {
      description += `Secondary Contact: ${eventData.secondary_contact_name}\n`;
      if (eventData.secondary_contact_number) description += `Phone: ${eventData.secondary_contact_number}\n`;
    }

    // Ethnicity/cultural requirements
    if (eventData.ethnicity && eventData.ethnicity.length > 0) {
      description += `\nCultural Requirements: ${eventData.ethnicity.join(', ')}\n`;
    }

    if (eventData.venue_area) {
      description += `\nVenue Area: ${eventData.venue_area}\n`;
    }

    // Enhanced form data extraction for multi-session events
    if (eventData.event_forms && eventData.event_forms.length > 0) {
      description += `\n--- Event Details ---\n`;
      
      // Fetch form fields for label lookup
      const { data: formFields } = await this.supabase
        .from('form_fields')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      
      // Create field lookup map
      const fieldLookup = new Map();
      if (formFields) {
        formFields.forEach((field: any) => {
          fieldLookup.set(field.id, field.name);
        });
      }
      
      eventData.event_forms.forEach((form: any, index: number) => {
        const formName = form.forms?.name || form.form_label || `Session ${index + 1}`;
        description += `\n${formName}:\n`;
        
        const responses = form.form_responses || {};
        
        // Extract all meaningful field responses
        Object.entries(responses).forEach(([fieldId, response]: [string, any]) => {
          if (!response || typeof response !== 'object') return;
          
          // Skip if not enabled (for toggle fields)
          if (response.hasOwnProperty('enabled') && !response.enabled) return;
          
          // Get proper field name from lookup
          const fieldName = fieldLookup.get(fieldId) || fieldId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          
          // Extract meaningful data
          let fieldInfo = '';
          
          if (response.value && response.value.toString().trim()) {
            fieldInfo = `${fieldName}: ${response.value}`;
          } else if (response.selectedOption) {
            fieldInfo = `${fieldName}: ${Array.isArray(response.selectedOption) ? response.selectedOption.join(',') : response.selectedOption}`;
          } else if (response.enabled === true) {
            fieldInfo = `${fieldName}: Yes`;
          } else if (response.quantity && parseInt(response.quantity) > 0) {
            fieldInfo = `${fieldName}: ${response.quantity}`;
          } else if (response.price && parseFloat(response.price) > 0) {
            fieldInfo = `${fieldName}: £${parseFloat(response.price).toFixed(2)}`;
          }
          
          if (fieldInfo) {
            description += `  ${fieldInfo}`;
            if (response.notes && response.notes.trim()) {
              description += ` - ${response.notes.trim()}`;
            }
            description += '\n';
          }
        });
      });
    }

    // Add legacy form responses if available (for backward compatibility)
    if (eventData.form_responses && Object.keys(eventData.form_responses).length > 0) {
      description += `\nAdditional Details:\n`;
      Object.entries(eventData.form_responses).forEach(([key, value]) => {
        if (value && typeof value === 'object' && 'enabled' in value && value.enabled) {
          const fieldLabel = value.label || key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          const notes = value.notes ? ` - ${value.notes}` : '';
          description += `- ${fieldLabel}${notes}\n`;
        }
      });
    }

    return {
      summary: eventData.event_name,
      description,
      start: { 
        dateTime: startDateTime,
        timeZone: timeZone
      },
      end: { 
        dateTime: endDateTime,
        timeZone: timeZone
      },
      location: eventData.venue_area,
    };
  }

  private async formatCustomAllDayEvent(eventData: EventData, startDateTime: string, endDateTime: string, timeZone: string): Promise<CalendarEvent> {
    // Field ID mappings for the specific tenant
    const fieldMappings = {
      'fd83900d-34c0-4528-be1a-db5096b61b47': 'Top Up Lamb',
      '382c484e-bf21-4af4-b7bf-78efebee8051': 'Fruit Basket',
      '7dacae11-0e08-485a-a895-30fc2d294e79': 'Fruit Table',
      'f203decc-ee2c-4649-99b4-ad59171a8283': 'Pancake Station',
      'b04b8edb-9f3e-46cc-a327-593beae8d176': 'Starter',
      '23a1a3ac-026f-4c14-93bf-18c8aaf7140c': 'Main Course',
      '07ecac55-9caf-4676-9c6f-dad8209b1934': 'Dessert',
      'c4153dba-f043-4df7-9f8c-e0cc0f55edfd': 'Dessert Table',
      '109c8e68-7ede-4b45-9c20-6025e9a25958': 'Welcome Drinks'
    };

    let description = '';
    
    // Primary contact information
    if (eventData.primary_contact_name) {
      description += `Primary Contact: ${eventData.primary_contact_name}\n`;
    }
    if (eventData.primary_contact_number) {
      description += `Primary Contact No.: ${eventData.primary_contact_number}\n\n`;
    }

    // Process each form (Nikkah and Reception)
    if (eventData.event_forms && eventData.event_forms.length > 0) {
      eventData.event_forms.forEach((form: any) => {
        const formName = form.forms?.name || form.form_label || '';
        const responses = form.form_responses || {};
        
        // Get time from form start_time or use default
        const timeValue = form.start_time || 'Time TBD';
        
        description += `${formName} - ${timeValue}:\n`;
        description += `Men Count: ${form.men_count || 0}\n`;
        description += `Ladies Count: ${form.ladies_count || 0}\n\n`;
        
        // Process form fields based on form type
        if (formName.toLowerCase().includes('nikkah')) {
          // Nikkah specific fields
          description += this.addFieldIfHasValue(responses, 'fd83900d-34c0-4528-be1a-db5096b61b47', 'Top Up Lamb');
          description += this.addFieldIfHasValue(responses, '382c484e-bf21-4af4-b7bf-78efebee8051', 'Fruit Basket');
          description += this.addFieldIfHasValue(responses, '7dacae11-0e08-485a-a895-30fc2d294e79', 'Fruit Table');
          description += this.addFieldIfHasValue(responses, 'f203decc-ee2c-4649-99b4-ad59171a8283', 'Pancake Station');
        } else if (formName.toLowerCase().includes('reception')) {
          // Reception specific fields
          description += this.addFieldIfHasValue(responses, 'b04b8edb-9f3e-46cc-a327-593beae8d176', 'Starter');
          description += this.addFieldIfHasValue(responses, '23a1a3ac-026f-4c14-93bf-18c8aaf7140c', 'Main Course');
          description += this.addFieldIfHasValue(responses, '07ecac55-9caf-4676-9c6f-dad8209b1934', 'Dessert');
          description += this.addFieldIfHasValue(responses, '382c484e-bf21-4af4-b7bf-78efebee8051', 'Fruit Basket');
          description += this.addFieldIfHasValue(responses, '7dacae11-0e08-485a-a895-30fc2d294e79', 'Fruit Table');
          description += this.addFieldIfHasValue(responses, 'c4153dba-f043-4df7-9f8c-e0cc0f55edfd', 'Dessert Table');
          description += this.addFieldIfHasValue(responses, 'f203decc-ee2c-4649-99b4-ad59171a8283', 'Pancake Station');
          description += this.addFieldIfHasValue(responses, '109c8e68-7ede-4b45-9c20-6025e9a25958', 'Welcome Drinks');
        }
        
        description += '-----------------------------------------------------------------------------\n\n';
      });
    }

    return {
      summary: eventData.event_name,
      description: description.trim(),
      start: { 
        dateTime: startDateTime,
        timeZone: timeZone
      },
      end: { 
        dateTime: endDateTime,
        timeZone: timeZone
      },
      location: eventData.venue_area,
    };
  }

  private addFieldIfHasValue(responses: any, fieldId: string, fieldName: string): string {
    const response = responses[fieldId];
    if (!response) return '';
    
    // Check if field has value (price or notes)
    const hasPrice = response.price && parseFloat(response.price) > 0;
    const hasNotes = response.notes && response.notes.trim();
    
    if (!hasPrice && !hasNotes) return '';
    
    // Determine toggle value
    let toggleValue = 'No';
    if (response.enabled === true) {
      toggleValue = 'Yes';
    } else if (response.value && response.value.toString().toLowerCase() === 'yes') {
      toggleValue = 'Yes';
    }
    
    // For Starter, Main Course, Dessert fields - show notes only
    if (['Starter', 'Main Course', 'Dessert'].includes(fieldName)) {
      if (hasNotes) {
        return `${fieldName} - ${response.notes}\n`;
      }
    } else {
      // For toggle fields - show toggle value and notes
      let fieldLine = `${fieldName} - ${toggleValue}`;
      if (hasNotes) {
        fieldLine += ` - ${response.notes}`;
      }
      return `${fieldLine}\n`;
    }
    
    return '';
  }

  private async createGoogleEvent(event: CalendarEvent, accessToken: string) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${this.integration.calendar_id}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (response.ok) {
      const created = await response.json();
      console.log('Google event created successfully:', created.id);
      return { success: true, externalId: created.id };
    } else {
      const errorText = await response.text();
      console.error('Google Calendar API error:', response.status, errorText);
      return { success: false, error: `Google Calendar error (${response.status}): ${errorText}` };
    }
  }

  private async updateGoogleEvent(event: CalendarEvent, eventId: string, accessToken: string) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${this.integration.calendar_id}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    return { success: response.ok, error: response.ok ? undefined : await response.text() };
  }

  private async deleteGoogleEvent(eventId: string, accessToken: string) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${this.integration.calendar_id}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return { success: response.ok, error: response.ok ? undefined : await response.text() };
  }

  private async createOutlookEvent(event: CalendarEvent, accessToken: string) {
    const outlookEvent = {
      subject: event.summary,
      body: {
        contentType: 'text',
        content: event.description,
      },
      start: {
        dateTime: event.start.dateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.end.dateTime,
        timeZone: 'UTC',
      },
      location: {
        displayName: event.location,
      },
    };

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${this.integration.calendar_id}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(outlookEvent),
      }
    );

    if (response.ok) {
      const created = await response.json();
      console.log('Outlook event created successfully:', created.id);
      return { success: true, externalId: created.id };
    } else {
      const errorText = await response.text();
      console.error('Outlook Calendar API error:', response.status, errorText);
      return { success: false, error: `Outlook Calendar error (${response.status}): ${errorText}` };
    }
  }

  private async updateOutlookEvent(event: CalendarEvent, eventId: string, accessToken: string) {
    const outlookEvent = {
      subject: event.summary,
      body: {
        contentType: 'text',
        content: event.description,
      },
      start: {
        dateTime: event.start.dateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.end.dateTime,
        timeZone: 'UTC',
      },
      location: {
        displayName: event.location,
      },
    };

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${this.integration.calendar_id}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(outlookEvent),
      }
    );

    return { success: response.ok, error: response.ok ? undefined : await response.text() };
  }

  private async deleteOutlookEvent(eventId: string, accessToken: string) {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${this.integration.calendar_id}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return { success: response.ok, error: response.ok ? undefined : await response.text() };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    const { action, eventId, integrationId, eventData, externalEventId } = await req.json();

    // Get calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error('Calendar integration not found or inactive');
    }

    const calendarService = new CalendarService(integration, supabase);
    let result;

    switch (action) {
      case 'create':
        result = await calendarService.createEvent(eventData);
        break;
      case 'update':
        result = await calendarService.updateEvent(eventData, externalEventId);
        break;
      case 'delete':
        result = await calendarService.deleteEvent(externalEventId);
        break;
      default:
        throw new Error('Invalid action');
    }

    // Log sync operation
    await supabase
      .from('calendar_sync_logs')
      .insert({
        tenant_id: integration.tenant_id,
        integration_id: integrationId,
        event_id: eventId,
        external_event_id: result.externalId || externalEventId,
        sync_direction: 'to_calendar',
        status: result.success ? 'success' : 'failed',
        operation: action,
        error_message: result.error,
        sync_data: { eventData, result },
      });

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400
      }
    );

  } catch (error) {
    console.error('Calendar sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});