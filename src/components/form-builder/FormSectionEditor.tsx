
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FormSectionEditorProps {
  sectionId: string;
  formId: string;
  fieldLibrary: any[];
}

export const FormSectionEditor: React.FC<FormSectionEditorProps> = ({
  sectionId,
  formId,
  fieldLibrary
}) => {
  const { currentTenant } = useAuth();

  const { data: section } = useSupabaseQuery(
    ['form-section', sectionId],
    async () => {
      if (!sectionId || !currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('form_sections')
        .select('*')
        .eq('id', sectionId)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error) {
        console.error('Section error:', error);
        return null;
      }
      
      return data;
    }
  );

  const { data: sectionFields } = useSupabaseQuery(
    ['section-fields', sectionId],
    async () => {
      if (!sectionId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .select(`
          *,
          field_library (*)
        `)
        .eq('form_section_id', sectionId)
        .eq('tenant_id', currentTenant.id)
        .order('field_order');
      
      if (error) {
        console.error('Section fields error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const addFieldMutation = useSupabaseMutation(
    async (fieldData: any) => {
      const maxOrder = Math.max(...(sectionFields?.map(f => f.field_order) || [0]), 0);
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .insert([{
          ...fieldData,
          form_section_id: sectionId,
          tenant_id: currentTenant?.id,
          field_order: maxOrder + 1
        }])
        .select(`
          *,
          field_library (*)
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Field added to section!',
      invalidateQueries: [['section-fields', sectionId]]
    }
  );

  const removeFieldMutation = useSupabaseMutation(
    async (fieldInstanceId: string) => {
      const { error } = await supabase
        .from('form_field_instances')
        .delete()
        .eq('id', fieldInstanceId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field removed from section!',
      invalidateQueries: [['section-fields', sectionId]]
    }
  );

  const handleAddField = (fieldLibraryId: string) => {
    addFieldMutation.mutate({
      field_library_id: fieldLibraryId
    });
  };

  if (!section) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <p>Loading section...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{section.section_title}</CardTitle>
          {section.section_description && (
            <p className="text-sm text-gray-600">{section.section_description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Add Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Fields
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fieldLibrary?.map((field) => (
              <div key={field.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex-1">
                  <div className="font-medium text-sm">{field.label}</div>
                  <div className="text-xs text-gray-600">{field.field_type}</div>
                  {field.affects_pricing && (
                    <div className="text-xs text-green-600">£{field.price_modifier}</div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddField(field.id)}
                  disabled={sectionFields?.some(f => f.field_library_id === field.id)}
                  className="h-7"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Section Fields ({sectionFields?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!sectionFields || sectionFields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No fields in this section yet. Add fields from the library above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sectionFields.map((fieldInstance) => {
                const field = fieldInstance.field_library;
                return (
                  <div key={fieldInstance.id} className="flex items-center gap-3 p-3 border rounded">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-sm">{field.label}</div>
                          <div className="text-xs text-gray-600">{field.field_type}</div>
                        </div>
                        {field.affects_pricing && (
                          <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            £{field.price_modifier}
                          </div>
                        )}
                      </div>
                      
                      {field.help_text && (
                        <div className="text-xs text-gray-500 mb-2">{field.help_text}</div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Custom Label (optional)</Label>
                          <Input
                            value={fieldInstance.label_override || ''}
                            placeholder={field.label}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Width</Label>
                          <Select value={fieldInstance.field_width || 'full'}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">Full</SelectItem>
                              <SelectItem value="half">Half</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFieldMutation.mutate(fieldInstance.id)}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
