
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Edit3, Trash2, Eye, DollarSign, MessageSquare } from 'lucide-react';
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
  label_override?: string;
  placeholder_override?: string;
  help_text_override?: string;
  required_override?: boolean;
  field_library: FieldLibraryItem;
}

export const DragDropFormBuilder: React.FC<DragDropFormBuilderProps> = ({ form, onBack }) => {
  const { currentTenant } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

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
    async (fieldLibraryId: string) => {
      const maxOrder = Math.max(...(formFields?.map(f => f.field_order) || [0]), 0);
      
      const { error } = await supabase
        .from('form_field_instances')
        .insert([{
          form_template_id: form.id,
          field_library_id: fieldLibraryId,
          field_order: maxOrder + 1,
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

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !formFields) return;

    const items: FormFieldInstance[] = Array.from(formFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update field orders
    const updates = items.map((item: FormFieldInstance, index: number) => ({
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
          {/* Field Library Sidebar */}
          <div className="col-span-3">
            <Card className="h-fit">
              <CardContent className="p-4">
                <QuickFieldLibrary onAddField={addFieldMutation.mutate} />
              </CardContent>
            </Card>
          </div>

          {/* Form Builder Canvas */}
          <div className="col-span-9">
            <Card>
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Form Canvas</h3>
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
                    <Droppable droppableId="form-fields">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-4 min-h-32 p-4 rounded-lg transition-colors ${
                            snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
                          }`}
                        >
                          {formFields.map((fieldInstance, index) => (
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
                                  className={`group relative ${
                                    snapshot.isDragging ? 'z-50' : ''
                                  }`}
                                >
                                  <Card className={`transition-all duration-200 ${
                                    snapshot.isDragging 
                                      ? 'shadow-xl rotate-1 scale-105' 
                                      : 'hover:shadow-md'
                                  } ${
                                    editingField === fieldInstance.id 
                                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                                      : 'bg-white'
                                  }`}>
                                    <CardContent className="p-4">
                                      {!previewMode && (
                                        <div className="flex items-center justify-between mb-3">
                                          <div 
                                            {...provided.dragHandleProps}
                                            className="flex items-center gap-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                                          >
                                            <GripVertical className="h-4 w-4" />
                                            <span className="text-xs font-medium">
                                              {fieldInstance.field_library?.label}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => setEditingField(
                                                editingField === fieldInstance.id ? null : fieldInstance.id
                                              )}
                                              className="h-7 w-7 p-0"
                                            >
                                              <Edit3 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeFieldMutation.mutate(fieldInstance.id)}
                                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {editingField === fieldInstance.id ? (
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <Label className="text-xs">Custom Label</Label>
                                              <Input
                                                defaultValue={fieldInstance.label_override || ''}
                                                placeholder={fieldInstance.field_library?.label}
                                                className="h-8 text-sm"
                                                onBlur={(e) => {
                                                  if (e.target.value !== fieldInstance.label_override) {
                                                    updateFieldMutation.mutate({
                                                      fieldId: fieldInstance.id,
                                                      updates: { label_override: e.target.value || null }
                                                    });
                                                  }
                                                }}
                                              />
                                            </div>
                                            <div>
                                              <Label className="text-xs">Placeholder</Label>
                                              <Input
                                                defaultValue={fieldInstance.placeholder_override || ''}
                                                placeholder={fieldInstance.field_library?.placeholder}
                                                className="h-8 text-sm"
                                                onBlur={(e) => {
                                                  if (e.target.value !== fieldInstance.placeholder_override) {
                                                    updateFieldMutation.mutate({
                                                      fieldId: fieldInstance.id,
                                                      updates: { placeholder_override: e.target.value || null }
                                                    });
                                                  }
                                                }}
                                              />
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                              <Switch
                                                checked={fieldInstance.required_override ?? true}
                                                onCheckedChange={(checked) => {
                                                  updateFieldMutation.mutate({
                                                    fieldId: fieldInstance.id,
                                                    updates: { required_override: checked }
                                                  });
                                                }}
                                              />
                                              <Label className="text-xs">Required</Label>
                                            </div>
                                            <Button
                                              size="sm"
                                              onClick={() => setEditingField(null)}
                                              className="h-7"
                                            >
                                              Done
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          {renderFieldPreview(fieldInstance)}
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
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
