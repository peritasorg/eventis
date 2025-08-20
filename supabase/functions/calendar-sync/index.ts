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
  title: string;
  event_type: string;
  event_date: string;
  event_end_date?: string;
  start_time: string;
  end_time: string;
  primary_contact_name?: string;
  primary_contact_number?: string;
  secondary_contact_name?: string;
  secondary_contact_number?: string;
  men_count?: number;
  ladies_count?: number;
  ethnicity?: string[];
  event_forms?: any[];
  external_calendar_id?: string;
}

class CalendarService {
  constructor(
    private integration: any,
    private supabase: any
  ) {}

  async refreshTokenIfNeeded(): Promise<string> {
    const expiresAt = new Date(this.integration.token_expires_at);
    const now = new Date();
    
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

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(refreshData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google token refresh failed (${response.status}): ${errorText}`);
    }

    const tokenData = await response.json();

    // Update the database with new token
    const { error: updateError } = await this.supabase
      .from('calendar_integrations')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
      })
      .eq('id', this.integration.id);

    if (updateError) {
      throw new Error('Failed to update token in database');
    }

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

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(refreshData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Outlook token refresh failed (${response.status}): ${errorText}`);
    }

    const tokenData = await response.json();

    const { error: updateError } = await this.supabase
      .from('calendar_integrations')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
      })
      .eq('id', this.integration.id);

    if (updateError) {
      throw new Error('Failed to update token in database');
    }

    this.integration.access_token = tokenData.access_token;
    this.integration.token_expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    return tokenData.access_token;
  }

  async createEvent(eventData: EventData): Promise<{ success: boolean; externalId?: string; error?: string }> {
    try {
      const accessToken = await this.refreshTokenIfNeeded();
      const calendarEvent = await this.formatEventForCalendar(eventData);

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
    const startDate = eventData.event_date;
    const endDate = eventData.event_end_date || eventData.event_date;
    
    const startDateTime = `${startDate}T${eventData.start_time}`;
    const endDateTime = `${endDate}T${eventData.end_time}`;
    const timeZone = 'Europe/London';
    
    // Build enhanced description
    const description = this.buildEnhancedDescription(eventData);

    return {
      summary: eventData.title,
      description,
      start: { 
        dateTime: startDateTime,
        timeZone: timeZone
      },
      end: { 
        dateTime: endDateTime,
        timeZone: timeZone
      },
    };
  }

  private buildEnhancedDescription(eventData: EventData): string {
    const eventType = eventData.event_type?.toLowerCase();
    let description = '';
    
    // Primary contact information
    if (eventData.primary_contact_name) {
      description += `Primary Contact: ${eventData.primary_contact_name}\n`;
    }
    if (eventData.primary_contact_number) {
      description += `Primary Contact No.: ${eventData.primary_contact_number}\n\n`;
    }

    // Handle different event types with form data
    if (eventData.event_forms && Array.isArray(eventData.event_forms)) {
      if (eventType === 'all day') {
        // For All Day events, show both Nikkah and Reception forms
        description += this.formatAllDayEvent(eventData.event_forms);
      } else {
        // For single event types
        eventData.event_forms.forEach((form: any) => {
          description += this.formatSingleEventForm(form);
        });
      }
    } else {
      // Fallback for events without form data
      if (eventData.men_count || eventData.ladies_count) {
        description += `${eventType} - Time TBD:\n`;
        description += `Men Count: ${eventData.men_count || 0}\n`;
        description += `Ladies Count: ${eventData.ladies_count || 0}\n`;
      }
    }
    
    return description.trim();
  }

  private formatAllDayEvent(eventForms: any[]): string {
    let description = '';
    
    eventForms.forEach((form: any, index: number) => {
      const formLabel = form.form_label || '';
      const formType = formLabel.toLowerCase();
      const responses = form.form_responses || {};
      
      // Get time from form or default
      const timeValue = form.start_time || 'Time TBD';
      
      description += `${formLabel} - ${timeValue}:\n`;
      description += `Men Count: ${form.men_count || 0}\n`;
      description += `Ladies Count: ${form.ladies_count || 0}\n\n`;
      
      // Add relevant fields based on form type
      if (formType.includes('nikkah')) {
        description += this.addNikkahFields(responses);
      } else if (formType.includes('reception')) {
        description += this.addReceptionFields(responses);
      }
      
      // Add separator between forms (except last one)
      if (index < eventForms.length - 1) {
        description += '------------------------------------------------------------\n\n';
      }
    });
    
    return description;
  }

  private formatSingleEventForm(form: any): string {
    const formLabel = form.form_label || '';
    const formType = formLabel.toLowerCase();
    const responses = form.form_responses || {};
    
    const timeValue = form.start_time || 'Time TBD';
    
    let description = `${formLabel} - ${timeValue}:\n`;
    description += `Men Count: ${form.men_count || 0}\n`;
    description += `Ladies Count: ${form.ladies_count || 0}\n\n`;
    
    if (formType.includes('nikkah')) {
      description += this.addNikkahFields(responses);
    } else if (formType.includes('reception')) {
      description += this.addReceptionFields(responses);
    }
    
    return description;
  }

  private addNikkahFields(responses: any): string {
    let fields = '';
    fields += this.addFieldIfHasValue(responses, 'fd83900d-34c0-4528-be1a-db5096b61b47', 'Top Up Lamb');
    fields += this.addFieldIfHasValue(responses, '382c484e-bf21-4af4-b7bf-78efebee8051', 'Fruit Basket');  
    fields += this.addFieldIfHasValue(responses, '7dacae11-0e08-485a-a895-30fc2d294e79', 'Fruit Table');
    fields += this.addFieldIfHasValue(responses, 'f203decc-ee2c-4649-99b4-ad59171a8283', 'Pancake Station');
    return fields;
  }

  private addReceptionFields(responses: any): string {
    let fields = '';
    fields += this.addFieldIfHasValue(responses, 'b04b8edb-9f3e-46cc-a327-593beae8d176', 'Starter');
    fields += this.addFieldIfHasValue(responses, '23a1a3ac-026f-4c14-93bf-18c8aaf7140c', 'Main Course');
    fields += this.addFieldIfHasValue(responses, '07ecac55-9caf-4676-9c6f-dad8209b1934', 'Dessert');
    fields += this.addFieldIfHasValue(responses, '382c484e-bf21-4af4-b7bf-78efebee8051', 'Fruit Basket');
    fields += this.addFieldIfHasValue(responses, '7dacae11-0e08-485a-a895-30fc2d294e79', 'Fruit Table');
    fields += this.addFieldIfHasValue(responses, 'c4153dba-f043-4df7-9f8c-e0cc0f55edfd', 'Dessert Table');
    fields += this.addFieldIfHasValue(responses, 'f203decc-ee2c-4649-99b4-ad59171a8283', 'Pancake Station');
    fields += this.addFieldIfHasValue(responses, '109c8e68-7ede-4b45-9c20-6025e9a25958', 'Welcome Drinks');
    return fields;
  }

  private addFieldIfHasValue(responses: any, fieldId: string, fieldName: string): string {
    const response = responses[fieldId];
    if (!response) return '';
    
    const hasPrice = response.price && parseFloat(response.price) > 0;
    const hasNotes = response.notes && response.notes.trim();
    const isEnabled = response.enabled === true;
    
    // Only show if there's a price, notes, or it's enabled
    if (!hasPrice && !hasNotes && !isEnabled) return '';
    
    let result = fieldName;
    
    // For toggle fields, show Yes/No
    if (response.hasOwnProperty('enabled')) {
      result += ` - ${isEnabled ? 'Yes' : 'No'}`;
    }
    
    // Add notes if present
    if (hasNotes) {
      result += ` - ${response.notes.trim()}`;
    }
    
    return result + '\n';
  }

  private async createGoogleEvent(calendarEvent: CalendarEvent, accessToken: string) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${this.integration.calendar_id}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Calendar API error: ${errorText}`);
    }

    const createdEvent = await response.json();
    return { success: true, externalId: createdEvent.id };
  }

  private async updateGoogleEvent(calendarEvent: CalendarEvent, externalId: string, accessToken: string) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${this.integration.calendar_id}/events/${externalId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Calendar API error: ${errorText}`);
    }

    return { success: true };
  }

  private async deleteGoogleEvent(externalId: string, accessToken: string) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${this.integration.calendar_id}/events/${externalId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Calendar API error: ${errorText}`);
    }

    return { success: true };
  }

  private async createOutlookEvent(calendarEvent: CalendarEvent, accessToken: string) {
    const outlookEvent = {
      subject: calendarEvent.summary,
      body: {
        contentType: 'text',
        content: calendarEvent.description || '',
      },
      start: {
        dateTime: calendarEvent.start.dateTime,
        timeZone: calendarEvent.start.timeZone || 'UTC',
      },
      end: {
        dateTime: calendarEvent.end.dateTime,
        timeZone: calendarEvent.end.timeZone || 'UTC',
      },
      location: {
        displayName: calendarEvent.location || '',
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Outlook Calendar API error: ${errorText}`);
    }

    const createdEvent = await response.json();
    return { success: true, externalId: createdEvent.id };
  }

  private async updateOutlookEvent(calendarEvent: CalendarEvent, externalId: string, accessToken: string) {
    const outlookEvent = {
      subject: calendarEvent.summary,
      body: {
        contentType: 'text',
        content: calendarEvent.description || '',
      },
      start: {
        dateTime: calendarEvent.start.dateTime,
        timeZone: calendarEvent.start.timeZone || 'UTC',
      },
      end: {
        dateTime: calendarEvent.end.dateTime,
        timeZone: calendarEvent.end.timeZone || 'UTC',
      },
      location: {
        displayName: calendarEvent.location || '',
      },
    };

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${this.integration.calendar_id}/events/${externalId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(outlookEvent),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Outlook Calendar API error: ${errorText}`);
    }

    return { success: true };
  }

  private async deleteOutlookEvent(externalId: string, accessToken: string) {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${this.integration.calendar_id}/events/${externalId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Outlook Calendar API error: ${errorText}`);
    }

    return { success: true };
  }
}

serve(async (req) => {
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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    const { action, eventData, externalId } = await req.json();

    // Get active calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error('No active calendar integration found');
    }

    const calendarService = new CalendarService(integration, supabase);
    let result;

    switch (action) {
      case 'create':
        result = await calendarService.createEvent(eventData);
        break;
        
      case 'update':
        result = await calendarService.updateEvent(eventData, externalId);
        break;
        
      case 'delete':
        result = await calendarService.deleteEvent(externalId);
        break;
        
      default:
        throw new Error('Invalid action specified');
    }

    // Log sync operation
    await supabase
      .from('calendar_sync_logs')
      .insert({
        tenant_id: integration.tenant_id,
        integration_id: integration.id,
        event_id: eventData?.id,
        sync_direction: 'app_to_calendar',
        operation: action,
        status: result.success ? 'success' : 'error',
        error_message: result.error,
        external_event_id: result.externalId,
      });

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
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