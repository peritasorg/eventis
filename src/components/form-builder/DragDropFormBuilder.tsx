import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Edit3, Trash2, Eye, DollarSign, MessageSquare, Plus, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QuickFieldLibrary } from './QuickFieldLibrary';
import { FormSection } from './FormSection';

interface DragDropFormBuilderProps {
  form: any;
  onBack: () => void;
}

interface FieldLibraryItem {
  id: string;
  name: string;
  label: string;
  field_type: string;
  placeholder?: string;
  help_text?: string;
  affects_pricing: boolean;
  price_modifier?: number;
  auto_add_price_field: boolean;
  auto_add_notes_field: boolean;
}

interface FormFieldInstance {
  id: string;
  field_library_id: string;
  field_order: number;
  section_id?: string;
  label_override?: string;
  placeholder_override?: string;
  help_text_override?: string;
  required_override?: boolean;
  field_library: FieldLibraryItem;
}

interface FormSectionData {
  id: string;
  title: string;
  description?: string;
  collapsed?: boolean;
  order: number;
}

export const DragDropFormBuilder: React.FC<DragDropFormBuilderProps> = ({ form, onBack }) => {
  const { currentTenant } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [sections, setSections] = useState<FormSectionData[]>([
    { id: 'default', title: 'Form Fields', order: 0 }
  ]);

  const { data: formFields, refetch: refetchFields } = useSupabaseQuery(
    ['form-fields', form.id],
    async () => {
      if (!form.id || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .select(`*, field_library (*)`)
        .eq('form_template_id', form.id)
        .eq('tenant_id', currentTenant.id)
        .order('field_order');
      
      if (error) throw error;
      return (data || []) as FormFieldInstance[];
    }
  );

  const addFieldMutation = useSupabaseMutation(
    async ({ fieldLibraryId, sectionId }: { fieldLibraryId: string; sectionId?: string }) => {
      const maxOrder = Math.max(...(formFields?.map(f => f.field_order) || [0]), 0);
      
      const { error } = await supabase
        .from('form_field_instances')
        .insert([{
          form_template_id: form.id,
          field_library_id: fieldLibraryId,
          field_order: maxOrder + 1,
          form_section_id: sectionId === 'default' ? null : sectionId,
          tenant_id: currentTenant?.id
        }]);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field added!',
      onSuccess: refetchFields
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
      successMessage: 'Field removed!',
      onSuccess: refetchFields
    }
  );

  const updateFieldMutation = useSupabaseMutation(
    async ({ fieldId, updates }: { fieldId: string; updates: any }) => {
      const { error } = await supabase
        .from('form_field_instances')
        .update(updates)
        .eq('id', fieldId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field updated!',
      onSuccess: refetchFields
    }
  );

  const addSection = () => {
    const newSection: FormSectionData = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      order: sections.length
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (sectionId: string, updates: Partial<FormSectionData>) => {
    setSections(sections.map(section => 
      section.id === sectionId ? { ...section, ...updates } : section
    ));
  };

  const removeSection = (sectionId: string) => {
    if (sectionId === 'default') return; // Can't remove default section
    
    // Move fields from this section to default (null)
    const fieldsInSection = formFields?.filter(f => f.form_section_id === sectionId) || [];
    fieldsInSection.forEach(field => {
      updateFieldMutation.mutate({
        fieldId: field.id,
        updates: { form_section_id: null }
      });
    });
    
    setSections(sections.filter(section => section.id !== sectionId));
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !formFields) return;

    const { source, destination, type } = result;

    if (type === 'FIELD') {
      const sourceSection = source.droppableId.replace('section-', '');
      const destSection = destination.droppableId.replace('section-', '');
      
      // Get fields for the source section
      const sourceSectionFields = formFields.filter(f => (f.form_section_id || null) === (sourceSection === 'default' ? null : sourceSection));
      const [reorderedItem] = sourceSectionFields.splice(source.index, 1);
      
      // Update the field's section if it changed
      if (sourceSection !== destSection) {
        await supabase
          .from('form_field_instances')
          .update({ form_section_id: destSection })
          .eq('id', reorderedItem.id);
      }
      
      // Get destination section fields and insert
      const destSectionFields = formFields.filter(f => (f.form_section_id || null) === (destSection === 'default' ? null : destSection));
      if (sourceSection !== destSection) {
        destSectionFields.splice(destination.index, 0, reorderedItem);
      } else {
        destSectionFields.splice(destination.index, 0, reorderedItem);
      }
      
      // Update field orders for destination section
      const updates = destSectionFields.map((item: FormFieldInstance, index: number) => ({
        id: item.id,
        field_order: index + 1
      }));

      for (const update of updates) {
        await supabase
          .from('form_field_instances')
          .update({ field_order: update.field_order })
          .eq('id', update.id);
      }

      refetchFields();
    }
  };

  const renderFieldPreview = (fieldInstance: FormFieldInstance) => {
    const field = fieldInstance.field_library;
    if (!field) return null;

    const label = fieldInstance.label_override || field.label;
    const placeholder = fieldInstance.placeholder_override || field.placeholder;
    const helpText = fieldInstance.help_text_override || field.help_text;

    return (
      <div className="space-y-3">
        {/* Main field */}
        <div className="space-y-2">
          {field.field_type === 'checkbox' ? (
            <div className="flex items-center space-x-2">
              <Switch disabled />
              <Label>{label}</Label>
            </div>
          ) : field.field_type === 'textarea' ? (
            <>
              <Label>{label}</Label>
              <Textarea 
                placeholder={placeholder}
                disabled
                rows={3}
              />
            </>
          ) : field.field_type === 'number' ? (
            <>
              <Label>{label}</Label>
              <Input type="number" placeholder={placeholder} disabled />
            </>
          ) : (
            <>
              <Label>{label}</Label>
              <Input placeholder={placeholder} disabled />
            </>
          )}
          {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
        </div>

        {/* Price and Notes fields for checkbox/toggle fields */}
        {field.field_type === 'checkbox' && (
          <div className="grid grid-cols-2 gap-3 ml-6 p-3 bg-gray-50 rounded">
            <div>
              <Label className="flex items-center gap-1 text-xs">
                <DollarSign className="h-3 w-3" />
                Price (£)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder={field.price_modifier?.toString() || "0.00"}
                disabled
                className="h-8"
              />
            </div>
            
            <div>
              <Label className="flex items-center gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                Notes
              </Label>
              <Textarea
                placeholder="Additional notes..."
                disabled
                rows={1}
                className="text-xs"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const getFieldsForSection = (sectionId: string) => {
    return formFields?.filter(field => (field.form_section_id || null) === (sectionId === 'default' ? null : sectionId)) || [];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.name}</h1>
              <p className="text-gray-600">{form.description || 'Build your form by adding fields'}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={previewMode} 
                  onCheckedChange={setPreviewMode}
                  id="preview-mode"
                />
                <Label htmlFor="preview-mode" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </Label>
              </div>
              <Button variant="outline" onClick={onBack}>
                ← Back to Forms
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Field Library Sidebar - Fixed height and scrolling */}
          <div className="col-span-3">
            <Card className="sticky top-6" style={{ height: 'calc(100vh - 8rem)' }}>
              <CardContent className="p-0 h-full">
                <QuickFieldLibrary 
                  onAddField={(fieldLibraryId: string) => 
                    addFieldMutation.mutate({ fieldLibraryId, sectionId: null })
                  } 
                />
              </CardContent>
            </Card>
          </div>

          {/* Form Builder Canvas */}
          <div className="col-span-9">
            <Card>
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Form Canvas</h3>
                  {!previewMode && (
                    <Button
                      onClick={addSection}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <FolderPlus className="h-4 w-4" />
                      Add Section
                    </Button>
                  )}
                </div>
              </div>
              <CardContent className="p-6">
                {!formFields || formFields.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-center">
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                        <Eye className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Start Building Your Form</h4>
                        <p className="text-gray-500">Add fields from the library to start building your form</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="space-y-6">
                      {sections.map((section) => (
                        <FormSection
                          key={section.id}
                          section={section}
                          fields={getFieldsForSection(section.id)}
                          editingField={editingField}
                          previewMode={previewMode}
                          onEditField={setEditingField}
                          onRemoveField={removeFieldMutation.mutate}
                          onUpdateField={(fieldId, updates) => updateFieldMutation.mutate({ fieldId, updates })}
                          onUpdateSection={updateSection}
                          onRemoveSection={removeSection}
                          renderFieldPreview={renderFieldPreview}
                          sectionIndex={0}
                        />
                      ))}
                    </div>
                  </DragDropContext>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
