import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

export interface FieldType {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  default_config: Record<string, any>;
  icon: string;
  category: string;
  supports_pricing: boolean;
  supports_quantity: boolean;
  supports_notes: boolean;
  active: boolean;
}

export const useFieldTypes = () => {
  const { data: fieldTypes, ...rest } = useSupabaseQuery(
    ['field-types'],
    async () => {
      const { data, error } = await supabase
        .from('field_types')
        .select('*')
        .eq('active', true)
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });
      
      if (error) {
        console.error('Field types error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const getFieldTypesByCategory = () => {
    if (!fieldTypes) return {};
    
    return fieldTypes.reduce((acc: Record<string, FieldType[]>, fieldType: FieldType) => {
      if (!acc[fieldType.category]) {
        acc[fieldType.category] = [];
      }
      acc[fieldType.category].push(fieldType);
      return acc;
    }, {});
  };

  return {
    fieldTypes: fieldTypes || [],
    fieldTypesByCategory: getFieldTypesByCategory(),
    ...rest
  };
};