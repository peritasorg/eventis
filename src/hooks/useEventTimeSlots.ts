import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventTimeSlot {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  sort_order: number;
}

export const useEventTimeSlots = () => {
  const { currentTenant } = useAuth();

  const { data: timeSlots, refetch: refetchTimeSlots } = useSupabaseQuery(
    ['event-time-slots', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_time_slots')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) {
        console.error('Event time slots error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const createTimeSlotMutation = useSupabaseMutation(
    async ({ label, start_time, end_time, sort_order }: { 
      label: string; 
      start_time: string; 
      end_time: string; 
      sort_order: number;
    }) => {
      if (!currentTenant?.id) {
        throw new Error('No tenant found');
      }
      
      const { data, error } = await supabase
        .from('event_time_slots')
        .insert({
          tenant_id: currentTenant.id,
          label,
          start_time,
          end_time,
          sort_order,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Time slot created successfully!',
      invalidateQueries: [['event-time-slots', currentTenant?.id]]
    }
  );

  const updateTimeSlotMutation = useSupabaseMutation(
    async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('event_time_slots')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Time slot updated successfully!',
      invalidateQueries: [['event-time-slots', currentTenant?.id]]
    }
  );

  const deleteTimeSlotMutation = useSupabaseMutation(
    async (id: string) => {
      const { error } = await supabase
        .from('event_time_slots')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    {
      successMessage: 'Time slot deleted successfully!',
      invalidateQueries: [['event-time-slots', currentTenant?.id]]
    }
  );

  return {
    timeSlots,
    refetchTimeSlots,
    createTimeSlot: createTimeSlotMutation.mutate,
    updateTimeSlot: updateTimeSlotMutation.mutate,
    deleteTimeSlot: deleteTimeSlotMutation.mutate,
    isCreating: createTimeSlotMutation.isPending,
    isUpdating: updateTimeSlotMutation.isPending,
    isDeleting: deleteTimeSlotMutation.isPending
  };
};