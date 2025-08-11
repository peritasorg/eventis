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
  label: string;
  field_type: string;
  category: string;
  description?: string;
  help_text?: string;
  placeholder_text?: string;
  required: boolean;
  has_pricing: boolean;
  pricing_behavior: 'none' | 'fixed' | 'per_person' | 'quantity_based';
  unit_price?: number;
  affects_pricing: boolean;
  has_quantity: boolean;
  min_quantity?: number;
  max_quantity?: number;
  default_quantity?: number;
  dropdown_options: DropdownOption[];
  has_notes: boolean;
  field_config: Record<string, any>;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  field_type_info?: {
    display_name: string;
    description?: string;
    icon?: string;
    type_category: string;
    supports_pricing: boolean;
    supports_quantity: boolean;
    supports_notes: boolean;
    default_config: Record<string, any>;
  };
}

export const useFormFields = () => {
  const { currentTenant } = useAuth();
  const { data: formFields, ...rest } = useSupabaseQuery(
    ['field-library'],
    async () => {
      const { data, error } = await supabase
        .from('field_library')
        .select('*')
        .eq('active', true)
        .order('category')
        .order('sort_order')
        .order('label');
      
      if (error) {
        console.error('Field library error:', error);
        return [];
      }
      
      // Parse dropdown_options JSON
      return (data || []).map(field => ({
        ...field,
        dropdown_options: field.dropdown_options || []
      }));
    }
  );

  const createFieldMutation = useSupabaseMutation(
    async (fieldData: Omit<FormField, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'field_type_info'>) => {
      const { data, error } = await supabase
        .from('field_library')
        .insert({
          ...fieldData,
          tenant_id: currentTenant?.id!,
          // Convert dropdown_options to JSON for database
          dropdown_options: JSON.stringify(fieldData.dropdown_options || []),
          // Set pricing behavior based on field type
          pricing_behavior: fieldData.has_pricing ? (fieldData.pricing_behavior || 'fixed') : 'none',
          affects_pricing: fieldData.has_pricing || false
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast.success('Field created successfully');
      },
      invalidateQueries: [['field-library']]
    }
  );

  const updateFieldMutation = useSupabaseMutation(
    async ({ id, field_type_info, ...updates }: Partial<FormField> & { id: string }) => {
      const updateData = {
        ...updates,
        // Convert dropdown_options to JSON for database
        dropdown_options: JSON.stringify(updates.dropdown_options || []),
        // Update pricing behavior based on has_pricing
        pricing_behavior: updates.has_pricing ? (updates.pricing_behavior || 'fixed') : 'none',
        affects_pricing: updates.has_pricing || false
      };
      // Remove field_type_info from updates if it exists
      if ('field_type_info' in updateData) {
        delete (updateData as any).field_type_info;
      }
      
      const { data, error } = await supabase
        .from('field_library')
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
      invalidateQueries: [['field-library']]
    }
  );

  const deleteFieldMutation = useSupabaseMutation(
    async (id: string) => {
      // Soft delete by setting active to false
      const { error } = await supabase
        .from('field_library')
        .update({ active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Field deleted successfully');
      },
      invalidateQueries: [['field-library']]
    }
  );

  const getFieldsByCategory = () => {
    if (!formFields || !Array.isArray(formFields)) return {};
    
    return formFields.reduce((acc: Record<string, FormField[]>, field: FormField) => {
      const category = field.category || 'general';
      
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(field);
      return acc;
    }, {});
  };

  // Legacy mapping for backward compatibility
  const mapToLegacyFieldType = (field: FormField): string => {
    if (field.field_type === 'text' && field.has_notes && !field.has_pricing) return 'text_notes_only';
    if (field.field_type === 'text' && field.has_notes && field.has_pricing && field.pricing_behavior === 'fixed') return 'fixed_price_notes';
    if (field.field_type === 'text' && field.has_notes && field.has_pricing && field.pricing_behavior === 'per_person') return 'per_person_price_notes';
    if (field.field_type === 'number' && field.has_notes) return 'counter_notes';
    if (field.field_type === 'select' && !field.has_pricing) return 'dropdown_options';
    if (field.field_type === 'select' && field.has_pricing) return 'dropdown_options_price_notes';
    return field.field_type;
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
    mapToLegacyFieldType,
    ...rest
  };
};