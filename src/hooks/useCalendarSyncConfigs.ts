import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

interface CalendarSyncConfig {
  id: string;
  tenant_id: string;
  event_type_config_id: string;
  form_id: string;
  selected_fields: string[];
  show_pricing_fields_only: boolean;
  field_display_format: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EventTypeConfig {
  id: string;
  event_type: string;
  display_name: string;
}

interface FormTemplate {
  id: string;
  name: string;
}

export const useCalendarSyncConfigs = () => {
  const { currentTenant } = useAuth();

  const { data: configs, isLoading, ...rest } = useSupabaseQuery(
    ['calendar-sync-configs', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('calendar_sync_configs')
        .select(`
          *,
          event_type_configs!inner(id, event_type, display_name),
          forms!inner(id, name)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    }
  );

  const { data: eventTypes } = useSupabaseQuery(
    ['event-type-configs', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_type_configs')
        .select('id, event_type, display_name')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    }
  );

  const { data: forms } = useSupabaseQuery(
    ['forms', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('forms')
        .select('id, name')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    }
  );

  const saveConfigMutation = useSupabaseMutation(
    async ({ 
      eventTypeConfigId, 
      formId, 
      selectedFields, 
      showPricingFieldsOnly 
    }: { 
      eventTypeConfigId: string; 
      formId: string; 
      selectedFields: string[]; 
      showPricingFieldsOnly: boolean; 
    }) => {
      if (!currentTenant?.id) throw new Error('No tenant');

      // First delete existing config for this event type and form
      await supabase
        .from('calendar_sync_configs')
        .delete()
        .eq('tenant_id', currentTenant.id)
        .eq('event_type_config_id', eventTypeConfigId)
        .eq('form_id', formId);

      // Then insert new config
      const { data, error } = await supabase
        .from('calendar_sync_configs')
        .insert({
          tenant_id: currentTenant.id,
          event_type_config_id: eventTypeConfigId,
          form_id: formId,
          selected_fields: selectedFields,
          show_pricing_fields_only: showPricingFieldsOnly,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Calendar sync configuration saved',
      invalidateQueries: [['calendar-sync-configs', currentTenant?.id]]
    }
  );

  const deleteConfigMutation = useSupabaseMutation(
    async (configId: string) => {
      const { error } = await supabase
        .from('calendar_sync_configs')
        .update({ is_active: false })
        .eq('id', configId);

      if (error) throw error;
    },
    {
      successMessage: 'Configuration deleted',
      invalidateQueries: [['calendar-sync-configs', currentTenant?.id]]
    }
  );

  const getConfigForEventType = useCallback((eventTypeConfigId: string, formId: string): CalendarSyncConfig | undefined => {
    return configs?.find(config => 
      config.event_type_config_id === eventTypeConfigId && 
      config.form_id === formId &&
      config.is_active
    );
  }, [configs]);

  return {
    configs,
    eventTypes,
    forms,
    isLoading,
    saveConfig: saveConfigMutation.mutate,
    deleteConfig: deleteConfigMutation.mutate,
    isSaving: saveConfigMutation.isPending,
    getConfigForEventType,
    ...rest
  };
};