import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Eye, Edit, Trash2, GripVertical, Plus, Save } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FormSectionManager } from './FormSectionManager';
import { EnhancedFieldLibrary } from './EnhancedFieldLibrary';
import { CompactFieldDisplay } from './CompactFieldDisplay';
import { UniversalFieldEditor } from './UniversalFieldEditor';

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
  const [formName, setFormName] = useState(form.name || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [previewResponses, setPreviewResponses] = useState<Record<string, any>>({});

  // Fetch form sections
  const { data: formSections, refetch: refetchSections } = useSupabaseQuery(
    ['form-sections', form.id],
    async () => {
      if (!form.id) return [];
      
      const { data, error } = await supabase
        .from('form_sections')
        .select('*')
        .eq('form_template_id', form.id)
        .eq('tenant_id', currentTenant?.id)
        .order('section_order');
      
      if (error) {
        console.error('Form sections error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  // Fetch form fields with library data
  const { data: formFields, refetch: refetchFields } = useSupabaseQuery(
    ['form-fields', form.id],
    async () => {
      if (!form.id) return [];
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .select(`
          *,
          field_library (*)
        `)
        .eq('form_template_id', form.id)
        .order('section_id, field_order');
      
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
      successMessage: 'Form name updated!',
    }
  );

  // Delete field instance mutation
  const deleteFieldMutation = useSupabaseMutation(
    async (fieldInstanceId: string) => {
      const { error } = await supabase
        .from('form_field_instances')
        .delete()
        .eq('id', fieldInstanceId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field removed from form!',
      invalidateQueries: [['form-fields', form.id]],
      onSuccess: () => {
        refetchFields();
      }
    }
  );

  // Reorder fields mutation (within and between sections)
  const reorderFieldsMutation = useSupabaseMutation(
    async (updates: Array<{ id: string; field_order: number; section_id: string }>) => {
      for (const update of updates) {
        await supabase
          .from('form_field_instances')
          .update({ 
            field_order: update.field_order,
            section_id: update.section_id 
          })
          .eq('id', update.id);
      }
    },
    {
      successMessage: 'Fields reordered successfully!',
      invalidateQueries: [['form-fields', form.id]],
    }
  );

  const handleDragEnd = (result: any) => {
    if (!result.destination || !formFields) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    // Handle section-to-section field movement
    const sourceSectionId = result.source.droppableId.replace('section-', '');
    const destSectionId = result.destination.droppableId.replace('section-', '');
    
    const fieldsInSection = formFields.filter(f => f.section_id === sourceSectionId);
    const reorderedFields = Array.from(fieldsInSection);
    const [reorderedItem] = reorderedFields.splice(sourceIndex, 1);
    
    // Ensure reorderedItem exists and is an object
    if (!reorderedItem || typeof reorderedItem !== 'object') return;
    
    // If moving between sections
    if (sourceSectionId !== destSectionId) {
      const destFields = formFields.filter(f => f.section_id === destSectionId);
      destFields.splice(destIndex, 0, { 
        ...reorderedItem as any, 
        section_id: destSectionId 
      });
      
      const updates = [
        ...destFields.map((field: any, index: number) => ({
          id: field.id,
          field_order: index + 1,
          section_id: destSectionId
        })),
        ...reorderedFields.map((field: any, index: number) => ({
          id: field.id,
          field_order: index + 1,
          section_id: sourceSectionId
        }))
      ];
      
      reorderFieldsMutation.mutate(updates);
    } else {
      // Same section reordering
      reorderedFields.splice(destIndex, 0, reorderedItem);
      
      const updates = reorderedFields.map((field: any, index: number) => ({
        id: field.id,
        field_order: index + 1,
        section_id: sourceSectionId
      }));
      
      reorderFieldsMutation.mutate(updates);
    }
  };

  const handleSaveForm = () => {
    if (formName !== form.name) {
      updateFormMutation.mutate({ name: formName });
    }
  };

  const handleFieldAdded = () => {
    refetchFields();
  };

  const handleEditField = (field: any) => {
    setEditingField(field);
    setIsFieldEditorOpen(true);
  };

  const handleFieldEditorClose = () => {
    setIsFieldEditorOpen(false);
    setEditingField(null);
    refetchFields();
  };

  const handlePreviewResponseChange = (fieldId: string, response: any) => {
    setPreviewResponses(prev => ({
      ...prev,
      [fieldId]: response
    }));
  };

  const calculatePreviewTotal = () => {
    if (!formFields) return 0;
    
    return formFields.reduce((total, field) => {
      const response = previewResponses[field.id];
      if (response?.enabled && field.field_library?.affects_pricing) {
        const price = parseFloat(response.price || field.field_library.unit_price || 0);
        const quantity = parseInt(response.quantity || 1);
        return total + (price * quantity);
      }
      return total;
    }, 0);
  };

  const getFieldsForSection = (sectionId: string) => {
    return formFields?.filter(field => field.section_id === sectionId) || [];
  };

  const renderFieldInstance = (field: any, index: number, isDragging: boolean) => {
    const fieldLibrary = field.field_library;
    if (!fieldLibrary) return null;

    const previewResponse = previewResponses[field.id] || {
      value: '',
      notes: '',
      price: fieldLibrary.unit_price || 0,
      quantity: fieldLibrary.default_quantity || 1,
      enabled: fieldLibrary.field_type === 'toggle' ? false : true
    };

    return (
      <Card className={`${isDragging ? 'shadow-lg rotate-2' : ''} transition-all`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              <div>
                <CardTitle className="text-sm">{fieldLibrary.label}</CardTitle>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {fieldLibrary.field_type}
                  </Badge>
                  {fieldLibrary.affects_pricing && (
                    <Badge variant="secondary" className="text-xs">
                      £{fieldLibrary.unit_price || 0}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditField(fieldLibrary)}
                className="h-6 w-6 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteFieldMutation.mutate(field.id)}
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {isPreviewMode ? (
            <CompactFieldDisplay
              field={fieldLibrary}
              response={previewResponse}
              onChange={(response) => handlePreviewResponseChange(field.id, response)}
              readOnly={false}
            />
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Type:</strong> {fieldLibrary.field_type}</p>
              {fieldLibrary.help_text && <p><strong>Help:</strong> {fieldLibrary.help_text}</p>}
              {fieldLibrary.affects_pricing && (
                <p><strong>Pricing:</strong> {fieldLibrary.pricing_behavior} - £{fieldLibrary.unit_price}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isPreviewMode) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="flex-shrink-0 p-4 bg-card border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setIsPreviewMode(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Editor
              </Button>
              <h1 className="text-lg font-semibold">{formName} - Preview</h1>
            </div>
            
            <div className="text-lg font-semibold text-primary">
              Total: £{calculatePreviewTotal().toFixed(2)}
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {formSections?.map((section) => {
            const sectionFields = getFieldsForSection(section.id);
            if (sectionFields.length === 0) return null;
            
            return (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle>{section.section_title}</CardTitle>
                  {section.section_description && (
                    <p className="text-sm text-muted-foreground">{section.section_description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {sectionFields.map((field) => (
                    <div key={field.id}>
                      <CompactFieldDisplay
                        field={field.field_library}
                        response={previewResponses[field.id] || {
                          value: '',
                          notes: '',
                          price: field.field_library?.unit_price || 0,
                          quantity: field.field_library?.default_quantity || 1,
                          enabled: field.field_library?.field_type === 'toggle' ? false : true
                        }}
                        onChange={(response) => handlePreviewResponseChange(field.id, response)}
                        readOnly={false}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-card border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Forms
            </Button>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none shadow-none focus-visible:ring-0 px-0"
              placeholder="Form name..."
            />
            {formName !== form.name && (
              <Button onClick={handleSaveForm} size="sm" variant="outline">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={isPreviewMode ? "default" : "outline"}
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {isPreviewMode ? 'Editing' : 'Preview'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Sections & Field Library */}
        <div className="w-80 border-r bg-card flex flex-col">
          {/* Sections */}
          <div className="flex-1 p-4 border-b">
            <FormSectionManager
              formId={form.id}
              onSectionSelect={setSelectedSectionId}
              selectedSectionId={selectedSectionId}
            />
          </div>
          
          {/* Field Library */}
          <div className="flex-1 overflow-hidden">
            <EnhancedFieldLibrary
              formId={form.id}
              sectionId={selectedSectionId}
              onFieldAdded={handleFieldAdded}
            />
          </div>
        </div>

        {/* Main Content Area - Form Canvas */}
        <div className="flex-1 overflow-auto">
          {formSections?.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
                <p className="text-muted-foreground mb-4">
                  A Guest Information section is being created for you automatically.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <DragDropContext onDragEnd={handleDragEnd}>
                {formSections?.map((section) => {
                  const sectionFields = getFieldsForSection(section.id);
                  
                  return (
                    <Card 
                      key={section.id} 
                      className={selectedSectionId === section.id ? 'ring-2 ring-primary' : ''}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {section.section_title}
                              <Badge variant="outline" className="text-xs">
                                {sectionFields.length} fields
                              </Badge>
                            </CardTitle>
                            {section.section_description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {section.section_description}
                              </p>
                            )}
                          </div>
                          
                          {selectedSectionId === section.id && (
                            <Badge variant="default" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <Droppable droppableId={`section-${section.id}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`space-y-3 min-h-[100px] rounded-lg transition-colors ${
                                snapshot.isDraggingOver ? 'bg-primary/5 border-2 border-dashed border-primary' : ''
                              }`}
                            >
                              {sectionFields.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p className="text-sm">No fields in this section yet.</p>
                                  <p className="text-xs mt-1">
                                    {selectedSectionId === section.id ? 
                                      'Add fields from the library on the left.' : 
                                      'Select this section to add fields.'
                                    }
                                  </p>
                                </div>
                              ) : (
                                sectionFields.map((field, index) => (
                                  <Draggable
                                    key={field.id}
                                    draggableId={field.id}
                                    index={index}
                                  >
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                      >
                                        {renderFieldInstance(field, index, snapshot.isDragging)}
                                      </div>
                                    )}
                                  </Draggable>
                                ))
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </CardContent>
                    </Card>
                  );
                })}
              </DragDropContext>
            </div>
          )}
        </div>
      </div>

      {/* Field Editor */}
      <UniversalFieldEditor
        isOpen={isFieldEditorOpen}
        onClose={handleFieldEditorClose}
        field={editingField}
        onSuccess={handleFieldEditorClose}
        formId={form.id}
      />
    </div>
  );
};