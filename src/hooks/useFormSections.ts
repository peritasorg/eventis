import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FormSection {
  id: string;
  tenant_id: string;
  form_id: string;
  section_title: string;
  section_description?: string;
  section_order: number;
  created_at: string;
  updated_at: string;
}

export interface FormFieldInstance {
  id: string;
  tenant_id: string;
  form_id: string;
  section_id: string;
  field_library_id: string;
  field_order: number;
  override_label?: string;
  override_required?: boolean;
  override_help_text?: string;
  override_placeholder?: string;
  override_config: Record<string, any>;
  created_at: string;
  updated_at: string;
  field_library?: any; // Will be populated with field data
}

export const useFormSections = (formId?: string) => {
  const { currentTenant } = useAuth();
  
  const { data: sections, ...sectionsRest } = useSupabaseQuery(
    ['form-sections', formId],
    async () => {
      if (!formId) return [];
      
      const { data, error } = await supabase
        .from('form_sections')
        .select('*')
        .eq('form_id', formId)
        .order('section_order');
      
      if (error) {
        console.error('Form sections error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const { data: fieldInstances, ...instancesRest } = useSupabaseQuery(
    ['form-field-instances', formId],
    async () => {
      if (!formId) return [];
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .select(`
          *,
          field_library!inner(
            *,
            field_types!inner(
              display_name,
              description,
              icon,
              category,
              supports_pricing,
              supports_quantity,
              supports_notes,
              default_config
            )
          )
        `)
        .eq('form_id', formId)
        .order('field_order');
      
      if (error) {
        console.error('Form field instances error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const createSectionMutation = useSupabaseMutation(
    async (sectionData: Omit<FormSection, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('form_sections')
        .insert([{
          ...sectionData,
          tenant_id: currentTenant?.id!
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast.success('Section created successfully');
      },
      invalidateQueries: [['form-sections', formId]]
    }
  );

  const updateSectionMutation = useSupabaseMutation(
    async ({ id, ...updates }: Partial<FormSection> & { id: string }) => {
      const { data, error } = await supabase
        .from('form_sections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast.success('Section updated successfully');
      },
      invalidateQueries: [['form-sections', formId]]
    }
  );

  const deleteSectionMutation = useSupabaseMutation(
    async (id: string) => {
      const { error } = await supabase
        .from('form_sections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Section deleted successfully');
      },
      invalidateQueries: [['form-sections', formId], ['form-field-instances', formId]]
    }
  );

  const addFieldToSectionMutation = useSupabaseMutation(
    async (instanceData: Omit<FormFieldInstance, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'field_library'>) => {
      const { data, error } = await supabase
        .from('form_field_instances')
        .insert([{
          ...instanceData,
          tenant_id: currentTenant?.id!
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast.success('Field added to section successfully');
      },
      invalidateQueries: [['form-field-instances', formId]]
    }
  );

  const updateFieldInstanceMutation = useSupabaseMutation(
    async ({ id, field_library, ...updates }: Partial<FormFieldInstance> & { id: string }) => {
      const updateData = { ...updates };
      // Remove field_library from updates if it exists
      if ('field_library' in updateData) {
        delete (updateData as any).field_library;
      }
      
      const { data, error } = await supabase
        .from('form_field_instances')
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
      invalidateQueries: [['form-field-instances', formId]]
    }
  );

  const removeFieldFromSectionMutation = useSupabaseMutation(
    async (instanceId: string) => {
      const { error } = await supabase
        .from('form_field_instances')
        .delete()
        .eq('id', instanceId);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Field removed from section successfully');
      },
      invalidateQueries: [['form-field-instances', formId]]
    }
  );

  // Helper function to get sections with their fields
  const getSectionsWithFields = () => {
    if (!sections || !fieldInstances) return [];
    
    return sections.map(section => ({
      ...section,
      fields: fieldInstances.filter(instance => instance.section_id === section.id)
    }));
  };

  return {
    sections: sections || [],
    fieldInstances: fieldInstances || [],
    sectionsWithFields: getSectionsWithFields(),
    createSection: createSectionMutation.mutate,
    updateSection: updateSectionMutation.mutate,
    deleteSection: deleteSectionMutation.mutate,
    addFieldToSection: addFieldToSectionMutation.mutate,
    updateFieldInstance: updateFieldInstanceMutation.mutate,
    removeFieldFromSection: removeFieldFromSectionMutation.mutate,
    isCreatingSection: createSectionMutation.isPending,
    isUpdatingSection: updateSectionMutation.isPending,
    isDeletingSection: deleteSectionMutation.isPending,
    isAddingField: addFieldToSectionMutation.isPending,
    isUpdatingField: updateFieldInstanceMutation.isPending,
    isRemovingField: removeFieldFromSectionMutation.isPending,
    ...sectionsRest,
    ...instancesRest
  };
};