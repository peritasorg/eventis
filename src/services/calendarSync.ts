import { supabase } from '@/integrations/supabase/client';

export interface CalendarIntegration {
  id: string;
  provider: 'google' | 'outlook';
  calendar_id: string;
  calendar_name: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_direction: 'to_calendar' | 'from_calendar' | 'bidirectional';
  created_at: string;
}

export interface CalendarSyncPreferences {
  auto_sync: boolean;
  sync_frequency: number;
  sync_event_types: string[];
  sync_event_statuses: string[];
  include_form_data: boolean;
  description_template: string | null;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  externalId?: string;
}

class CalendarSyncService {
  async getIntegrations(): Promise<CalendarIntegration[]> {
    const { data, error } = await supabase
      .from('calendar_integrations')
      .select('id, provider, calendar_id, calendar_name, is_active, last_sync_at, sync_direction, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch calendar integrations:', error);
      return [];
    }

    return (data || []) as CalendarIntegration[];
  }

  async removeIntegration(integrationId: string): Promise<void> {
    const { error } = await supabase
      .from('calendar_integrations')
      .update({ is_active: false })
      .eq('id', integrationId);

    if (error) {
      throw new Error('Failed to remove calendar integration');
    }
  }

  async connectGoogle(): Promise<string> {
    const { data, error } = await supabase.functions.invoke('google-oauth', {
      method: 'GET',
      body: JSON.stringify({ action: 'authorize' }),
    });

    if (error) {
      throw new Error('Failed to initiate Google OAuth');
    }

    return data.authUrl;
  }

  async connectOutlook(): Promise<string> {
    const { data, error } = await supabase.functions.invoke('outlook-oauth', {
      method: 'GET',
      body: JSON.stringify({ action: 'authorize' }),
    });

    if (error) {
      throw new Error('Failed to initiate Outlook OAuth');
    }

    return data.authUrl;
  }

  async syncEventToCalendar(
    eventId: string,
    integrationId: string,
    action: 'create' | 'update' | 'delete',
    externalEventId?: string
  ): Promise<SyncResult> {
    // Get event data
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        customers (
          name,
          email,
          phone
        )
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return { success: false, error: 'Event not found' };
    }

    const { data, error } = await supabase.functions.invoke('calendar-sync', {
      body: {
        action,
        eventId,
        integrationId,
        eventData,
        externalEventId,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data;
  }

  async getPreferences(integrationId: string): Promise<CalendarSyncPreferences | null> {
    const { data, error } = await supabase
      .from('calendar_sync_preferences')
      .select('*')
      .eq('integration_id', integrationId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch sync preferences:', error);
      return null;
    }

    return data;
  }

  async updatePreferences(
    integrationId: string,
    preferences: Partial<CalendarSyncPreferences>
  ): Promise<void> {
    const { data: existing } = await supabase
      .from('calendar_sync_preferences')
      .select('*')
      .eq('integration_id', integrationId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('calendar_sync_preferences')
        .update(preferences)
        .eq('integration_id', integrationId);

      if (error) {
        throw new Error('Failed to update sync preferences');
      }
    } else {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('calendar_sync_preferences')
        .insert({
          integration_id: integrationId,
          user_id: user.id,
          tenant_id: userData?.tenant_id,
          ...preferences,
        });

      if (error) {
        throw new Error('Failed to create sync preferences');
      }
    }
  }

  async getSyncLogs(integrationId: string, limit = 50) {
    const { data, error } = await supabase
      .from('calendar_sync_logs')
      .select('*')
      .eq('integration_id', integrationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch sync logs:', error);
      return [];
    }

    return data || [];
  }

  async testSync(integrationId: string): Promise<boolean> {
    try {
      // Try to sync a dummy event to test the connection
      const result = await this.syncEventToCalendar(
        'test-event',
        integrationId,
        'create'
      );
      return result.success;
    } catch {
      return false;
    }
  }
}

export const calendarSyncService = new CalendarSyncService();