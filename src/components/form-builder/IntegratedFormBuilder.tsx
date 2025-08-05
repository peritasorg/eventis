import React, { useState } from 'react';
import { ArrowLeft, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FieldEditor } from './FieldEditor';
import { UnifiedFormSection } from './UnifiedFormSection';

interface IntegratedFormBuilderProps {
  form: any;
  onBack: () => void;
}

export const IntegratedFormBuilder: React.FC<IntegratedFormBuilderProps> = ({ form, onBack }) => {
  const { currentTenant } = useAuth();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);

  // Fetch form sections and fields
  const { data: formData, refetch } = useSupabaseQuery(
    ['form-sections-fields', form.id],
    async () => {
      if (!form.id || !currentTenant?.id) return { sections: [], fields: [] };
      
      const { data: sections, error: sectionsError } = await supabase
        .from('form_sections')
        .select('*')
        .eq('form_page_id', form.id)
        .eq('tenant_id', currentTenant.id)
        .order('section_order');

      const { data: fields, error: fieldsError } = await supabase
        .from('form_field_instances')
        .select(`*, field_library (*)`)
        .eq('form_template_id', form.id)
        .eq('tenant_id', currentTenant.id)
        .order('field_order');

      if (sectionsError || fieldsError) {
        console.error('Error fetching form data:', sectionsError || fieldsError);
        return { sections: [], fields: [] };
      }
      
      return { 
        sections: sections || [], 
        fields: fields || [] 
      };
    }
  );

  const handleEditField = (field: any) => {
    setEditingField(field);
    setIsFieldEditorOpen(true);
  };

  const handleCloseFieldEditor = () => {
    setEditingField(null);
    setIsFieldEditorOpen(false);
    refetch();
  };

  const getFieldsForSection = (sectionId: string) => {
    return formData?.fields?.filter(field => field.form_section_id === sectionId) || [];
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 sm:p-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBack} size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Forms
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{form.name}</h1>
                <p className="text-muted-foreground text-sm">Form Builder</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isPreviewMode ? "default" : "outline"}
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                size="sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                {isPreviewMode ? "Edit Mode" : "Preview"}
              </Button>
              <Button
                onClick={() => setIsFieldEditorOpen(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {formData?.sections?.map((section) => (
            <UnifiedFormSection
              key={section.id}
              section={section}
              fields={getFieldsForSection(section.id)}
              mode="builder"
              onEditField={handleEditField}
            />
          ))}

          {(!formData?.sections || formData.sections.length === 0) && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No sections or fields yet</p>
                  <Button onClick={() => setIsFieldEditorOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Field
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <FieldEditor
        isOpen={isFieldEditorOpen}
        onClose={handleCloseFieldEditor}
        field={editingField}
        onSuccess={refetch}
        formId={form.id}
      />
    </div>
  );
};