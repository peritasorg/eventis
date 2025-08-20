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

interface ReconciliationAnalysis {
  totalGoogleEvents: number;
  eventsToDelete: GoogleCalendarEvent[];
  appEventsToSync: any[];
  matchedEvents: { googleEvent: GoogleCalendarEvent; appEvent: any }[];
  duplicateRisk: number;
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

  async analyzeCalendarState(targetDate: string): Promise<ReconciliationAnalysis> {
    console.log('🔍 Analyzing calendar state from:', targetDate);
    
    // Fetch Google Calendar events from target date onwards
    const endDate = new Date('2028-01-31T23:59:59Z').toISOString();
    const googleEvents = await this.listGoogleCalendarEvents(targetDate, endDate);
    
    console.log(`📅 Found ${googleEvents.length} Google Calendar events from ${targetDate}`);

    // Fetch app events from target date onwards
    const { data: appEvents, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('tenant_id', this.integration.tenant_id)
      .gte('event_date', targetDate.split('T')[0])
      .is('external_calendar_id', null);

    if (error) {
      throw new Error(`Failed to fetch app events: ${error.message}`);
    }

    console.log(`📱 Found ${appEvents?.length || 0} app events without external_calendar_id`);

    // Analyze potential matches and duplicates
    const matchedEvents: { googleEvent: GoogleCalendarEvent; appEvent: any }[] = [];
    const eventsToDelete: GoogleCalendarEvent[] = [];

    for (const googleEvent of googleEvents) {
      const eventDate = googleEvent.start.dateTime ? 
        new Date(googleEvent.start.dateTime).toISOString().split('T')[0] :
        googleEvent.start.date;

      // Look for potential matches with app events
      const potentialMatches = appEvents?.filter(appEvent => {
        const appEventDate = appEvent.event_date;
        const titleSimilarity = this.calculateTitleSimilarity(
          googleEvent.summary || '', 
          appEvent.title || ''
        );
        
        return appEventDate === eventDate && titleSimilarity > 0.7;
      }) || [];

      if (potentialMatches.length > 0) {
        matchedEvents.push({
          googleEvent,
          appEvent: potentialMatches[0] // Take the best match
        });
      } else {
        // Mark for deletion if no good match found
        eventsToDelete.push(googleEvent);
      }
    }

    const duplicateRisk = Math.round((matchedEvents.length / Math.max(googleEvents.length, 1)) * 100);

    return {
      totalGoogleEvents: googleEvents.length,
      eventsToDelete,
      appEventsToSync: appEvents || [],
      matchedEvents,
      duplicateRisk,
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
    const parts = [];
    
    if (appEvent.event_type) {
      parts.push(`Event Type: ${appEvent.event_type}`);
    }
    
    if (appEvent.primary_contact_name) {
      parts.push(`Contact: ${appEvent.primary_contact_name}`);
    }
    
    if (appEvent.primary_contact_number) {
      parts.push(`Phone: ${appEvent.primary_contact_number}`);
    }
    
    if (appEvent.men_count || appEvent.ladies_count) {
      parts.push(`Guests: ${(appEvent.men_count || 0) + (appEvent.ladies_count || 0)} (${appEvent.men_count || 0} men, ${appEvent.ladies_count || 0} ladies)`);
    }
    
    return parts.join('\n');
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

    const { action, targetDate, dryRun = true, eventsToDelete, appEventsToSync } = await req.json();

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
      case 'analyze':
        result = await reconciliationService.analyzeCalendarState(targetDate);
        break;
        
      case 'cleanup':
        result = await reconciliationService.performCleanup(eventsToDelete, dryRun);
        break;
        
      case 'bulk-sync':
        result = await reconciliationService.performBulkSync(appEventsToSync, dryRun);
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
        sync_data: { action, targetDate, dryRun, result },
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