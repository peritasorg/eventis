import { useEffect, useRef } from 'react';
import { useManualEventSync } from './useCalendarSync';
import { calendarSyncService } from '@/services/calendarSync';

export const useEventAutoSync = (eventId: string, isEditing: boolean) => {
  const { syncEvent } = useManualEventSync();
  const hasChanges = useRef(false);
  const lastEventId = useRef<string | null>(null);

  useEffect(() => {
    // Track when we're viewing/editing a different event
    if (lastEventId.current && lastEventId.current !== eventId && hasChanges.current) {
      // User navigated away from an event they were editing - auto sync if enabled
      autoSyncOnExit(lastEventId.current);
    }
    lastEventId.current = eventId;
  }, [eventId]);

  useEffect(() => {
    // Track if user is editing
    if (isEditing) {
      hasChanges.current = true;
    }
  }, [isEditing]);

  const autoSyncOnExit = async (exitedEventId: string) => {
    try {
      // Check if any integration has auto_sync enabled
      const integrations = await calendarSyncService.getIntegrations();
      
      for (const integration of integrations) {
        const preferences = await calendarSyncService.getPreferences(integration.id);
        if (preferences?.auto_sync) {
          // Auto-sync the event
          await syncEvent(exitedEventId, 'update');
          break; // Only need to sync once
        }
      }
    } catch (error) {
      console.error('Auto-sync on exit failed:', error);
    } finally {
      hasChanges.current = false;
    }
  };

  // Cleanup on unmount (navigation away)
  useEffect(() => {
    return () => {
      if (hasChanges.current && lastEventId.current) {
        autoSyncOnExit(lastEventId.current);
      }
    };
  }, []);

  return { autoSyncOnExit };
};