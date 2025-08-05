import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Edit3, Trash2, Eye, Plus, FolderPlus, Check, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EnhancedDragDropFormBuilderProps {
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
  pricing_type?: string;
  auto_add_price_field: boolean;
  auto_add_notes_field: boolean;
}

interface FormFieldInstance {
  id: string;
  field_library_id: string;
  field_order: number;
  form_section_id?: string;
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
  order: number;
  collapsed?: boolean;
}

export const EnhancedDragDropFormBuilder: React.FC<EnhancedDragDropFormBuilderProps> = ({ form, onBack }) => {
  const { currentTenant } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [sections, setSections] = useState<FormSectionData[]>([
    { id: 'default', title: 'Form Fields', order: 0 }
  ]);

  // Fetch field library
  const { data: fieldLibrary } = useSupabaseQuery(
    ['field-library'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('label');
      
      if (error) throw error;
      return data || [];
    }
  );

  // Fetch form fields
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

  // Get fields already in form for filtering library
  const fieldsInForm = formFields?.map(f => f.field_library_id) || [];
  const availableLibraryFields = fieldLibrary?.filter(field => !fieldsInForm.includes(field.id)) || [];

  // Add field to form mutation
  const addFieldMutation = useSupabaseMutation(
    async ({ fieldLibraryId, sectionId, order }: { fieldLibraryId: string; sectionId?: string; order?: number }) => {
      const maxOrder = order ?? (Math.max(...(formFields?.map(f => f.field_order) || [0]), 0) + 1);
      
      const { error } = await supabase
        .from('form_field_instances')
        .insert([{
          form_template_id: form.id,
          field_library_id: fieldLibraryId,
          field_order: maxOrder,
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

  // Remove field mutation
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

  // Update field mutation
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
    if (sectionId === 'default') return;
    
    // Move fields from this section to default
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
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'LIBRARY_FIELD') {
      // Dragging from library to form section
      const fieldLibraryId = result.draggableId;
      const targetSectionId = destination.droppableId.replace('section-', '');
      
      addFieldMutation.mutate({
        fieldLibraryId,
        sectionId: targetSectionId,
        order: destination.index + 1
      });
    } else if (type === 'FORM_FIELD') {
      // Reordering fields within or between sections
      if (!formFields) return;

      const sourceSection = source.droppableId.replace('section-', '');
      const destSection = destination.droppableId.replace('section-', '');
      
      const sourceSectionFields = getFieldsForSection(sourceSection);
      const draggedField = sourceSectionFields[source.index] as FormFieldInstance;
      
      if (!draggedField) return;

      // Update section if changed
      if (sourceSection !== destSection) {
        await supabase
          .from('form_field_instances')
          .update({ 
            form_section_id: destSection === 'default' ? null : destSection 
          })
          .eq('id', draggedField.id);
      }

      // Reorder fields in destination section
      const destSectionFields = getFieldsForSection(destSection);
      
      // Remove from source and insert at destination
      if (sourceSection === destSection) {
        const reorderedFields: FormFieldInstance[] = Array.from(destSectionFields);
        const [removed] = reorderedFields.splice(source.index, 1);
        if (removed) {
          reorderedFields.splice(destination.index, 0, removed);
        }
        
        // Update field orders
        for (let i = 0; i < reorderedFields.length; i++) {
          await supabase
            .from('form_field_instances')
            .update({ field_order: i + 1 })
            .eq('id', reorderedFields[i].id);
        }
      } else {
        // Moving between sections - insert at destination index
        const newOrder = destination.index + 1;
        await supabase
          .from('form_field_instances')
          .update({ field_order: newOrder })
          .eq('id', draggedField.id);
        
        // Reorder other fields in destination section
        const otherFields = destSectionFields.filter(f => f.id !== draggedField.id);
        for (let i = 0; i < otherFields.length; i++) {
          const adjustedOrder = i >= destination.index ? i + 2 : i + 1;
          await supabase
            .from('form_field_instances')
            .update({ field_order: adjustedOrder })
            .eq('id', otherFields[i].id);
        }
      }

      refetchFields();
    }
  };

  const getFieldsForSection = (sectionId: string) => {
    if (!formFields) return [];
    return formFields
      .filter(field => (field.form_section_id || 'default') === sectionId)
      .sort((a, b) => a.field_order - b.field_order);
  };

  const renderFieldPreview = (fieldInstance: FormFieldInstance) => {
    const field = fieldInstance.field_library;
    if (!field) return null;

    const label = fieldInstance.label_override || field.label;
    const placeholder = fieldInstance.placeholder_override || field.placeholder;
    const helpText = fieldInstance.help_text_override || field.help_text;

    switch (field.field_type) {
      case 'text':
        return (
          <div>
            <Label className="text-sm font-medium">{label}</Label>
            {helpText && <p className="text-xs text-muted-foreground mb-2">{helpText}</p>}
            <Input placeholder={placeholder || `Enter ${label.toLowerCase()}`} disabled />
          </div>
        );
      case 'textarea':
        return (
          <div>
            <Label className="text-sm font-medium">{label}</Label>
            {helpText && <p className="text-xs text-muted-foreground mb-2">{helpText}</p>}
            <Textarea placeholder={placeholder || `Enter ${label.toLowerCase()}`} rows={3} disabled />
          </div>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox disabled />
            <div>
              <Label className="text-sm font-medium">{label}</Label>
              {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
            </div>
          </div>
        );
      case 'select':
        return (
          <div>
            <Label className="text-sm font-medium">{label}</Label>
            {helpText && <p className="text-xs text-muted-foreground mb-2">{helpText}</p>}
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
            </Select>
          </div>
        );
      default:
        return (
          <div>
            <Label className="text-sm font-medium">{label}</Label>
            {helpText && <p className="text-xs text-muted-foreground mb-2">{helpText}</p>}
            <Input placeholder={placeholder || "Enter value"} disabled />
          </div>
        );
    }
  };

  const renderEditDialog = () => {
    if (!editingField) return null;
    
    const fieldInstance = formFields?.find(f => f.id === editingField);
    if (!fieldInstance) return null;

    return (
      <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input
                value={fieldInstance.label_override || fieldInstance.field_library.label}
                onChange={(e) => updateFieldMutation.mutate({
                  fieldId: fieldInstance.id,
                  updates: { label_override: e.target.value }
                })}
                placeholder="Field label"
              />
            </div>
            <div>
              <Label>Placeholder</Label>
              <Input
                value={fieldInstance.placeholder_override || fieldInstance.field_library.placeholder || ''}
                onChange={(e) => updateFieldMutation.mutate({
                  fieldId: fieldInstance.id,
                  updates: { placeholder_override: e.target.value }
                })}
                placeholder="Placeholder text"
              />
            </div>
            <div>
              <Label>Help Text</Label>
              <Textarea
                value={fieldInstance.help_text_override || fieldInstance.field_library.help_text || ''}
                onChange={(e) => updateFieldMutation.mutate({
                  fieldId: fieldInstance.id,
                  updates: { help_text_override: e.target.value }
                })}
                placeholder="Help text"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingField(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Field Library */}
      <div className="w-80 border-r bg-white dark:bg-gray-800 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Field Library</h3>
          <p className="text-sm text-muted-foreground">Drag fields into your form</p>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          <Droppable droppableId="field-library" type="LIBRARY_FIELD" isDropDisabled={true}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {availableLibraryFields.map((field, index) => (
                  <Draggable key={field.id} draggableId={field.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`p-3 border rounded-lg bg-white cursor-grab transition-all ${
                          snapshot.isDragging 
                            ? 'shadow-lg rotate-2 scale-105 bg-blue-50 border-blue-200' 
                            : 'hover:shadow-md hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{field.label}</div>
                            <div className="text-xs text-gray-500 capitalize">{field.field_type}</div>
                            {field.affects_pricing && (
                              <div className="text-xs text-green-600 mt-1">£{field.price_modifier}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                
                {availableLibraryFields.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All fields are in use</p>
                    <p className="text-xs mt-1">Create more fields to add them</p>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </div>
      </div>

      {/* Main Content - Form Builder */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{form.name || 'Untitled Form'}</h1>
                <p className="text-sm text-muted-foreground">
                  {previewMode ? 'Preview mode' : 'Drag fields from the library • Click to edit • Right-click to delete'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={previewMode ? "default" : "outline"} 
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {previewMode ? 'Edit Mode' : 'Preview'}
              </Button>
              {!previewMode && (
                <Button onClick={addSection} variant="outline" size="sm">
                  <FolderPlus className="h-4 w-4 mr-1" />
                  Add Section
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Form Canvas */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {(!formFields || formFields.length === 0) && !previewMode ? (
              <div className="flex items-center justify-center h-64 text-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <Plus className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Drag fields here to start building</h4>
                    <p className="text-gray-500">Drag fields from the library on the left to create your form</p>
                  </div>
                </div>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="space-y-6">
                  {sections.map((section) => {
                    const sectionFields = getFieldsForSection(section.id);
                    
                    return (
                      <Card key={section.id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            {editingSection === section.id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={section.title}
                                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                  className="h-8"
                                  autoFocus
                                  onBlur={() => setEditingSection(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') setEditingSection(null);
                                    if (e.key === 'Escape') setEditingSection(null);
                                  }}
                                />
                                <Button size="sm" variant="ghost" onClick={() => setEditingSection(null)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CardTitle 
                                  className="cursor-pointer hover:text-blue-600"
                                  onClick={() => !previewMode && setEditingSection(section.id)}
                                >
                                  {section.title}
                                </CardTitle>
                                {!previewMode && section.id !== 'default' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeSection(section.id)}
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <Droppable droppableId={`section-${section.id}`} type="FORM_FIELD">
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`space-y-3 min-h-[50px] transition-all ${
                                  snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''
                                }`}
                              >
                                {sectionFields.map((fieldInstance, index) => (
                                  <Draggable 
                                    key={fieldInstance.id} 
                                    draggableId={fieldInstance.id} 
                                    index={index}
                                    isDragDisabled={previewMode}
                                  >
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`p-4 border rounded-lg bg-white transition-all ${
                                          snapshot.isDragging 
                                            ? 'shadow-lg rotate-1 scale-105' 
                                            : 'hover:shadow-md'
                                        }`}
                                      >
                                        <div className="flex items-start gap-3">
                                          {!previewMode && (
                                            <div 
                                              {...provided.dragHandleProps}
                                              className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab"
                                            >
                                              <GripVertical className="h-4 w-4" />
                                            </div>
                                          )}
                                          
                                          <div className="flex-1">
                                            {renderFieldPreview(fieldInstance)}
                                          </div>
                                          
                                          {!previewMode && (
                                            <div className="flex items-center gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditingField(fieldInstance.id)}
                                                className="h-7 w-7 p-0"
                                              >
                                                <Edit3 className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeFieldMutation.mutate(fieldInstance.id)}
                                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                                
                                {sectionFields.length === 0 && !previewMode && (
                                  <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                                    <Plus className="h-6 w-6 mx-auto mb-2" />
                                    <p className="text-sm">Drop fields here</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </Droppable>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </DragDropContext>
            )}
          </div>
        </div>
      </div>

      {renderEditDialog()}
    </div>
  );
};