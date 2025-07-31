import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { calendarSyncService } from '@/services/calendarSync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EventData {
  id: string;
  event_name: string;
  event_type: string;
  status: string;
  event_start_date: string;
  start_time: string;
  end_time: string;
  estimated_guests: number;
  venue_area?: string;
  form_responses?: any;
  customers?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export const useCalendarSync = () => {
  const { user, currentTenant } = useAuth();

  const syncEventToCalendars = async (eventData: EventData, action: 'create' | 'update' | 'delete') => {
    if (!user || !currentTenant) return;

    try {
      // Get all active integrations for the user
      const integrations = await calendarSyncService.getIntegrations();
      
      if (integrations.length === 0) {
        return; // No integrations to sync to
      }

      for (const integration of integrations) {
        // Check if this event type and status should be synced
        const preferences = await calendarSyncService.getPreferences(integration.id);
        
        if (!preferences || !preferences.auto_sync) {
          continue; // Auto sync disabled for this integration
        }

        // Check if event type should be synced
        if (preferences.sync_event_types && preferences.sync_event_types.length > 0) {
          if (!preferences.sync_event_types.includes(eventData.event_type)) {
            continue;
          }
        }

        // Check if event status should be synced
        if (preferences.sync_event_statuses && preferences.sync_event_statuses.length > 0) {
          if (!preferences.sync_event_statuses.includes(eventData.status)) {
            continue;
          }
        }

        // Get existing sync log to check if event was already synced
        const { data: existingLog } = await supabase
          .from('calendar_sync_logs')
          .select('external_event_id')
          .eq('integration_id', integration.id)
          .eq('event_id', eventData.id)
          .eq('status', 'success')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const externalEventId = existingLog?.external_event_id;

        // Sync the event
        const result = await calendarSyncService.syncEventToCalendar(
          eventData.id,
          integration.id,
          action === 'create' && externalEventId ? 'update' : action, // If event exists, update instead of create
          externalEventId
        );

        if (!result.success) {
          console.error(`Failed to sync event to ${integration.provider}:`, result.error);
          toast.error(`Failed to sync event to ${integration.calendar_name}`);
        }
      }
    } catch (error) {
      console.error('Calendar sync error:', error);
    }
  };

  const setupRealTimeSync = () => {
    if (!user || !currentTenant) return;

    // Listen for event changes
    const channel = supabase
      .channel('event-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        async (payload) => {
          const eventData = payload.new as EventData;
          await syncEventToCalendars(eventData, 'create');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        async (payload) => {
          const eventData = payload.new as EventData;
          await syncEventToCalendars(eventData, 'update');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'events',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        async (payload) => {
          const eventData = payload.old as EventData;
          await syncEventToCalendars(eventData, 'delete');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    if (!user || !currentTenant) return;

    // Set up real-time sync
    const cleanup = setupRealTimeSync();

    return cleanup;
  }, [user, currentTenant]);

  return {
    syncEventToCalendars,
  };
};

// Hook to use in event forms/components for manual sync triggers
export const useManualEventSync = () => {
  const syncEvent = async (eventId: string, action: 'create' | 'update' | 'delete') => {
    try {
      // Get event data with customer info
      const { data: eventData, error } = await supabase
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

      if (error || !eventData) {
        throw new Error('Event not found');
      }

      // Get all active integrations
      const integrations = await calendarSyncService.getIntegrations();
      
      const results = await Promise.all(
        integrations.map(async (integration) => {
          // For manual sync, we don't check auto_sync preferences - user explicitly requested it
          const preferences = await calendarSyncService.getPreferences(integration.id);

          // Get existing external event ID if updating/deleting
          const { data: existingLog } = await supabase
            .from('calendar_sync_logs')
            .select('external_event_id')
            .eq('integration_id', integration.id)
            .eq('event_id', eventId)
            .eq('status', 'success')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const result = await calendarSyncService.syncEventToCalendar(
            eventId,
            integration.id,
            action === 'create' && existingLog?.external_event_id ? 'update' : action,
            existingLog?.external_event_id
          );

          return {
            integration: integration.calendar_name,
            success: result.success,
            error: result.error,
          };
        })
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => r.error).length;

      if (successful > 0) {
        toast.success(`Event synced to ${successful} calendar${successful > 1 ? 's' : ''}`);
      }
      if (failed > 0) {
        toast.error(`Failed to sync to ${failed} calendar${failed > 1 ? 's' : ''}`);
      }
      if (successful === 0 && failed === 0) {
        toast.info('No calendar integrations available to sync to');
      }

      return results;
    } catch (error) {
      toast.error('Failed to sync event to calendars');
      throw error;
    }
  };

  return { syncEvent };
};