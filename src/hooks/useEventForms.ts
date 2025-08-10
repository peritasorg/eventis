import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventForm {
  id: string;
  tenant_id: string;
  event_id: string;
  form_id: string;
  form_label: string;
  tab_order: number;
  form_responses: Record<string, any>;
  form_total: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  forms?: {
    id: string;
    name: string;
    description?: string;
    sections: any[];
  };
}

export const useEventForms = (eventId?: string) => {
  const { currentTenant } = useAuth();

  // Fetch event forms for an event
  const { data: eventForms, ...eventFormsQuery } = useSupabaseQuery(
    ['event-forms', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_forms')
        .select(`
          id,
          tenant_id,
          event_id,
          form_id,
          form_label,
          tab_order,
          form_responses,
          form_total,
          is_active,
          created_at,
          updated_at,
          forms!inner(
            id,
            name,
            description,
            sections
          )
        `)
        .eq('event_id', eventId)
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('tab_order');

      if (error) throw error;
      
      // Parse sections from JSON string to array for joined forms data
      const parsedData = (data || []).map(eventForm => {
        const forms = eventForm.forms as any;
        return {
          ...eventForm,
          forms: forms ? {
            ...forms,
            sections: typeof forms.sections === 'string' 
              ? JSON.parse(forms.sections) 
              : Array.isArray(forms.sections) ? forms.sections : []
          } : undefined
        };
      }) as unknown as EventForm[];
      
      return parsedData;
    }
  );

  // Create event form
  const createEventFormMutation = useSupabaseMutation(
    async (formData: {
      event_id: string;
      form_id: string;
      form_label?: string;
      tab_order?: number;
    }) => {
      const { data, error } = await supabase
        .from('event_forms')
        .insert({
          tenant_id: currentTenant?.id!,
          event_id: formData.event_id,
          form_id: formData.form_id,
          form_label: formData.form_label || 'Main Form',
          tab_order: formData.tab_order || 1,
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
      successMessage: 'Form added to event successfully',
      invalidateQueries: [['event-forms', eventId]]
    }
  );

  // Update event form responses
  const updateEventFormMutation = useSupabaseMutation(
    async (data: {
      id: string;
      form_responses?: Record<string, any>;
      form_total?: number;
      form_label?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('event_forms')
        .update({
          form_responses: data.form_responses,
          form_total: data.form_total,
          form_label: data.form_label,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    {
      successMessage: 'Form responses updated',
      invalidateQueries: [['event-forms', eventId]]
    }
  );

  // Delete event form
  const deleteEventFormMutation = useSupabaseMutation(
    async (eventFormId: string) => {
      const { error } = await supabase
        .from('event_forms')
        .update({ is_active: false })
        .eq('id', eventFormId);

      if (error) throw error;
    },
    {
      successMessage: 'Form removed from event',
      invalidateQueries: [['event-forms', eventId]]
    }
  );

  return {
    eventForms: eventForms || [],
    isLoading: eventFormsQuery.isLoading,
    createEventForm: createEventFormMutation.mutate,
    updateEventForm: updateEventFormMutation.mutate,
    deleteEventForm: deleteEventFormMutation.mutate,
    isCreating: createEventFormMutation.isPending,
    isUpdating: updateEventFormMutation.isPending,
    isDeleting: deleteEventFormMutation.isPending
  };
};