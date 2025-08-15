import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CalendarEventData {
  id: string;
  event_name: string;
  event_start_date: string;
  event_end_date?: string;
  start_time: string;
  end_time: string;
  event_type: string;
  estimated_guests: number;
  total_guests?: number;
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
  external_calendar_id?: string;
}

export const useCalendarAutoSync = () => {
  const { currentTenant } = useAuth();
  const integrationCache = useRef<any>(null);
  const lastCheckTime = useRef<number>(0);

  // Cache calendar integration to avoid repeated queries
  const getCalendarIntegration = async () => {
    const now = Date.now();
    // Cache for 5 minutes
    if (integrationCache.current && (now - lastCheckTime.current) < 300000) {
      return integrationCache.current;
    }

    if (!currentTenant?.id) return null;

    try {
      const { data: integration, error } = await supabase
        .from('calendar_integrations')
        .select('id, provider, calendar_id, is_active')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .single();

      if (error || !integration) {
        integrationCache.current = null;
        return null;
      }

      integrationCache.current = integration;
      lastCheckTime.current = now;
      return integration;
    } catch (error) {
      console.error('Error fetching calendar integration:', error);
      return null;
    }
  };

  const syncEventToCalendar = async (eventData: CalendarEventData, action: 'create' | 'update' | 'delete' = 'create') => {
    try {
      const integration = await getCalendarIntegration();
      if (!integration) {
        console.log('No active calendar integration found');
        return { success: false, reason: 'no_integration' };
      }

      // For create/update, validate required fields
      if (action !== 'delete') {
        if (!eventData.event_start_date || !eventData.start_time || !eventData.event_name) {
          console.log('Missing required fields for calendar sync');
          return { success: false, reason: 'missing_data' };
        }
      }

      // For delete action, only need the external_calendar_id
      if (action === 'delete' && !eventData.external_calendar_id) {
        console.log('No external calendar ID for deletion');
        return { success: false, reason: 'no_external_id' };
      }

      // For update action, check if we have an external calendar ID
      if (action === 'update' && !eventData.external_calendar_id) {
        // If no external ID, treat as create
        action = 'create';
      }

      const requestBody: any = {
        action,
        eventId: eventData.id,
        integrationId: integration.id,
        eventData
      };

      // For delete action, we need the external event ID
      if (action === 'delete') {
        requestBody.externalEventId = eventData.external_calendar_id;
      }

      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: requestBody
      });

      if (error) {
        console.error('Calendar sync error:', error);
        return { success: false, reason: 'sync_error', error: error.message };
      }

      // For successful create operations, store the external calendar ID
      if (action === 'create' && data?.success && data?.externalId) {
        try {
          await supabase
            .from('events')
            .update({ external_calendar_id: data.externalId })
            .eq('id', eventData.id)
            .eq('tenant_id', currentTenant.id);
        } catch (updateError) {
          console.error('Error updating external calendar ID:', updateError);
        }
      }

      return { success: true, externalId: data?.externalId };
    } catch (error) {
      console.error('Error in calendar sync:', error);
      return { success: false, reason: 'sync_error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const autoSyncEvent = async (
    eventData: CalendarEventData,
    isNewEvent: boolean = false,
    showToasts: boolean = true
  ) => {
    try {
      // Determine action based on whether this is a new event or update
      const action = isNewEvent ? 'create' : 'update';
      
      const result = await syncEventToCalendar(eventData, action);
      
      if (result.success) {
        if (showToasts) {
          toast.success(`Event ${action === 'create' ? 'created' : 'updated'} in calendar`);
        }
        return { success: true, externalId: result.externalId };
      } else {
        // Only show error toasts for meaningful failures
        if (result.reason !== 'no_integration' && result.reason !== 'missing_data' && showToasts) {
          toast.error(`Failed to sync event to calendar: ${result.error || result.reason}`);
        }
        return { success: false, reason: result.reason };
      }
    } catch (error) {
      console.error('Auto-sync error:', error);
      if (showToasts) {
        toast.error('Failed to sync event to calendar');
      }
      return { success: false, reason: 'sync_error' };
    }
  };

  const deleteEventFromCalendar = async (eventData: CalendarEventData, showToasts: boolean = true) => {
    try {
      const result = await syncEventToCalendar(eventData, 'delete');
      
      if (result.success) {
        if (showToasts) {
          toast.success('Event removed from calendar');
        }
        return { success: true };
      } else {
        if (result.reason !== 'no_integration' && result.reason !== 'no_external_id' && showToasts) {
          toast.error(`Failed to remove event from calendar: ${result.error || result.reason}`);
        }
        return { success: false, reason: result.reason };
      }
    } catch (error) {
      console.error('Calendar delete error:', error);
      if (showToasts) {
        toast.error('Failed to remove event from calendar');
      }
      return { success: false, reason: 'sync_error' };
    }
  };

  return {
    autoSyncEvent,
    deleteEventFromCalendar,
    syncEventToCalendar,
    getCalendarIntegration
  };
};