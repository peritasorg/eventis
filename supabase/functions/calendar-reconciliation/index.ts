import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
  location?: string;
  created: string;
  updated: string;
}

class CalendarReconciliationService {
  private integration: any;
  private supabase: any;

  constructor(integration: any, supabase: any) {
    this.integration = integration;
    this.supabase = supabase;
  }

  async refreshTokenIfNeeded(): Promise<string> {
    if (!this.integration.token_expires_at) {
      return this.integration.access_token;
    }

    const expiryDate = new Date(this.integration.token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiryDate > fiveMinutesFromNow) {
      return this.integration.access_token;
    }

    console.log('🔄 Refreshing Google Calendar token...');
    
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
        refresh_token: this.integration.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      throw new Error(`Token refresh failed: ${refreshResponse.status}`);
    }

    const tokenData = await refreshResponse.json();
    const newExpiryDate = new Date(Date.now() + tokenData.expires_in * 1000);

    await this.supabase
      .from('calendar_integrations')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: newExpiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.integration.id);

    return tokenData.access_token;
  }

  async listGoogleCalendarEvents(startDate: string, endDate: string): Promise<GoogleCalendarEvent[]> {
    const accessToken = await this.refreshTokenIfNeeded();
    
    const params = new URLSearchParams({
      timeMin: startDate,
      timeMax: endDate,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500', // Google's max per request
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${this.integration.calendar_id}/events?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar events: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  async deleteAllGoogleEvents(targetDate: string): Promise<{
    success: boolean;
    deletedCount: number;
    errors: string[];
  }> {
    console.log('🗑️ Deleting all Google Calendar events from:', targetDate);
    
    // Fetch Google Calendar events from target date onwards
    const endDate = new Date('2028-01-31T23:59:59Z').toISOString();
    const googleEvents = await this.listGoogleCalendarEvents(targetDate, endDate);
    
    console.log(`📅 Found ${googleEvents.length} Google Calendar events to delete`);

    const accessToken = await this.refreshTokenIfNeeded();
    const errors: string[] = [];
    let deletedCount = 0;

    // Delete in batches to respect API limits
    const batchSize = 10;
    for (let i = 0; i < googleEvents.length; i += batchSize) {
      const batch = googleEvents.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (event) => {
        try {
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.integration.calendar_id}/events/${event.id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          if (response.ok) {
            deletedCount++;
            console.log(`✅ Deleted: ${event.summary} (${event.id})`);
          } else {
            const errorText = await response.text();
            errors.push(`Failed to delete "${event.summary}": ${errorText}`);
          }
        } catch (error) {
          errors.push(`Error deleting "${event.summary}": ${error.message}`);
        }
      }));

      // Rate limiting delay
      if (i + batchSize < googleEvents.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: errors.length === 0,
      deletedCount,
      errors,
    };
  }

  async syncAllEvents(targetDate: string): Promise<{
    success: boolean;
    syncedCount: number;
    errors: string[];
  }> {
    console.log('🔄 Syncing all app events from:', targetDate);
    
    // Fetch ALL app events from target date onwards
    const { data: appEvents, error } = await this.supabase
      .rpc('get_all_events_for_sync', {
        p_tenant_id: this.integration.tenant_id,
        p_from_date: targetDate.split('T')[0]
      });

    if (error) {
      throw new Error(`Failed to fetch app events: ${error.message}`);
    }

    console.log(`📱 Found ${appEvents?.length || 0} app events to sync`);

    const accessToken = await this.refreshTokenIfNeeded();
    const errors: string[] = [];
    let syncedCount = 0;

    // Sync in batches
    const batchSize = 5;
    for (let i = 0; i < (appEvents?.length || 0); i += batchSize) {
      const batch = appEvents?.slice(i, i + batchSize) || [];
      
      await Promise.all(batch.map(async (appEvent) => {
        try {
          const calendarEvent = this.formatEventForGoogle(appEvent);
          
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

          if (response.ok) {
            const googleEvent = await response.json();
            
            // Update app event with external_calendar_id
            await this.supabase
              .from('events')
              .update({ external_calendar_id: googleEvent.id })
              .eq('id', appEvent.id);

            syncedCount++;
            console.log(`✅ Synced: ${appEvent.title} → ${googleEvent.id}`);
          } else {
            const errorText = await response.text();
            errors.push(`Failed to sync "${appEvent.title}": ${errorText}`);
          }
        } catch (error) {
          errors.push(`Error syncing "${appEvent.title}": ${error.message}`);
        }
      }));

      // Rate limiting delay
      if (i + batchSize < (appEvents?.length || 0)) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return {
      success: errors.length === 0,
      syncedCount,
      errors,
    };
  }

  private calculateTitleSimilarity(title1: string, title2: string): number {
    const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const norm1 = normalize(title1);
    const norm2 = normalize(title2);
    
    if (norm1 === norm2) return 1.0;
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;
    
    // Simple word overlap calculation
    const words1 = norm1.split(/\s+/);
    const words2 = norm2.split(/\s+/);
    const intersection = words1.filter(word => words2.includes(word));
    
    return intersection.length / Math.max(words1.length, words2.length);
  }

  async performCleanup(eventsToDelete: GoogleCalendarEvent[], dryRun: boolean = false): Promise<{
    success: boolean;
    deletedCount: number;
    errors: string[];
  }> {
    console.log(`🧹 ${dryRun ? 'DRY RUN' : 'EXECUTING'} cleanup of ${eventsToDelete.length} events`);
    
    if (dryRun) {
      return {
        success: true,
        deletedCount: eventsToDelete.length,
        errors: [],
      };
    }

    const accessToken = await this.refreshTokenIfNeeded();
    const errors: string[] = [];
    let deletedCount = 0;

    // Delete in batches to respect API limits
    const batchSize = 10;
    for (let i = 0; i < eventsToDelete.length; i += batchSize) {
      const batch = eventsToDelete.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (event) => {
        try {
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${this.integration.calendar_id}/events/${event.id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          if (response.ok) {
            deletedCount++;
            console.log(`✅ Deleted: ${event.summary} (${event.id})`);
          } else {
            const errorText = await response.text();
            errors.push(`Failed to delete "${event.summary}": ${errorText}`);
          }
        } catch (error) {
          errors.push(`Error deleting "${event.summary}": ${error.message}`);
        }
      }));

      // Rate limiting delay
      if (i + batchSize < eventsToDelete.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: errors.length === 0,
      deletedCount,
      errors,
    };
  }

  async performBulkSync(appEvents: any[], dryRun: boolean = false): Promise<{
    success: boolean;
    syncedCount: number;
    errors: string[];
  }> {
    console.log(`🔄 ${dryRun ? 'DRY RUN' : 'EXECUTING'} bulk sync of ${appEvents.length} events`);
    
    if (dryRun) {
      return {
        success: true,
        syncedCount: appEvents.length,
        errors: [],
      };
    }

    const accessToken = await this.refreshTokenIfNeeded();
    const errors: string[] = [];
    let syncedCount = 0;

    // Sync in batches
    const batchSize = 5;
    for (let i = 0; i < appEvents.length; i += batchSize) {
      const batch = appEvents.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (appEvent) => {
        try {
          const calendarEvent = this.formatEventForGoogle(appEvent);
          
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

          if (response.ok) {
            const googleEvent = await response.json();
            
            // Update app event with external_calendar_id
            await this.supabase
              .from('events')
              .update({ external_calendar_id: googleEvent.id })
              .eq('id', appEvent.id);

            syncedCount++;
            console.log(`✅ Synced: ${appEvent.title} → ${googleEvent.id}`);
          } else {
            const errorText = await response.text();
            errors.push(`Failed to sync "${appEvent.title}": ${errorText}`);
          }
        } catch (error) {
          errors.push(`Error syncing "${appEvent.title}": ${error.message}`);
        }
      }));

      // Rate limiting delay
      if (i + batchSize < appEvents.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return {
      success: errors.length === 0,
      syncedCount,
      errors,
    };
  }

  private formatEventForGoogle(appEvent: any): any {
    const startDateTime = this.combineDateAndTime(appEvent.event_date, appEvent.start_time);
    const endDateTime = this.combineDateAndTime(appEvent.event_end_date || appEvent.event_date, appEvent.end_time);

    return {
      summary: appEvent.title || 'Untitled Event',
      description: this.buildEventDescription(appEvent),
      start: {
        dateTime: startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'UTC',
      },
      location: appEvent.venue_location || '',
    };
  }

  private combineDateAndTime(date: string, time?: string): string {
    if (!time) {
      return new Date(`${date}T09:00:00Z`).toISOString();
    }
    return new Date(`${date}T${time}:00Z`).toISOString();
  }

  private buildEventDescription(appEvent: any): string {
    return this.buildEnhancedDescription(appEvent);
  }

  private buildEnhancedDescription(appEvent: any): string {
    const eventType = appEvent.event_type?.toLowerCase();
    let description = '';
    
    // Primary contact information
    if (appEvent.primary_contact_name) {
      description += `Primary Contact: ${appEvent.primary_contact_name}\n`;
    }
    if (appEvent.primary_contact_number) {
      description += `Primary Contact No.: ${appEvent.primary_contact_number}\n\n`;
    }

    // Handle different event types with form data
    if (appEvent.event_forms && Array.isArray(appEvent.event_forms)) {
      appEvent.event_forms.forEach((form: any) => {
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
          description += this.addFieldIfHasValue(responses, 'fd83900d-34c0-4528-be1a-db5096b61b47', 'Top Up Lamb');
          description += this.addFieldIfHasValue(responses, '382c484e-bf21-4af4-b7bf-78efebee8051', 'Fruit Basket');  
          description += this.addFieldIfHasValue(responses, '7dacae11-0e08-485a-a895-30fc2d294e79', 'Fruit Table');
          description += this.addFieldIfHasValue(responses, 'f203decc-ee2c-4649-99b4-ad59171a8283', 'Pancake Station');
        } else if (formType.includes('reception')) {
          description += this.addFieldIfHasValue(responses, 'b04b8edb-9f3e-46cc-a327-593beae8d176', 'Starter');
          description += this.addFieldIfHasValue(responses, '23a1a3ac-026f-4c14-93bf-18c8aaf7140c', 'Main Course');
          description += this.addFieldIfHasValue(responses, '07ecac55-9caf-4676-9c6f-dad8209b1934', 'Dessert');
          description += this.addFieldIfHasValue(responses, '382c484e-bf21-4af4-b7bf-78efebee8051', 'Fruit Basket');
          description += this.addFieldIfHasValue(responses, '7dacae11-0e08-485a-a895-30fc2d294e79', 'Fruit Table');
          description += this.addFieldIfHasValue(responses, 'c4153dba-f043-4df7-9f8c-e0cc0f55edfd', 'Dessert Table');
          description += this.addFieldIfHasValue(responses, 'f203decc-ee2c-4649-99b4-ad59171a8283', 'Pancake Station');
          description += this.addFieldIfHasValue(responses, '109c8e68-7ede-4b45-9c20-6025e9a25958', 'Welcome Drinks');
        }
        
        description += '\n';
      });
    }
    
    return description.trim();
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

    const { action, targetDate } = await req.json();

    // Get active calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration) {
      throw new Error('No active Google Calendar integration found');
    }

    const reconciliationService = new CalendarReconciliationService(integration, supabase);
    let result;

    switch (action) {
      case 'delete-all':
        result = await reconciliationService.deleteAllGoogleEvents(targetDate);
        break;
        
      case 'sync-all':
        result = await reconciliationService.syncAllEvents(targetDate);
        break;
        
      default:
        throw new Error('Invalid action specified');
    }

    // Log reconciliation operation
    await supabase
      .from('calendar_sync_logs')
      .insert({
        tenant_id: integration.tenant_id,
        integration_id: integration.id,
        sync_direction: 'reconciliation',
        status: 'success',
        operation: action,
        sync_data: { action, targetDate, result },
      });

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Calendar reconciliation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});