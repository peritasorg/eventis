import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Edit3, Trash2, GripVertical, Eye, DollarSign, MessageSquare, FolderPlus, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AdvancedFieldLibrary } from './AdvancedFieldLibrary';
import { FormPreviewMode } from './FormPreviewMode';

interface IntegratedFormBuilderProps {
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

interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export const IntegratedFormBuilder: React.FC<IntegratedFormBuilderProps> = ({ form, onBack }) => {
  const { currentTenant } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Fetch existing fields
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

  // Fetch form sections
  const { data: sections, refetch: refetchSections } = useSupabaseQuery(
    ['form-sections', form.id],
    async () => {
      if (!form.id || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_sections')
        .select('*')
        .eq('form_page_id', form.id) // Using form_page_id for now
        .eq('tenant_id', currentTenant.id)
        .order('section_order');
      
      if (error) throw error;
      return data || [];
    }
  );

  // Remove field from form
  const removeFieldMutation = useSupabaseMutation(
    async (fieldInstanceId: string) => {
      const { error } = await supabase
        .from('form_field_instances')
        .delete()
        .eq('id', fieldInstanceId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field removed from form!',
      onSuccess: refetchFields
    }
  );

  // Delete field entirely from library
  const deleteFieldMutation = useSupabaseMutation(
    async (fieldLibraryId: string) => {
      // First remove all instances of this field from forms
      await supabase
        .from('form_field_instances')
        .delete()
        .eq('field_library_id', fieldLibraryId);

      // Then delete from library
      const { error } = await supabase
        .from('field_library')
        .delete()
        .eq('id', fieldLibraryId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field deleted permanently!',
      invalidateQueries: [['field-library'], ['form-fields', form.id]],
      onSuccess: refetchFields
    }
  );

  // Update field instance
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

  const getFieldsForSection = (sectionId: string) => {
    if (!formFields) return [];
    return formFields.filter(field => {
      const fieldSectionId = field.form_section_id || 'default';
      return fieldSectionId === sectionId;
    }).sort((a, b) => a.field_order - b.field_order);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !formFields) return;

    const { source, destination } = result;
    
    // Handle reordering logic here
    console.log('Drag operation:', { source, destination });
    
    // Refresh data after reordering
    refetchFields();
  };

  const renderFieldPreview = (fieldInstance: FormFieldInstance) => {
    const field = fieldInstance.field_library;
    
    switch (field.field_type) {
      case 'text':
        return (
          <div>
            <Label className="text-sm font-medium">{field.label}</Label>
            {field.help_text && <p className="text-xs text-muted-foreground mb-2">{field.help_text}</p>}
            <Input placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`} className="h-8" />
          </div>
        );
      case 'textarea':
        return (
          <div>
            <Label className="text-sm font-medium">{field.label}</Label>
            {field.help_text && <p className="text-xs text-muted-foreground mb-2">{field.help_text}</p>}
            <Textarea placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`} rows={3} />
          </div>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox id={field.id} />
            <div>
              <Label htmlFor={field.id} className="text-sm font-medium">{field.label}</Label>
              {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
            </div>
          </div>
        );
      case 'select':
        return (
          <div>
            <Label className="text-sm font-medium">{field.label}</Label>
            {field.help_text && <p className="text-xs text-muted-foreground mb-2">{field.help_text}</p>}
            <Select>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return (
          <div>
            <Label className="text-sm font-medium">{field.label}</Label>
            {field.help_text && <p className="text-xs text-muted-foreground mb-2">{field.help_text}</p>}
            <Input placeholder={field.placeholder || "Enter value"} className="h-8" />
          </div>
        );
    }
  };

  const renderEditableField = (fieldInstance: FormFieldInstance) => {
    const field = fieldInstance.field_library;
    const isEditing = editingField === fieldInstance.id;

    return (
      <Draggable draggableId={fieldInstance.id} index={fieldInstance.field_order}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`p-3 border rounded-md bg-white transition-all ${
              snapshot.isDragging ? 'shadow-lg rotate-2' : 'shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              <div 
                {...provided.dragHandleProps}
                className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab"
              >
                <GripVertical className="h-4 w-4" />
              </div>
              
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={fieldInstance.label_override || field.label}
                      onChange={(e) => updateFieldMutation.mutate({
                        fieldId: fieldInstance.id,
                        updates: { label_override: e.target.value }
                      })}
                      placeholder="Field label"
                    />
                    <Textarea
                      value={fieldInstance.help_text_override || field.help_text || ''}
                      onChange={(e) => updateFieldMutation.mutate({
                        fieldId: fieldInstance.id,
                        updates: { help_text_override: e.target.value }
                      })}
                      placeholder="Help text"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setEditingField(null)}>
                        Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{fieldInstance.label_override || field.label}</h4>
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
                    </div>
                    
                    {(fieldInstance.help_text_override || field.help_text) && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {fieldInstance.help_text_override || field.help_text}
                      </p>
                    )}
                    
                    <div className="text-xs text-gray-500 mb-2">
                      Type: <span className="capitalize">{field.field_type}</span>
                      {field.affects_pricing && (
                        <span className="ml-2 text-green-600">• Affects pricing: £{field.price_modifier}</span>
                      )}
                    </div>
                    
                    {renderFieldPreview(fieldInstance)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Enhanced Field Library */}
      <div className="w-96 border-r bg-white dark:bg-gray-800 flex flex-col">
        <AdvancedFieldLibrary formId={form.id} onFieldAdded={refetchFields} />
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
                  {previewMode ? 'Preview how this form appears in events' : 'Drag fields to reorder • Click to edit • Delete to remove'}
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
                {previewMode ? 'Edit Mode' : 'Event Preview'}
              </Button>
            </div>
          </div>
        </div>

        {/* Form Canvas */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {previewMode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Event Preview Mode</h2>
                    <p className="text-sm text-muted-foreground">This is how the form will appear when used in event records</p>
                  </div>
                </div>
                <FormPreviewMode 
                  formFields={formFields || []}
                  formResponses={{}}
                  readOnly={true}
                />
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="space-y-6">
                  <Droppable droppableId="section-default">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-32 p-4 border-2 border-dashed rounded-lg transition-colors ${
                          snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                        }`}
                      >
                        <h3 className="text-lg font-medium mb-4">Form Fields</h3>
                        
                        {getFieldsForSection('default').length > 0 ? (
                          <div className="space-y-3">
                            {getFieldsForSection('default').map((fieldInstance) => 
                              renderEditableField(fieldInstance)
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No fields yet</p>
                            <p className="text-sm mt-1">Drag fields from the library to get started</p>
                          </div>
                        )}
                        
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </DragDropContext>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};