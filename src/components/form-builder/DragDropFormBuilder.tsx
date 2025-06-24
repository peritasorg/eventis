
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Eye, Settings, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DragDropFormBuilderProps {
  form: any;
  onBack: () => void;
}

export const DragDropFormBuilder: React.FC<DragDropFormBuilderProps> = ({ form, onBack }) => {
  const { currentTenant } = useAuth();
  const [formFields, setFormFields] = useState<any[]>([]);
  const [isPreview, setIsPreview] = useState(false);

  const { data: fieldLibrary } = useSupabaseQuery(
    ['field-library'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');
      
      if (error) {
        console.error('Field library error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const { data: existingFields, refetch: refetchFields } = useSupabaseQuery(
    ['form-field-instances', form.id],
    async () => {
      if (!form.id || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .select('*, field_library(*)')
        .eq('form_template_id', form.id)
        .eq('tenant_id', currentTenant.id)
        .order('field_order');
      
      if (error) {
        console.error('Form fields error:', error);
        return [];
      }
      
      setFormFields(data || []);
      return data || [];
    }
  );

  const addFieldMutation = useSupabaseMutation(
    async (fieldData: any) => {
      const { data, error } = await supabase
        .from('form_field_instances')
        .insert([{
          ...fieldData,
          tenant_id: currentTenant?.id,
          form_template_id: form.id
        }])
        .select('*, field_library(*)')
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Field added to form!',
      onSuccess: () => {
        refetchFields();
      }
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
      successMessage: 'Field removed from form!',
      onSuccess: () => {
        refetchFields();
      }
    }
  );

  const updateFieldOrderMutation = useSupabaseMutation(
    async (updates: Array<{ id: string; field_order: number }>) => {
      const { error } = await supabase
        .from('form_field_instances')
        .upsert(updates);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field order updated!',
    }
  );

  const handleAddField = (fieldLibraryId: string) => {
    const maxOrder = Math.max(...formFields.map(f => f.field_order || 0), 0);
    
    addFieldMutation.mutate({
      field_library_id: fieldLibraryId,
      field_order: maxOrder + 1,
      required_override: true
    });
  };

  const handleRemoveField = (fieldInstanceId: string) => {
    removeFieldMutation.mutate(fieldInstanceId);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(formFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormFields(items);

    // Update field orders in database
    const updates = items.map((item, index) => ({
      id: item.id,
      field_order: index + 1
    }));

    updateFieldOrderMutation.mutate(updates);
  };

  if (isPreview) {
    return (
      <div className="h-screen flex bg-gray-50">
        {/* Left Sidebar - Field Library (same as edit mode) */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Forms
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Field Library</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Drag fields to add them to your form</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {fieldLibrary?.map((field) => (
                <div
                  key={field.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer bg-white"
                  onClick={() => handleAddField(field.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm text-gray-900">{field.label}</div>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-600 mb-1 capitalize">{field.field_type.replace('_', ' ')}</div>
                  {field.price_modifier > 0 && (
                    <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block">
                      Default: £{field.price_modifier}
                    </div>
                  )}
                  {field.help_text && (
                    <div className="text-xs text-gray-500 mt-2 line-clamp-2">{field.help_text}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area - Preview */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{form.name} - Preview</h1>
                <p className="text-sm text-gray-600">Preview how your form will look to customers</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreview(false)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save Form
                </Button>
              </div>
            </div>
          </div>

          {/* Form Preview */}
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>{form.name}</CardTitle>
                  <p className="text-sm text-gray-600">Please fill out this form for your event requirements</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {formFields.map((fieldInstance) => {
                    const field = fieldInstance.field_library;
                    return (
                      <div key={fieldInstance.id} className="space-y-2">
                        <Label className="text-sm font-medium">
                          {fieldInstance.label_override || field.label}
                          {fieldInstance.required_override && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {field.field_type === 'text' && (
                          <Input 
                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                            readOnly
                          />
                        )}
                        {field.field_type === 'textarea' && (
                          <textarea 
                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                            className="w-full p-2 border border-gray-300 rounded-md resize-none"
                            rows={3}
                            readOnly
                          />
                        )}
                        {field.field_type === 'number' && (
                          <Input 
                            type="number"
                            placeholder={field.placeholder || "0"}
                            readOnly
                          />
                        )}
                        {field.field_type === 'select' && (
                          <Select disabled>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </Select>
                        )}
                        {field.help_text && (
                          <p className="text-xs text-gray-500">{field.help_text}</p>
                        )}
                        
                        {/* Price and Notes fields for each main field */}
                        <div className="ml-4 space-y-2 border-l-2 border-gray-200 pl-4">
                          <div>
                            <Label className="text-xs font-medium text-gray-600">
                              {field.label} Price
                            </Label>
                            <Input 
                              type="number"
                              placeholder={`£${field.price_modifier || 0}`}
                              className="h-8"
                              readOnly
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-600">
                              {field.label} Notes
                            </Label>
                            <textarea 
                              placeholder={`Additional notes for ${field.label.toLowerCase()}`}
                              className="w-full p-2 border border-gray-300 rounded-md resize-none text-xs"
                              rows={2}
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {formFields.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No fields added to this form yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar - Field Library */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Field Library</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">Drag fields to add them to your form</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {fieldLibrary?.map((field) => (
              <div
                key={field.id}
                className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer bg-white"
                onClick={() => handleAddField(field.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm text-gray-900">{field.label}</div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-gray-600 mb-1 capitalize">{field.field_type.replace('_', ' ')}</div>
                {field.price_modifier > 0 && (
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block">
                    Default: £{field.price_modifier}
                  </div>
                )}
                {field.help_text && (
                  <div className="text-xs text-gray-500 mt-2 line-clamp-2">{field.help_text}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{form.name}</h1>
              <p className="text-sm text-gray-600">Build your form by adding fields from the library</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isPreview ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPreview(!isPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {isPreview ? 'Edit' : 'Preview'}
              </Button>
              <Button size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Form
              </Button>
            </div>
          </div>
        </div>

        {/* Form Canvas */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            <Card className="min-h-96">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Form Canvas ({formFields.length} fields)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formFields.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No fields added yet</p>
                    <p>Click on fields from the library to add them to your form</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="form-fields">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                          {formFields.map((fieldInstance, index) => {
                            const field = fieldInstance.field_library;
                            return (
                              <Draggable key={fieldInstance.id} draggableId={fieldInstance.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`p-4 border rounded-lg bg-white ${
                                      snapshot.isDragging ? 'shadow-lg border-blue-300' : 'border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 mb-3">
                                      <div {...provided.dragHandleProps}>
                                        <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{field.label}</div>
                                        <div className="text-xs text-gray-600 capitalize">{field.field_type}</div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveField(fieldInstance.id)}
                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>

                                    {/* Field Preview */}
                                    <div className="mb-3">
                                      <Label className="text-sm font-medium">
                                        {fieldInstance.label_override || field.label}
                                        {fieldInstance.required_override && <span className="text-red-500 ml-1">*</span>}
                                      </Label>
                                      {field.field_type === 'text' && (
                                        <Input 
                                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                                          className="mt-1"
                                          disabled
                                        />
                                      )}
                                      {field.field_type === 'textarea' && (
                                        <textarea 
                                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                                          className="mt-1 w-full p-2 border border-gray-300 rounded-md resize-none"
                                          rows={3}
                                          disabled
                                        />
                                      )}
                                      {field.field_type === 'number' && (
                                        <Input 
                                          type="number"
                                          placeholder={field.placeholder || "0"}
                                          className="mt-1"
                                          disabled
                                        />
                                      )}
                                      {field.field_type === 'select' && (
                                        <Select disabled>
                                          <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select an option" />
                                          </SelectTrigger>
                                        </Select>
                                      )}
                                      {field.help_text && (
                                        <p className="text-xs text-gray-500 mt-1">{field.help_text}</p>
                                      )}
                                    </div>

                                    {/* Price and Notes fields */}
                                    <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 border border-gray-200 rounded">
                                      <div>
                                        <Label className="text-xs font-medium text-gray-600">
                                          {field.label} Price
                                        </Label>
                                        <Input 
                                          type="number"
                                          placeholder={`£${field.price_modifier || 0}`}
                                          className="h-7 text-xs mt-1"
                                          disabled
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs font-medium text-gray-600">
                                          {field.label} Notes
                                        </Label>
                                        <textarea 
                                          placeholder={`Notes for ${field.label.toLowerCase()}`}
                                          className="mt-1 w-full p-1 border border-gray-300 rounded text-xs resize-none"
                                          rows={1}
                                          disabled
                                        />
                                      </div>
                                    </div>

                                    {/* Field Settings */}
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                                      <div>
                                        <Label className="text-xs">Custom Label</Label>
                                        <Input
                                          value={fieldInstance.label_override || ''}
                                          placeholder={field.label}
                                          className="h-7 text-xs mt-1"
                                        />
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <Switch 
                                            id={`required-${fieldInstance.id}`}
                                            checked={fieldInstance.required_override ?? true}
                                          />
                                          <Label htmlFor={`required-${fieldInstance.id}`} className="text-xs">Required</Label>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
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
