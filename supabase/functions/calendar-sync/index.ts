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
      const calendarEvent = this.formatEventForCalendar(eventData);
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
      const calendarEvent = this.formatEventForCalendar(eventData);

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

  private formatEventForCalendar(eventData: EventData): CalendarEvent {
    // Handle multi-day events
    const startDate = eventData.event_start_date;
    const endDate = eventData.event_end_date || eventData.event_start_date;
    
    const startDateTime = `${startDate}T${eventData.start_time}`;
    const endDateTime = `${endDate}T${eventData.end_time}`;
    
    // Default timezone - this should be configurable per tenant in future
    const timeZone = 'Europe/London';
    
    let description = `Event Type: ${eventData.event_type}\n`;
    description += `Guests: ${eventData.total_guests || eventData.estimated_guests}\n`;
    
    if (eventData.customers) {
      description += `\nCustomer: ${eventData.customers.name}\n`;
      if (eventData.customers.email) description += `Email: ${eventData.customers.email}\n`;
      if (eventData.customers.phone) description += `Phone: ${eventData.customers.phone}\n`;
    }

    if (eventData.venue_area) {
      description += `\nVenue Area: ${eventData.venue_area}\n`;
    }

    // Add form responses if available
    if (eventData.form_responses && Object.keys(eventData.form_responses).length > 0) {
      description += `\nForm Details:\n`;
      Object.entries(eventData.form_responses).forEach(([key, value]) => {
        if (value && typeof value === 'object' && 'enabled' in value && value.enabled) {
          // Use the stored label from the response, fallback to formatting the key
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