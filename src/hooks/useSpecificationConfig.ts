import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SpecificationConfig {
  id: string;
  tenant_id: string;
  form_id: string;
  selected_fields: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useSpecificationConfig = () => {
  const { currentTenant } = useAuth();

  const { data: config, isLoading, ...rest } = useSupabaseQuery(
    ['specification-config', currentTenant],
    async () => {
      if (!currentTenant) return null;
      
      const { data, error } = await supabase
        .from('specification_template_configs')
        .select('*')
        .eq('tenant_id', currentTenant)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    }
  );

  const saveConfigMutation = useSupabaseMutation(
    async ({ formId, selectedFields }: { formId: string; selectedFields: string[] }) => {
      if (!currentTenant) throw new Error('No tenant');

      // Check if config exists
      const { data: existing } = await supabase
        .from('specification_template_configs')
        .select('id')
        .eq('tenant_id', currentTenant)
        .eq('is_active', true)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('specification_template_configs')
          .update({
            form_id: formId,
            selected_fields: selectedFields,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('specification_template_configs')
          .insert({
            tenant_id: currentTenant,
            form_id: formId,
            selected_fields: selectedFields
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    {
      successMessage: 'Specification configuration saved',
      invalidateQueries: [['specification-config']]
    }
  );

  return {
    config,
    isLoading,
    saveConfig: saveConfigMutation.mutate,
    isSaving: saveConfigMutation.isPending,
    ...rest
  };
};