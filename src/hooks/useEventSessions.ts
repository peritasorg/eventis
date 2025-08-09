import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventSession {
  id: string;
  parent_event_id: string | null;
  is_sub_event: boolean;
  session_type: string | null;
  session_order: number;
  event_name: string;
  event_start_date: string;
  start_time: string;
  end_time: string;
  estimated_guests: number;
  total_amount: number;
  form_total: number;
}

export const useEventSessions = (eventId: string) => {
  const { currentTenant } = useAuth();

  const { data: eventHierarchy, refetch: refetchSessions } = useSupabaseQuery(
    ['event-sessions', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .rpc('get_event_with_sessions', { p_event_id: eventId });
      
      if (error) {
        console.error('Event sessions error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const createSessionsMutation = useSupabaseMutation(
    async ({ 
      parentEventId, 
      sessions 
    }: { 
      parentEventId: string; 
      sessions: Array<{
        session_type: string;
        session_order: number;
        event_name: string;
        start_time: string;
        end_time: string;
      }>
    }) => {
      if (!currentTenant?.id) {
        throw new Error('No tenant found');
      }
      
      // Get parent event details
      const { data: parentEvent, error: parentError } = await supabase
        .from('events')
        .select('*')
        .eq('id', parentEventId)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (parentError) throw parentError;
      
      // Create sub-events
      const sessionInserts = sessions.map((session, index) => ({
        tenant_id: currentTenant.id,
        parent_event_id: parentEventId,
        is_sub_event: true,
        session_type: session.session_type,
        session_order: session.session_order,
        event_name: session.event_name,
        event_type: parentEvent.event_type,
        customer_id: parentEvent.customer_id,
        event_start_date: parentEvent.event_start_date,
        event_end_date: parentEvent.event_end_date,
        start_time: session.start_time,
        end_time: session.end_time,
        estimated_guests: 0, // Will be filled by user
        status: parentEvent.status,
        booking_stage: parentEvent.booking_stage
      }));
      
      const { data, error } = await supabase
        .from('events')
        .insert(sessionInserts)
        .select();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Event sessions created successfully!',
      invalidateQueries: [['event-sessions', eventId], ['events']]
    }
  );

  const deleteSessionMutation = useSupabaseMutation(
    async (sessionId: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', sessionId)
        .eq('tenant_id', currentTenant?.id);
      
      if (error) throw error;
    },
    {
      successMessage: 'Session deleted successfully!',
      invalidateQueries: [['event-sessions', eventId], ['events']]
    }
  );

  return {
    eventHierarchy,
    refetchSessions,
    createSessions: createSessionsMutation.mutate,
    isCreatingSessions: createSessionsMutation.isPending,
    deleteSession: deleteSessionMutation.mutate,
    isDeletingSession: deleteSessionMutation.isPending
  };
};