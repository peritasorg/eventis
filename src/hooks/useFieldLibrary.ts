import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DropdownOption {
  label: string;
  value: string;
  price?: number;
}

export interface FieldLibraryItem {
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
  pricing_behavior: string;
  unit_price?: number;
  affects_pricing: boolean;
  has_quantity: boolean;
  dropdown_options?: DropdownOption[];
  has_notes: boolean;
  appears_on_quote: boolean;
  appears_on_invoice: boolean;
  sort_order: number;
  active: boolean;
  field_config?: any;
  created_at: string;
  updated_at: string;
}

export const useFieldLibrary = () => {
  const { currentTenant } = useAuth();
  
  const { data: fieldLibraryItems, ...rest } = useSupabaseQuery(
    ['field-library'],
    async () => {
      const { data, error } = await supabase
        .from('field_library')
        .select('*')
        .eq('active', true)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('label', { ascending: true });
      
      if (error) {
        console.error('Field library error:', error);
        return [];
      }
      
      // Parse dropdown_options JSON
      const parsedData = (data || []).map(item => ({
        ...item,
        dropdown_options: item.dropdown_options ? 
          (typeof item.dropdown_options === 'string' ? 
            JSON.parse(item.dropdown_options) : 
            item.dropdown_options) : 
          []
      }));
      
      return parsedData;
    }
  );

  const createFieldMutation = useSupabaseMutation(
    async (fieldData: Omit<FieldLibraryItem, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('field_library')
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
      invalidateQueries: [['field-library']]
    }
  );

  const updateFieldMutation = useSupabaseMutation(
    async ({ id, ...updates }: Partial<FieldLibraryItem> & { id: string }) => {
      const updateData = {
        ...updates,
        dropdown_options: updates.dropdown_options ? JSON.stringify(updates.dropdown_options) : null
      };
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
    if (!fieldLibraryItems || !Array.isArray(fieldLibraryItems)) return {};
    
    return fieldLibraryItems.reduce((acc: Record<string, FieldLibraryItem[]>, field: FieldLibraryItem) => {
      const category = field.category || 'general';
      
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(field);
      return acc;
    }, {});
  };

  return {
    fieldLibraryItems: fieldLibraryItems || [],
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