import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FormField {
  id: string;
  tenant_id: string;
  name: string;
  field_type: 'text' | 'price_fixed' | 'price_per_person' | 'counter';
  has_notes: boolean;
  has_pricing: boolean;
  pricing_type: 'fixed' | 'per_person' | null;
  default_price_gbp: number | null;
  placeholder_text: string | null;
  help_text: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useFormFields = () => {
  const { data: formFields, ...rest } = useSupabaseQuery(
    ['form-fields'],
    async () => {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('is_active', true)
        .order('field_type', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Form fields error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const createFieldMutation = useSupabaseMutation(
    async (fieldData: Omit<FormField, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('form_fields')
        .insert([fieldData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast.success('Field created successfully');
      },
      invalidateQueries: [['form-fields']]
    }
  );

  const updateFieldMutation = useSupabaseMutation(
    async ({ id, ...updates }: Partial<FormField> & { id: string }) => {
      const { data, error } = await supabase
        .from('form_fields')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast.success('Field updated successfully');
      },
      invalidateQueries: [['form-fields']]
    }
  );

  const deleteFieldMutation = useSupabaseMutation(
    async (id: string) => {
      const { error } = await supabase
        .from('form_fields')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Field deleted successfully');
      },
      invalidateQueries: [['form-fields']]
    }
  );

  const getFieldsByCategory = () => {
    if (!formFields || !Array.isArray(formFields)) return {};
    
    return formFields.reduce((acc: Record<string, FormField[]>, field: FormField) => {
      const category = field.field_type === 'text' ? 'Text Fields' :
                     field.field_type === 'counter' ? 'Counter Fields' : 'Pricing Fields';
      
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(field);
      return acc;
    }, {});
  };

  return {
    formFields: formFields || [],
    fieldsByCategory: getFieldsByCategory(),
    createField: createFieldMutation.mutate,
    updateField: updateFieldMutation.mutate,
    deleteField: deleteFieldMutation.mutate,
    isCreating: createFieldMutation.isPending,
    isUpdating: updateFieldMutation.isPending,
    isDeleting: deleteFieldMutation.isPending,
    ...rest
  };
};