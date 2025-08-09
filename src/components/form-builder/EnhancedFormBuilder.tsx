import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, Save, ArrowLeft, Plus, GripVertical, X, Edit } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedFieldLibrary } from './EnhancedFieldLibrary';
import { CompactFieldDisplay } from './CompactFieldDisplay';
import { UniversalFieldEditor } from './UniversalFieldEditor';
import { FormSectionManager } from './FormSectionManager';
import { toast } from 'sonner';

interface EnhancedFormBuilderProps {
  form: any;
  onBack: () => void;
}

export const EnhancedFormBuilder: React.FC<EnhancedFormBuilderProps> = ({
  form,
  onBack
}) => {
  const { currentTenant } = useAuth();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [formName, setFormName] = useState(form?.name || 'Untitled Form');
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [previewResponses, setPreviewResponses] = useState<Record<string, any>>({});
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showSections, setShowSections] = useState(true);

  // Fetch form fields with library data
  const { data: formFields, refetch: refetchFields } = useSupabaseQuery(
    ['form-fields', form?.id],
    async () => {
      if (!form?.id) return [];
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .select(`
          *,
          field_library (*)
        `)
        .eq('form_template_id', form.id)
        .order('field_order');
      
      if (error) {
        console.error('Form fields error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  // Update form name mutation
  const updateFormMutation = useSupabaseMutation(
    async (variables: { name: string }) => {
      const { data, error } = await supabase
        .from('form_templates')
        .update({ name: variables.name })
        .eq('id', form.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Form updated successfully!',
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
      successMessage: 'Field removed from form!',
      invalidateQueries: [['form-fields', form?.id]],
    }
  );

  // Reorder fields mutation
  const reorderFieldsMutation = useSupabaseMutation(
    async (reorderedFields: any[]) => {
      const updates = reorderedFields.map((field, index) => ({
        id: field.id,
        field_order: index + 1,
      }));
      
      for (const update of updates) {
        await supabase
          .from('form_field_instances')
          .update({ field_order: update.field_order })
          .eq('id', update.id);
      }
    },
    {
      successMessage: 'Fields reordered successfully!',
      invalidateQueries: [['form-fields', form?.id]],
    }
  );

  const handleDragEnd = (result: any) => {
    if (!result.destination || !formFields) return;
    
    const reorderedFields = Array.from(formFields);
    const [movedField] = reorderedFields.splice(result.source.index, 1);
    reorderedFields.splice(result.destination.index, 0, movedField);
    
    reorderFieldsMutation.mutate(reorderedFields);
  };

  const handleSaveForm = () => {
    if (formName.trim() !== form?.name) {
      updateFormMutation.mutate({ name: formName.trim() });
    }
    toast.success('Form saved successfully!');
  };

  const handleFieldAdded = () => {
    refetchFields();
  };

  const handleEditFieldLibraryItem = (field: any) => {
    setEditingField(field);
    setShowFieldEditor(true);
  };

  const handlePreviewResponseChange = (fieldId: string, response: any) => {
    setPreviewResponses(prev => ({
      ...prev,
      [fieldId]: response
    }));
  };

  // Calculate total for preview
  const calculatePreviewTotal = () => {
    if (!formFields) return 0;
    
    return formFields.reduce((total, fieldInstance) => {
      const field = fieldInstance.field_library;
      const response = previewResponses[fieldInstance.id];
      
      if (!field?.affects_pricing || !response) return total;
      
      const finalPrice = response.manual_override || response.calculated_total || 
        (response.price && response.quantity ? response.price * response.quantity : 0);
      
      return total + (finalPrice || 0);
    }, 0);
  };

  if (isPreviewMode) {
    const previewTotal = calculatePreviewTotal();
    
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex-shrink-0 p-4 bg-card border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setIsPreviewMode(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Builder
              </Button>
              <h1 className="text-xl font-bold">{formName}</h1>
              <Badge variant="secondary">Preview Mode</Badge>
            </div>
            
            <div className="text-lg font-bold text-primary">
              Total: £{previewTotal.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {formFields?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No fields in this form yet.</p>
                <p className="text-sm">Go back to the builder to add some fields.</p>
              </div>
            ) : (
              formFields?.map((fieldInstance) => (
                <CompactFieldDisplay
                  key={fieldInstance.id}
                  field={fieldInstance.field_library}
                  response={previewResponses[fieldInstance.id] || {}}
                  onChange={(response) => handlePreviewResponseChange(fieldInstance.id, response)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background">
      {/* Left Sidebar - Sections & Field Library */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant={showSections ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSections(true)}
            >
              Sections
            </Button>
            <Button
              variant={!showSections ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSections(false)}
            >
              Fields
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {showSections ? (
            <FormSectionManager
              formId={form?.id}
              onSectionSelect={setSelectedSectionId}
              selectedSectionId={selectedSectionId}
            />
          ) : (
            <EnhancedFieldLibrary
              formId={form?.id}
              sectionId={selectedSectionId}
              onFieldAdded={handleFieldAdded}
            />
          )}
        </div>
      </div>

      {/* Main Form Builder */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-lg font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                placeholder="Form Name"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsPreviewMode(true)}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleSaveForm}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Form Canvas */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Form Fields ({formFields?.length || 0})
                  <Badge variant="secondary">
                    Drag to reorder
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                {formFields?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Plus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No fields added yet</p>
                    <p className="text-sm">Use the field library to add fields to your form</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="form-fields">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-3"
                        >
                          {formFields?.map((fieldInstance, index) => (
                            <Draggable
                              key={fieldInstance.id}
                              draggableId={fieldInstance.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`border rounded-lg p-4 bg-card ${
                                    snapshot.isDragging ? 'shadow-lg' : ''
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="p-1 text-muted-foreground hover:text-foreground cursor-grab"
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                          <h4 className="font-medium">{fieldInstance.field_library?.label}</h4>
                                          <Badge variant="outline" className="text-xs">
                                            {fieldInstance.field_library?.field_type}
                                          </Badge>
                                          {fieldInstance.field_library?.affects_pricing && (
                                            <Badge variant="secondary" className="text-xs">
                                              £{fieldInstance.field_library?.unit_price || 0}
                                            </Badge>
                                          )}
                                        </div>
                                        
                                        <div className="text-sm text-muted-foreground space-y-1">
                                          {fieldInstance.field_library?.help_text && (
                                            <p>{fieldInstance.field_library.help_text}</p>
                                          )}
                                          
                                          <div className="flex items-center gap-4">
                                            {fieldInstance.field_library?.show_quantity && (
                                              <span>Quantity: Yes</span>
                                            )}
                                            {fieldInstance.field_library?.show_notes && (
                                              <span>Notes: Yes</span>
                                            )}
                                            {fieldInstance.field_library?.unit_type && (
                                              <span>Unit: {fieldInstance.field_library.unit_type}</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditFieldLibraryItem(fieldInstance.field_library)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeFieldMutation.mutate(fieldInstance.id)}
                                        disabled={removeFieldMutation.isPending}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
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
      
      <UniversalFieldEditor
        isOpen={showFieldEditor}
        onClose={() => setShowFieldEditor(false)}
        field={editingField}
        onSuccess={handleFieldAdded}
      />
    </div>
  );
};