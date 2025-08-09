import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useEventForms = (eventId: string) => {
  const { currentTenant } = useAuth();

  const { data: eventForms, refetch: refetchForms } = useSupabaseQuery(
    ['event-forms', eventId],
    async () => {
      console.log('🐛 useEventForms Debug - eventId:', eventId, 'currentTenant.id:', currentTenant?.id);
      if (!eventId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_forms')
        .select(`
          *,
          form_templates (
            id,
            name,
            description
          )
        `)
        .eq('event_id', eventId)
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('tab_order');
      
      if (error) {
        console.error('🐛 Event forms error:', error);
        return [];
      }
      
      console.log('🐛 useEventForms Debug - fetched data:', data);
      return data || [];
    }
  );

  const addFormTabMutation = useSupabaseMutation(
    async ({ templateId, label, tabOrder }: { templateId: string; label: string; tabOrder: number }) => {
      if (!currentTenant?.id) {
        throw new Error('No tenant found');
      }
      
      const { data, error } = await supabase
        .from('event_forms')
        .insert({
          tenant_id: currentTenant.id,
          event_id: eventId,
          form_template_id: templateId,
          form_label: label,
          tab_order: tabOrder,
          form_responses: {},
          form_total: 0,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Form tab added successfully!',
      invalidateQueries: [['event-forms', eventId]]
    }
  );

  return {
    eventForms,
    refetchForms,
    addFormTab: addFormTabMutation.mutate,
    isAddingForm: addFormTabMutation.isPending
  };
};