import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventTypeFormMapping {
  id: string;
  tenant_id: string;
  event_type_config_id: string;
  form_id: string;
  default_label: string;
  auto_assign: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  forms?: {
    id: string;
    name: string;
    description: string;
  };
}

export const useEventTypeFormMappings = (eventTypeConfigId?: string) => {
  const { currentTenant } = useAuth();

  // Fetch all mappings for an event type with form template details
  const { data: mappings, refetch: refetchMappings } = useSupabaseQuery(
    ['event-type-form-mappings', eventTypeConfigId],
    async () => {
      if (!eventTypeConfigId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_type_form_mappings')
        .select('*')
        .eq('event_type_config_id', eventTypeConfigId)
        .eq('tenant_id', currentTenant.id)
        .order('sort_order');
      
      if (error) {
        console.error('Event type form mappings error:', error);
        return [];
      }
      
      // Now fetch form templates for these mappings
      if (data && data.length > 0) {
        const formIds = data.map(m => m.form_id);
        const { data: forms, error: formsError } = await supabase
          .from('forms')
          .select('id, name, description')
          .in('id', formIds)
          .eq('tenant_id', currentTenant.id);
        
        if (formsError) {
          console.error('Forms error:', formsError);
          return data.map(mapping => ({ ...mapping, forms: null }));
        }
        
        // Combine data
        return data.map(mapping => ({
          ...mapping,
          forms: forms?.find(f => f.id === mapping.form_id) || null
        }));
      }
      
      return data || [];
    }
  );

  // Add new mapping
  const addMappingMutation = useSupabaseMutation(
    async ({ formTemplateId, defaultLabel }: { formTemplateId: string; defaultLabel: string }) => {
      if (!currentTenant?.id || !eventTypeConfigId) {
        throw new Error('Missing tenant or event type');
      }
      
      // Get the next sort order
      const maxOrder = mappings?.reduce((max, mapping) => Math.max(max, mapping.sort_order), 0) || 0;
      
      const { data, error } = await supabase
        .from('event_type_form_mappings')
        .insert({
          tenant_id: currentTenant.id,
          event_type_config_id: eventTypeConfigId,
          form_id: formTemplateId,
          default_label: defaultLabel,
          sort_order: maxOrder + 1,
          auto_assign: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Form assigned to event type successfully!',
      invalidateQueries: [['event-type-form-mappings', eventTypeConfigId]]
    }
  );

  // Remove mapping
  const removeMappingMutation = useSupabaseMutation(
    async (mappingId: string) => {
      const { error } = await supabase
        .from('event_type_form_mappings')
        .delete()
        .eq('id', mappingId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Form unassigned from event type!',
      invalidateQueries: [['event-type-form-mappings', eventTypeConfigId]]
    }
  );

  // Update mapping
  const updateMappingMutation = useSupabaseMutation(
    async ({ mappingId, updates }: { mappingId: string; updates: Partial<EventTypeFormMapping> }) => {
      const { data, error } = await supabase
        .from('event_type_form_mappings')
        .update(updates)
        .eq('id', mappingId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Form assignment updated!',
      invalidateQueries: [['event-type-form-mappings', eventTypeConfigId]]
    }
  );

  // Reorder mappings
  const reorderMappingsMutation = useSupabaseMutation(
    async (reorderedMappings: { id: string; sort_order: number }[]) => {
      const updates = reorderedMappings.map(({ id, sort_order }) => 
        supabase
          .from('event_type_form_mappings')
          .update({ sort_order })
          .eq('id', id)
      );
      
      await Promise.all(updates);
    },
    {
      successMessage: 'Form order updated!',
      invalidateQueries: [['event-type-form-mappings', eventTypeConfigId]]
    }
  );

  return {
    mappings,
    refetchMappings,
    addMapping: addMappingMutation.mutate,
    removeMapping: removeMappingMutation.mutate,
    updateMapping: updateMappingMutation.mutate,
    reorderMappings: reorderMappingsMutation.mutate,
    isLoading: addMappingMutation.isPending || removeMappingMutation.isPending || updateMappingMutation.isPending
  };
};

// Hook to get form mappings for event creation
export const useEventTypeFormMappingsForCreation = () => {
  const { currentTenant } = useAuth();

  const getFormMappingsForEventType = async (eventType: string) => {
    if (!currentTenant?.id || !eventType) return [];

    // First get the event type config ID
    const { data: eventTypeConfig } = await supabase
      .from('event_type_configs')
      .select('id')
      .eq('tenant_id', currentTenant.id)
      .eq('event_type', eventType)
      .eq('is_active', true)
      .maybeSingle();

    if (!eventTypeConfig) return [];

    // Get the form mappings for this event type with form template details
    const { data: mappings, error } = await supabase
      .from('event_type_form_mappings')
      .select('*')
      .eq('event_type_config_id', eventTypeConfig.id)
      .eq('tenant_id', currentTenant.id)
      .eq('auto_assign', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching form mappings for event creation:', error);
      return [];
    }

    if (!mappings || mappings.length === 0) return [];

    // Fetch form details
    const formIds = mappings.map(m => m.form_id);
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('id, name, description')
      .in('id', formIds)
      .eq('tenant_id', currentTenant.id);

    if (formsError) {
      console.error('Error fetching forms:', formsError);
      return mappings.map(mapping => ({ ...mapping, forms: null }));
    }

    // Combine the data
    return mappings.map(mapping => ({
      ...mapping,
      forms: forms?.find(f => f.id === mapping.form_id) || null
    }));

  };

  return { getFormMappingsForEventType };
};