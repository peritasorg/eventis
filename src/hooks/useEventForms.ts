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
  men_count?: number;
  ladies_count?: number;
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
          men_count,
          ladies_count,
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
        men_count: 0,
        ladies_count: 0,
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
      men_count?: number;
      ladies_count?: number;
      guest_count?: number;
      guest_price_total?: number;
    }) => {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      // Only include fields that are actually being updated
      if (data.form_responses !== undefined) updateData.form_responses = data.form_responses;
      if (data.form_total !== undefined) updateData.form_total = data.form_total;
      if (data.form_label !== undefined) updateData.form_label = data.form_label;
      if (data.men_count !== undefined) updateData.men_count = data.men_count;
      if (data.ladies_count !== undefined) updateData.ladies_count = data.ladies_count;
      if (data.guest_count !== undefined) updateData.guest_count = data.guest_count;
      if (data.guest_price_total !== undefined) updateData.guest_price_total = data.guest_price_total;

      const { data: result, error } = await supabase
        .from('event_forms')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    {
      invalidateQueries: [['event-forms', eventId]],
      onSuccess: () => {
        // No toast for regular updates to avoid spam
      }
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

  // Synchronize event forms with event type
  const syncEventFormsWithEventTypeMutation = useSupabaseMutation(
    async ({ eventId, eventType }: { eventId: string; eventType: string }) => {
      if (!currentTenant?.id || !eventType) {
        throw new Error('Missing tenant ID or event type');
      }

      console.log('🔄 Syncing event forms with event type:', { eventId, eventType });

      // Get current event forms
      const { data: currentEventForms, error: currentFormsError } = await supabase
        .from('event_forms')
        .select('id, form_id, form_label, form_responses')
        .eq('event_id', eventId)
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true);

      if (currentFormsError) throw currentFormsError;

      // Get expected forms for the new event type
      const { data: eventTypeConfig, error: configError } = await supabase
        .from('event_type_configs')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('event_type', eventType)
        .eq('is_active', true)
        .maybeSingle();

      if (configError) throw configError;
      if (!eventTypeConfig) {
        console.log('No event type config found for:', eventType);
        return;
      }

      // Get expected form mappings
      const { data: expectedMappings, error: mappingsError } = await supabase
        .from('event_type_form_mappings')
        .select('form_id, default_label, sort_order')
        .eq('event_type_config_id', eventTypeConfig.id)
        .eq('tenant_id', currentTenant.id)
        .eq('auto_assign', true)
        .order('sort_order');

      if (mappingsError) throw mappingsError;

      const expectedFormIds = expectedMappings?.map(m => m.form_id) || [];
      const currentFormIds = currentEventForms?.map(ef => ef.form_id) || [];

      console.log('📊 Form sync analysis:', {
        currentFormIds,
        expectedFormIds,
        toRemove: currentFormIds.filter(id => !expectedFormIds.includes(id)),
        toAdd: expectedFormIds.filter(id => !currentFormIds.includes(id))
      });

      // Remove forms that shouldn't be there
      const formsToRemove = currentEventForms?.filter(ef => !expectedFormIds.includes(ef.form_id)) || [];
      for (const formToRemove of formsToRemove) {
        await supabase
          .from('event_forms')
          .update({ is_active: false })
          .eq('id', formToRemove.id);
      }

      // Add forms that should be there
      const formsToAdd = expectedMappings?.filter(mapping => !currentFormIds.includes(mapping.form_id)) || [];
      for (const mappingToAdd of formsToAdd) {
        // Get form structure for default responses
        const { data: formStructureData } = await supabase
          .from('forms')
          .select('sections')
          .eq('id', mappingToAdd.form_id)
          .eq('tenant_id', currentTenant.id)
          .single();

        let defaultResponses = {};
        if (formStructureData) {
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

            fieldsData?.forEach(field => {
              if (field.field_type === 'fixed_price_notes_toggle' || 
                  field.field_type === 'fixed_price_quantity_notes_toggle') {
                defaultResponses[field.id] = { enabled: false };
              }
            });
          }
        }

        await supabase
          .from('event_forms')
          .insert({
            tenant_id: currentTenant.id,
            event_id: eventId,
            form_id: mappingToAdd.form_id,
            form_label: mappingToAdd.default_label || 'Form',
            tab_order: mappingToAdd.sort_order || 1,
            form_order: mappingToAdd.sort_order || 1,
            form_responses: defaultResponses,
            form_total: 0,
            guest_count: 0,
            guest_price_total: 0,
            men_count: 0,
            ladies_count: 0,
            is_active: true
          });
      }

      console.log('✅ Event forms synchronized with event type');
    },
    {
      successMessage: 'Event forms synchronized successfully',
      invalidateQueries: [['event-forms', eventId]]
    }
  );

  return {
    eventForms: eventForms || [],
    isLoading: eventFormsQuery.isLoading,
    createEventForm: createEventFormMutation.mutate,
    updateEventForm: updateEventFormMutation.mutate,
    deleteEventForm: deleteEventFormMutation.mutate,
    syncEventFormsWithEventType: syncEventFormsWithEventTypeMutation.mutate,
    isCreating: createEventFormMutation.isPending,
    isUpdating: updateEventFormMutation.isPending,
    isDeleting: deleteEventFormMutation.isPending,
    isSyncing: syncEventFormsWithEventTypeMutation.isPending
  };
};