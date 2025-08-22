import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DropdownOption {
  label: string;
  value: string;
  price?: number;
}

export interface FormField {
  id: string;
  tenant_id: string;
  name: string;
  field_type: 'text_notes_only' | 'fixed_price_notes' | 'fixed_price_notes_toggle' | 'fixed_price_quantity_notes' | 'per_person_price_notes' | 'counter_notes' | 'dropdown_options' | 'dropdown_options_price_notes';
  has_notes: boolean;
  has_pricing: boolean;
  pricing_type: 'fixed' | 'per_person' | null;
  default_price_gbp: number | null;
  placeholder_text: string | null;
  help_text: string | null;
  dropdown_options?: DropdownOption[];
  appears_on_quote?: boolean;
  appears_on_invoice?: boolean;
  is_toggleable?: boolean;
  toggle_label?: string;
  default_enabled?: boolean;
  is_multiselect?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useFormFields = () => {
  const { currentTenant } = useAuth();
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
      
      // Parse dropdown_options JSON
      const parsedData = (data || []).map(field => ({
        ...field,
        dropdown_options: field.dropdown_options ? 
          (typeof field.dropdown_options === 'string' ? 
            JSON.parse(field.dropdown_options) : 
            field.dropdown_options) : 
          []
      }));
      
      return parsedData;
    }
  );

  const createFieldMutation = useSupabaseMutation(
    async (fieldData: Omit<FormField, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('form_fields')
        .insert([{
          ...fieldData,
          tenant_id: currentTenant?.id!,
          dropdown_options: fieldData.dropdown_options ? JSON.stringify(fieldData.dropdown_options) : null
        }])
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
      const updateData = {
        ...updates,
        dropdown_options: updates.dropdown_options ? JSON.stringify(updates.dropdown_options) : null
      };
      const { data, error } = await supabase
        .from('form_fields')
        .update(updateData)
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
      const category = field.field_type === 'text_notes_only' ? 'Text Fields' :
                     field.field_type === 'counter_notes' ? 'Counter Fields' :
                     field.field_type === 'dropdown_options' || field.field_type === 'dropdown_options_price_notes' ? 'Dropdown Fields' :
                     'Pricing Fields';
      
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