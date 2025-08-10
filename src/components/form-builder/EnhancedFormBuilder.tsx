import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Eye, Edit3, Save, GripVertical, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { FormSectionManager } from './FormSectionManager';
import { EnhancedFieldLibrary } from './EnhancedFieldLibrary';
import { CompactFieldDisplay } from './CompactFieldDisplay';
import { UniversalFieldEditor } from './UniversalFieldEditor';
import { FormPreviewMode } from './FormPreviewMode';
import { toast } from 'sonner';

interface EnhancedFormBuilderProps {
  form: any;
  onBack: () => void;
}

export const EnhancedFormBuilder: React.FC<EnhancedFormBuilderProps> = ({ form, onBack }) => {
  const { currentTenant } = useAuth();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [formName, setFormName] = useState(form?.name || '');
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [previewResponses, setPreviewResponses] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'sections' | 'fields'>('sections');

  // Fetch form sections
  const { data: sections, refetch: refetchSections } = useSupabaseQuery(
    ['form-sections', form?.id],
    async () => {
      if (!form?.id || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_sections')
        .select('*')
        .eq('form_template_id', form.id)
        .eq('tenant_id', currentTenant.id)
        .order('section_order', { ascending: true });
      
      if (error) {
        console.error('Sections error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  // Fetch form fields with sections
  const { data: formFields, refetch: refetchFields } = useSupabaseQuery(
    ['form-fields', form?.id],
    async () => {
      if (!form?.id || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .select(`
          *,
          field_library!inner(*),
          form_sections(*)
        `)
        .eq('form_template_id', form.id)
        .eq('tenant_id', currentTenant.id)
        .order('field_order', { ascending: true });
      
      if (error) {
        console.error('Form fields error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  // Set initial selected section
  useEffect(() => {
    if (sections && sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  // Update form name mutation
  const updateFormMutation = useSupabaseMutation(
    async (variables: { name: string }) => {
      const { error } = await supabase
        .from('form_templates')
        .update({ name: variables.name })
        .eq('id', form.id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Form name updated');
      },
      onError: (error) => {
        toast.error('Failed to update form name');
        console.error('Form update error:', error);
      }
    }
  );

  // Delete field mutation
  const deleteFieldMutation = useSupabaseMutation(
    async (fieldId: string) => {
      const { error } = await supabase
        .from('form_field_instances')
        .delete()
        .eq('id', fieldId);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        refetchFields();
        toast.success('Field removed');
      },
      onError: (error) => {
        toast.error('Failed to remove field');
        console.error('Delete field error:', error);
      }
    }
  );

  // Reorder fields mutation
  const reorderFieldsMutation = useSupabaseMutation(
    async (updates: Array<{ id: string; field_order: number; section_id?: string }>) => {
      const { error } = await supabase
        .from('form_field_instances')
        .upsert(updates.map(update => ({
          id: update.id,
          field_order: update.field_order,
          section_id: update.section_id
        })));
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        refetchFields();
      },
      onError: (error) => {
        toast.error('Failed to reorder fields');
        console.error('Reorder error:', error);
      }
    }
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !formFields) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    const draggedFieldId = result.draggableId;

    // Handle section-to-section field movement
    const sourceSectionId = result.source.droppableId.replace('section-', '');
    const destSectionId = result.destination.droppableId.replace('section-', '');

    const fieldsInSection = formFields.filter(f => f.section_id === sourceSectionId);
    const reorderedFields = Array.from(fieldsInSection);
    const [reorderedItem] = reorderedFields.splice(sourceIndex, 1);
    
    // If moving between sections
    if (sourceSectionId !== destSectionId) {
      const destFields = formFields.filter(f => f.section_id === destSectionId);
      destFields.splice(destIndex, 0, { ...reorderedItem, section_id: destSectionId });
      
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

  const renderFieldInstance = (field: any, index: number) => {
    const fieldConfig = {
      ...field.field_library,
      label: field.label_override || field.field_library?.label,
      placeholder: field.placeholder_override || field.field_library?.placeholder,
      help_text: field.help_text_override || field.field_library?.help_text,
      required: field.required_override ?? field.field_library?.required
    };

    return (
      <Draggable key={field.id} draggableId={field.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`group relative ${snapshot.isDragging ? 'z-50' : ''}`}
          >
            <Card className={`border transition-all duration-200 ${
              snapshot.isDragging ? 'shadow-lg border-primary' : 'hover:border-border-hover'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    {...provided.dragHandleProps}
                    className="mt-2 cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 transition-opacity"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1">
                    <CompactFieldDisplay
                      field={fieldConfig}
                      response={previewResponses[field.id] || {}}
                      onChange={(response) => handlePreviewResponseChange(field.id, response)}
                      readOnly={false}
                    />
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditField(field)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFieldMutation.mutate(field.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Draggable>
    );
  };

  if (isPreviewMode) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex-shrink-0 p-4 bg-card border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setIsPreviewMode(false)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Builder
              </Button>
              <h2 className="text-lg font-semibold">{formName} - Preview</h2>
            </div>
            <div className="text-lg font-semibold">
              Total: £{calculatePreviewTotal().toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {formFields?.map((field) => (
              <CompactFieldDisplay
                key={field.id}
                field={field.field_library}
                response={previewResponses[field.id] || {}}
                onChange={(response) => handlePreviewResponseChange(field.id, response)}
                readOnly={true}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-full flex bg-background">
        {/* Left Sidebar */}
        <div className="w-80 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="font-semibold">Form Builder</h2>
            </div>
            
            <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
              <Button
                variant={activeTab === 'sections' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('sections')}
                className="flex-1"
              >
                Sections
              </Button>
              <Button
                variant={activeTab === 'fields' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('fields')}
                className="flex-1"
              >
                Field Library
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {activeTab === 'sections' ? (
              <FormSectionManager
                formId={form.id}
                onSectionSelect={setSelectedSectionId}
                selectedSectionId={selectedSectionId}
              />
            ) : (
              <EnhancedFieldLibrary
                formId={form.id}
                sectionId={selectedSectionId}
                onFieldAdded={handleFieldAdded}
              />
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 p-4 bg-card border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="max-w-md"
                  placeholder="Form name..."
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveForm}
                  disabled={formName === form.name}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground mr-4">
                  Total: £{calculatePreviewTotal().toFixed(2)}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewMode(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          </div>

          {/* Form Canvas */}
          <div className="flex-1 overflow-auto p-6">
            {selectedSectionId ? (
              <div className="max-w-3xl mx-auto">
                {sections?.map(section => {
                  if (section.id !== selectedSectionId) return null;
                  
                  const sectionFields = getFieldsForSection(section.id);
                  
                  return (
                    <Card key={section.id} className="mb-6">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{section.section_title}</CardTitle>
                            {section.section_description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {section.section_description}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary">
                            {sectionFields.length} field{sectionFields.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <Droppable droppableId={`section-${section.id}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`space-y-3 min-h-[100px] p-3 rounded-lg border-2 border-dashed transition-colors ${
                                snapshot.isDraggingOver 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border'
                              }`}
                            >
                              {sectionFields.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                  <p>No fields in this section</p>
                                  <p className="text-sm">Drag fields from the library to add them</p>
                                </div>
                              ) : (
                                sectionFields.map((field, index) => 
                                  renderFieldInstance(field, index)
                                )
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto text-center py-12">
                <p className="text-muted-foreground mb-4">Select a section to start building your form</p>
                <Button onClick={() => setActiveTab('sections')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Sections
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Field Editor Modal */}
        {isFieldEditorOpen && (
          <UniversalFieldEditor
            field={editingField}
            isOpen={isFieldEditorOpen}
            onClose={handleFieldEditorClose}
            onSuccess={handleFieldAdded}
          />
        )}
      </div>
    </DragDropContext>
  );
};