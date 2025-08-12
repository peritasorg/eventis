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
  start_time?: string;
  end_time?: string;
  guest_count?: number;
  guest_price_total?: number;
  form_order?: number;
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

  // Fetch event forms for an event with complete form data including fields
  const { data: eventForms, ...eventFormsQuery } = useSupabaseQuery(
    ['event-forms', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return [];
      
      // First get the event forms
      const { data: eventFormsData, error: eventFormsError } = await supabase
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
          start_time,
          end_time,
          guest_count,
          guest_price_total,
          form_order,
          created_at,
          updated_at
        `)
        .eq('event_id', eventId)
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('form_order');

      if (eventFormsError) throw eventFormsError;
      if (!eventFormsData || eventFormsData.length === 0) return [];

      // Get the complete form data with fields for each event form
      const enrichedEventForms = await Promise.all(
        eventFormsData.map(async (eventForm) => {
          // Get the form data
          const { data: formData, error: formError } = await supabase
            .from('forms')
            .select(`
              id,
              name,
              description,
              sections
            `)
            .eq('id', eventForm.form_id)
            .eq('tenant_id', currentTenant.id)
            .eq('is_active', true)
            .single();

          if (formError || !formData) {
            console.warn(`Could not load form data for form_id: ${eventForm.form_id}`, formError);
            return null;
          }

          // Parse sections and get field data for each section
          const sections = typeof formData.sections === 'string' 
            ? JSON.parse(formData.sections) 
            : Array.isArray(formData.sections) ? formData.sections : [];

          // Get all field IDs from all sections
          const allFieldIds = sections.flatMap((section: any) => section.field_ids || []);
          
          // Get field data for all fields in the form
          let formFields = [];
          if (allFieldIds.length > 0) {
            const { data: fieldsData, error: fieldsError } = await supabase
              .from('form_fields')
              .select('*')
              .in('id', allFieldIds)
              .eq('tenant_id', currentTenant.id)
              .eq('is_active', true);

            if (fieldsError) {
              console.warn(`Could not load fields for form: ${formData.name}`, fieldsError);
            } else {
              formFields = fieldsData || [];
            }
          }

          return {
            ...eventForm,
            forms: {
              ...formData,
              sections: sections.map((section: any) => ({
                ...section,
                fields: (section.field_ids || []).map((fieldId: string) => 
                  formFields.find(field => field.id === fieldId)
                ).filter(Boolean)
              }))
            }
          };
        })
      );

      // Filter out any null results and return
      return enrichedEventForms.filter(Boolean) as EventForm[];
    }
  );

  // Create event form with duplicate prevention
  const createEventFormMutation = useSupabaseMutation(
    async (formInput: {
      event_id: string;
      form_id: string;
      form_label?: string;
      tab_order?: number;
    }) => {
      if (!currentTenant?.id) {
        throw new Error('No tenant ID available');
      }

      // Check if this form is already added to the event
      const { data: existingForm, error: checkError } = await supabase
        .from('event_forms')
        .select('id')
        .eq('event_id', formInput.event_id)
        .eq('form_id', formInput.form_id)
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing form:', checkError);
        throw checkError;
      }

      if (existingForm) {
        throw new Error('This form is already added to this event');
      }
      
      // Get form structure to initialize default responses
      const { data: formStructureData, error: formError } = await supabase
        .from('forms')
        .select('sections')
        .eq('id', formInput.form_id)
        .eq('tenant_id', currentTenant.id)
        .single();

      let defaultResponses = {};
      if (formStructureData && !formError) {
        const sections = typeof formStructureData.sections === 'string' 
          ? JSON.parse(formStructureData.sections) 
          : Array.isArray(formStructureData.sections) ? formStructureData.sections : [];
        
        const allFieldIds = sections.flatMap((section: any) => section.field_ids || []);
        
        if (allFieldIds.length > 0) {
          const { data: fieldsData } = await supabase
            .from('form_fields')
            .select('*')
            .in('id', allFieldIds)
            .eq('tenant_id', currentTenant.id)
            .eq('is_active', true);

          // Initialize all toggle fields as disabled by default
          fieldsData?.forEach(field => {
            if (field.field_type === 'fixed_price_notes_toggle' || 
                field.field_type === 'fixed_price_quantity_notes_toggle') {
              defaultResponses[field.id] = { enabled: false };
            }
          });
        }
      }

      const insertData = {
        tenant_id: currentTenant.id,
        event_id: formInput.event_id,
        form_id: formInput.form_id,
        form_label: formInput.form_label || 'Main Form',
        tab_order: formInput.tab_order || 1,
        form_order: formInput.tab_order || 1,
        form_responses: defaultResponses,
        form_total: 0,
        guest_count: 0,
        guest_price_total: 0,
        is_active: true
      };
      
      const { data, error } = await supabase
        .from('event_forms')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }
      
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