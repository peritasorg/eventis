import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FormSection {
  id: string;
  title: string;
  order: number;
  field_ids: string[];
}

export interface Form {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  sections: FormSection[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useForms = () => {
  const { currentTenant } = useAuth();
  const { data: forms, ...rest } = useSupabaseQuery(
    ['forms'],
    async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Forms error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const createFormMutation = useSupabaseMutation(
    async (formData: { name: string; description?: string; sections?: FormSection[] }) => {
      const { data, error } = await supabase
        .from('forms')
        .insert({
          name: formData.name,
          description: formData.description,
          sections: JSON.stringify(formData.sections || []),
          tenant_id: currentTenant?.id!,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast.success('Form created successfully');
      },
      invalidateQueries: [['forms']]
    }
  );

  const updateFormMutation = useSupabaseMutation(
    async ({ id, ...updates }: Partial<Form> & { id: string }) => {
      const { data, error } = await supabase
        .from('forms')
        .update({
          ...updates,
          sections: updates.sections ? JSON.stringify(updates.sections) : undefined
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast.success('Form updated successfully');
      },
      invalidateQueries: [['forms']]
    }
  );

  const deleteFormMutation = useSupabaseMutation(
    async (id: string) => {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Form deleted successfully');
      },
      invalidateQueries: [['forms']]
    }
  );

  const duplicateFormMutation = useSupabaseMutation(
    async (formId: string) => {
      // Get the original form
      const { data: originalForm, error: fetchError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create duplicate
      const { data, error } = await supabase
        .from('forms')
        .insert({
          name: `${originalForm.name} (Copy)`,
          description: originalForm.description,
          sections: originalForm.sections,
          tenant_id: currentTenant?.id!,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast.success('Form duplicated successfully');
      },
      invalidateQueries: [['forms']]
    }
  );

  return {
    forms: forms || [],
    createForm: createFormMutation.mutate,
    updateForm: updateFormMutation.mutate,
    deleteForm: deleteFormMutation.mutate,
    duplicateForm: duplicateFormMutation.mutate,
    isCreating: createFormMutation.isPending,
    isUpdating: updateFormMutation.isPending,
    isDeleting: deleteFormMutation.isPending,
    isDuplicating: duplicateFormMutation.isPending,
    ...rest
  };
};