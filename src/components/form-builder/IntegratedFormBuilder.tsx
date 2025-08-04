import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Edit3, Trash2, GripVertical, Eye, DollarSign, MessageSquare, FolderPlus, X } from 'lucide-react';
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
  
  // Field creation state
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [newFieldData, setNewFieldData] = useState({
    label: '',
    field_type: 'text',
    help_text: '',
    affects_pricing: false,
    price_modifier: 0,
    auto_add_price_field: false,
    auto_add_notes_field: false,
    options: [] as { label: string; value: string }[]
  });

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

  // Fetch field library for quick add
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

  // Create new field and add to form
  const createAndAddFieldMutation = useSupabaseMutation(
    async (fieldData: any) => {
      // First create the field in the library
      const { data: newField, error: fieldError } = await supabase
        .from('field_library')
        .insert([{
          ...fieldData,
          tenant_id: currentTenant?.id,
          active: true
        }])
        .select()
        .single();
      
      if (fieldError) throw fieldError;

      // Then add it to the form
      const maxOrder = Math.max(...(formFields?.map(f => f.field_order) || [0]), 0);
      
      const { error: instanceError } = await supabase
        .from('form_field_instances')
        .insert([{
          form_template_id: form.id,
          field_library_id: newField.id,
          field_order: maxOrder + 1,
          form_section_id: null,
          tenant_id: currentTenant?.id
        }]);
      
      if (instanceError) throw instanceError;
      
      return newField;
    },
    {
      successMessage: 'Field created and added to form!',
      onSuccess: () => {
        setIsCreatingField(false);
        setNewFieldData({
          label: '',
          field_type: 'text',
          help_text: '',
          affects_pricing: false,
          price_modifier: 0,
          auto_add_price_field: false,
          auto_add_notes_field: false,
          options: []
        });
        refetchFields();
      }
    }
  );

  // Add existing field to form
  const addFieldMutation = useSupabaseMutation(
    async ({ fieldLibraryId, sectionId }: { fieldLibraryId: string; sectionId?: string }) => {
      // Check if field is already in the form
      const fieldExists = formFields?.some(field => field.field_library_id === fieldLibraryId);
      if (fieldExists) {
        throw new Error('This field is already in the form');
      }

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

  // Section management mutations
  const addSectionMutation = useSupabaseMutation(
    async (sectionData: { title: string }) => {
      const maxOrder = Math.max(...(sections?.map(s => s.section_order) || [0]), 0);
      
      const { data, error } = await supabase
        .from('form_sections')
        .insert([{
          section_title: sectionData.title,
          section_order: maxOrder + 1,
          form_page_id: form.id, // Using form_page_id for now
          tenant_id: currentTenant?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Section created!',
      onSuccess: refetchSections
    }
  );

  const updateSectionMutation = useSupabaseMutation(
    async ({ sectionId, updates }: { sectionId: string; updates: any }) => {
      const { error } = await supabase
        .from('form_sections')
        .update(updates)
        .eq('id', sectionId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Section updated!',
      onSuccess: refetchSections
    }
  );

  const removeSectionMutation = useSupabaseMutation(
    async (sectionId: string) => {
      // First move fields from this section to default (null)
      const { error: fieldsError } = await supabase
        .from('form_field_instances')
        .update({ form_section_id: null })
        .eq('form_section_id', sectionId);
      
      if (fieldsError) throw fieldsError;

      // Then delete the section
      const { error } = await supabase
        .from('form_sections')
        .delete()
        .eq('id', sectionId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Section removed and fields moved to default section!',
      onSuccess: () => {
        refetchSections();
        refetchFields();
      }
    }
  );

  const handleCreateField = () => {
    if (!newFieldData.label.trim()) {
      toast.error('Field label is required');
      return;
    }

    createAndAddFieldMutation.mutate({
      label: newFieldData.label,
      field_type: newFieldData.field_type,
      help_text: newFieldData.help_text || null,
      affects_pricing: newFieldData.affects_pricing,
      price_modifier: newFieldData.affects_pricing ? newFieldData.price_modifier : null,
      auto_add_price_field: newFieldData.auto_add_price_field,
      auto_add_notes_field: newFieldData.auto_add_notes_field,
      options: (newFieldData.field_type === 'select' || newFieldData.field_type === 'radio') && newFieldData.options.length > 0 
        ? newFieldData.options 
        : null
    });
  };

  const addSection = () => {
    const title = prompt('Section title:', 'New Section');
    if (title) {
      addSectionMutation.mutate({ title });
    }
  };

  const updateSection = (sectionId: string, updates: { title: string }) => {
    updateSectionMutation.mutate({
      sectionId,
      updates: { section_title: updates.title }
    });
  };

  const removeSection = (sectionId: string) => {
    if (confirm('Are you sure you want to remove this section? All fields will be moved to the default section.')) {
      removeSectionMutation.mutate(sectionId);
    }
  };

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
    
    // Fix section ID mapping
    const sourceSection = source.droppableId === 'section-default' ? 'default' : source.droppableId.replace('section-', '');
    const destSection = destination.droppableId === 'section-default' ? 'default' : destination.droppableId.replace('section-', '');
    
    console.log('Drag operation:', { sourceSection, destSection, source, destination });
    
    // Get the field being moved
    const sourceSectionFields = formFields.filter(f => 
      (f.form_section_id || 'default') === sourceSection
    ).sort((a, b) => a.field_order - b.field_order);
    
    const movedField = sourceSectionFields[source.index];
    if (!movedField) {
      console.error('No field found at source index');
      return;
    }
    
    console.log('Moving field:', movedField.field_library.label, 'from', sourceSection, 'to', destSection);
    
    try {
      // Step 1: Update section assignment first if moving between sections
      if (sourceSection !== destSection) {
        const { error: sectionUpdateError } = await supabase
          .from('form_field_instances')
          .update({ 
            form_section_id: destSection === 'default' ? null : destSection 
          })
          .eq('id', movedField.id);
        
        if (sectionUpdateError) {
          console.error('Section update error:', sectionUpdateError);
          throw sectionUpdateError;
        }
        
        console.log('Section updated successfully');
      }
      
      // Step 2: Calculate new field orders for destination section
      let destSectionFields = formFields.filter(f => 
        (f.form_section_id || 'default') === destSection && f.id !== movedField.id
      ).sort((a, b) => a.field_order - b.field_order);
      
      // Insert the moved field at the destination index
      destSectionFields.splice(destination.index, 0, movedField);
      
      // Step 3: Update field orders in destination section
      const destOrderUpdates = destSectionFields.map((field, index) => ({
        id: field.id,
        field_order: index + 1
      }));
      
      console.log('Updating destination field orders:', destOrderUpdates);
      
      for (const update of destOrderUpdates) {
        const { error } = await supabase
          .from('form_field_instances')
          .update({ field_order: update.field_order })
          .eq('id', update.id);
        
        if (error) {
          console.error('Order update error for field', update.id, ':', error);
          throw error;
        }
      }
      
      // Step 4: If moving between sections, update orders in source section
      if (sourceSection !== destSection) {
        const remainingSourceFields = formFields.filter(f => 
          (f.form_section_id || 'default') === sourceSection && f.id !== movedField.id
        ).sort((a, b) => a.field_order - b.field_order);
        
        const sourceOrderUpdates = remainingSourceFields.map((field, index) => ({
          id: field.id,
          field_order: index + 1
        }));
        
        console.log('Updating source field orders:', sourceOrderUpdates);
        
        for (const update of sourceOrderUpdates) {
          const { error } = await supabase
            .from('form_field_instances')
            .update({ field_order: update.field_order })
            .eq('id', update.id);
          
          if (error) {
            console.error('Source order update error for field', update.id, ':', error);
            throw error;
          }
        }
      }
      
      console.log('All database operations completed successfully');
      
      // Step 5: Refresh data only after all operations complete
      await refetchFields();
      
      toast.success('Field moved successfully!');
      
    } catch (error) {
      console.error('Drag operation failed:', error);
      toast.error('Failed to move field. Please try again.');
      
      // Refresh to revert any partial changes
      await refetchFields();
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
        {editingField === fieldInstance.id ? (
          // Edit mode
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">Label</Label>
                <Input
                  defaultValue={fieldInstance.label_override || field.label}
                  placeholder="Enter label"
                  className="h-8 text-sm"
                  onBlur={(e) => {
                    updateFieldMutation.mutate({
                      fieldId: fieldInstance.id,
                      updates: { label_override: e.target.value || null }
                    });
                  }}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Placeholder</Label>
                <Input
                  defaultValue={fieldInstance.placeholder_override || field.placeholder || ''}
                  placeholder="Enter placeholder"
                  className="h-8 text-sm"
                  onBlur={(e) => {
                    updateFieldMutation.mutate({
                      fieldId: fieldInstance.id,
                      updates: { placeholder_override: e.target.value || null }
                    });
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
          // Preview mode
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
                  className="input-elegant"
                />
              </>
            ) : field.field_type === 'number' ? (
              <>
                <Label>{label}</Label>
                <Input type="number" placeholder={placeholder} disabled className="input-elegant" />
              </>
            ) : field.field_type === 'select' ? (
              <>
                <Label>{label}</Label>
                <Select disabled>
                  <SelectTrigger className="input-elegant">
                    <SelectValue placeholder={placeholder || "Select an option"} />
                  </SelectTrigger>
                </Select>
              </>
            ) : (
              <>
                <Label>{label}</Label>
                <Input placeholder={placeholder} disabled className="input-elegant" />
              </>
            )}

            {/* Show pricing information */}
            {field.affects_pricing && (
              <div className="flex items-center gap-2 mt-2">
                <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                  <DollarSign className="h-3 w-3 inline mr-1" />
                  {field.pricing_type === 'per_guest' ? `£${field.price_modifier || 0} per person` : `£${field.price_modifier || 0} fixed`}
                </div>
              </div>
            )}

            {field.field_type === 'checkbox' && (field.auto_add_price_field || field.auto_add_notes_field) && (
              <div className="grid grid-cols-2 gap-3 ml-6 p-3 bg-secondary/20 rounded">
                {field.auto_add_price_field && (
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
                      className="h-8 input-elegant"
                    />
                  </div>
                )}
                
                {field.auto_add_notes_field && (
                  <div>
                    <Label className="flex items-center gap-1 text-xs">
                      <MessageSquare className="h-3 w-3" />
                      Notes
                    </Label>
                    <Textarea
                      placeholder="Additional notes..."
                      disabled
                      rows={1}
                      className="text-xs input-elegant"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{form.name}</h1>
              <p className="text-muted-foreground">{form.description || 'Build your form by adding fields'}</p>
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
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Field Library Sidebar */}
          <div className="col-span-3">
            <Card className="card-elegant sticky top-6" style={{ height: 'calc(100vh - 10rem)' }}>
              <CardHeader>
                <CardTitle className="text-lg">Field Library</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-full overflow-hidden flex flex-col">
                <div className="p-4 border-b">
                  <Button 
                    onClick={() => setIsCreatingField(true)}
                    className="w-full"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Field
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {fieldLibrary?.map((field) => {
                    const isFieldInForm = formFields?.some(f => f.field_library_id === field.id);
                    return (
                       <Card 
                         key={field.id}
                         className={`p-3 transition-all border relative group ${
                           isFieldInForm 
                             ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                             : 'border-border/50 hover:shadow-sm hover:border-border'
                         }`}
                       >
                          <div 
                            className="cursor-pointer"
                            onClick={() => {
                              if (isFieldInForm) {
                                // Find the field instance and scroll to it
                                const fieldInstance = formFields?.find(f => f.field_library_id === field.id);
                                if (fieldInstance) {
                                  const element = document.getElementById(`field-${fieldInstance.id}`);
                                  if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    setEditingField(fieldInstance.id);
                                  }
                                }
                              } else {
                                addFieldMutation.mutate({ fieldLibraryId: field.id });
                              }
                            }}
                          >
                         <div className="space-y-1">
                           <div className="flex items-center justify-between">
                             <div className="font-medium text-sm">{field.label}</div>
                             {isFieldInForm && (
                               <div className="text-xs text-green-600 font-medium">
                                 ✓ Added
                               </div>
                             )}
                           </div>
                           <div className="text-xs text-muted-foreground capitalize">
                             {field.field_type.replace('_', ' ')}
                           </div>
                           {field.affects_pricing && (
                             <div className="text-xs text-primary flex items-center gap-1">
                               <DollarSign className="h-3 w-3" />
                               Affects pricing
                             </div>
                           )}
                           {isFieldInForm && (
                             <div className="text-xs text-green-600">
                               Click to edit in form
                             </div>
                           )}
                         </div>
                         </div>
                         
                         {/* Delete button - appears on hover */}
                         <Button
                           variant="ghost"
                           size="sm"
                           className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                           onClick={(e) => {
                             e.stopPropagation();
                             if (confirm(`Are you sure you want to permanently delete "${field.label}"? This will remove it from all forms.`)) {
                               deleteFieldMutation.mutate(field.id);
                             }
                           }}
                           title="Delete field permanently"
                         >
                           <X className="h-3 w-3" />
                         </Button>
                      </Card>
                    );
                  })}
                  
                  {(!fieldLibrary || fieldLibrary.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No fields in library</p>
                      <p className="text-xs">Create your first field</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form Canvas */}
          <div className="col-span-9">
            <Card className="card-elegant">
              <div className="p-4 border-b bg-card/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Form Canvas</h3>
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
                      <div className="w-16 h-16 mx-auto bg-secondary/20 rounded-full flex items-center justify-center">
                        <Eye className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-foreground mb-2">Start Building Your Form</h4>
                        <p className="text-muted-foreground">Add fields from the library or create new ones</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="space-y-6">
                      {/* Default section always exists */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h4 className="font-medium text-foreground">Form Fields</h4>
                        </div>
                        <Droppable droppableId="section-default" type="FIELD">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`space-y-3 min-h-[50px] p-3 rounded-lg border-2 border-dashed transition-colors ${
                                snapshot.isDraggingOver 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border/30'
                              }`}
                            >
                              {getFieldsForSection('default').map((fieldInstance, index) => (
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
                                       id={`field-${fieldInstance.id}`}
                                       className={`card-elegant p-4 transition-shadow ${
                                         snapshot.isDragging ? 'shadow-elevated' : ''
                                       } ${editingField === fieldInstance.id ? 'ring-2 ring-primary' : ''}`}
                                     >
                                      <div className="flex items-start gap-3">
                                        {!previewMode && (
                                          <div 
                                            {...provided.dragHandleProps}
                                            className="mt-2 text-muted-foreground hover:text-foreground cursor-grab"
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
                                               onClick={() => setEditingField(editingField === fieldInstance.id ? null : fieldInstance.id)}
                                             >
                                               <Edit3 className="h-4 w-4" />
                                             </Button>
                                             <Button 
                                               variant="ghost" 
                                               size="sm"
                                               onClick={() => removeFieldMutation.mutate(fieldInstance.id)}
                                               className="text-orange-500 hover:text-orange-700"
                                               title="Remove from form"
                                             >
                                               <Trash2 className="h-4 w-4" />
                                             </Button>
                                             <Button 
                                               variant="ghost" 
                                               size="sm"
                                               onClick={() => {
                                                 if (confirm('Are you sure you want to permanently delete this field? This will remove it from all forms.')) {
                                                   deleteFieldMutation.mutate(fieldInstance.field_library_id);
                                                 }
                                               }}
                                               className="text-destructive hover:text-destructive"
                                               title="Delete permanently"
                                             >
                                               <X className="h-4 w-4" />
                                             </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              
                              {getFieldsForSection('default').length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p className="text-sm">Drop fields here or add from library</p>
                                </div>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </div>

                      {/* Custom sections from database */}
                      {sections?.map((section) => (
                        <div key={section.id} className="space-y-4">
                          {/* Section Header */}
                          <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-3">
                              {section.id !== 'default' && (
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              )}
                              <h4 
                                className="font-medium text-foreground cursor-pointer hover:text-primary"
                                onClick={() => {
                                  if (!previewMode) {
                                     const newTitle = prompt('Section title:', section.section_title);
                                    if (newTitle) updateSection(section.id, { title: newTitle });
                                  }
                                }}
                              >
                                {section.section_title}
                              </h4>
                            </div>
                            {!previewMode && (
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    const newTitle = prompt('Section title:', section.section_title);
                                    if (newTitle) updateSection(section.id, { title: newTitle });
                                  }}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                {section.id !== 'default' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => removeSection(section.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Section Fields */}
                          <Droppable droppableId={`section-${section.id}`} type="FIELD">
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`space-y-3 min-h-[50px] p-3 rounded-lg border-2 border-dashed transition-colors ${
                                  snapshot.isDraggingOver 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border/30'
                                }`}
                              >
                                {getFieldsForSection(section.id).map((fieldInstance, index) => (
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
                                         id={`field-${fieldInstance.id}`}
                                         className={`card-elegant p-4 transition-shadow ${
                                           snapshot.isDragging ? 'shadow-elevated' : ''
                                         } ${editingField === fieldInstance.id ? 'ring-2 ring-primary' : ''}`}
                                       >
                                        <div className="flex items-start gap-3">
                                          {!previewMode && (
                                            <div 
                                              {...provided.dragHandleProps}
                                              className="mt-2 text-muted-foreground hover:text-foreground cursor-grab"
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
                                                 onClick={() => setEditingField(editingField === fieldInstance.id ? null : fieldInstance.id)}
                                               >
                                                 <Edit3 className="h-4 w-4" />
                                               </Button>
                                               <Button 
                                                 variant="ghost" 
                                                 size="sm"
                                                 onClick={() => removeFieldMutation.mutate(fieldInstance.id)}
                                                 className="text-orange-500 hover:text-orange-700"
                                                 title="Remove from form"
                                               >
                                                 <Trash2 className="h-4 w-4" />
                                               </Button>
                                               <Button 
                                                 variant="ghost" 
                                                 size="sm"
                                                 onClick={() => {
                                                   if (confirm('Are you sure you want to permanently delete this field? This will remove it from all forms.')) {
                                                     deleteFieldMutation.mutate(fieldInstance.field_library_id);
                                                   }
                                                 }}
                                                 className="text-destructive hover:text-destructive"
                                                 title="Delete permanently"
                                               >
                                                 <X className="h-4 w-4" />
                                               </Button>
                                            </div>
                                          )}
                                        </div>
                                        
                                          {/* Field Edit Form - Remove this duplicate */}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                                
                                {getFieldsForSection(section.id).length === 0 && (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <p className="text-sm">Drop fields here or add from library</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      ))}
                    </div>
                  </DragDropContext>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Field Dialog */}
      <Dialog open={isCreatingField} onOpenChange={setIsCreatingField}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Field</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Field Label *</Label>
              <Input
                id="label"
                value={newFieldData.label}
                onChange={(e) => setNewFieldData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Number of Guests"
                className="input-elegant"
              />
            </div>
            
            <div>
              <Label htmlFor="field_type">Field Type</Label>
              <Select 
                value={newFieldData.field_type}
                onValueChange={(value) => setNewFieldData(prev => ({ ...prev, field_type: value }))}
              >
                <SelectTrigger className="input-elegant">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="checkbox">Checkbox/Toggle</SelectItem>
                  <SelectItem value="select">Select/Dropdown</SelectItem>
                  <SelectItem value="radio">Radio Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="help_text">Help Text</Label>
              <Textarea
                id="help_text"
                value={newFieldData.help_text}
                onChange={(e) => setNewFieldData(prev => ({ ...prev, help_text: e.target.value }))}
                placeholder="Optional help text for users"
                rows={2}
                className="input-elegant"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={newFieldData.affects_pricing}
                onCheckedChange={(checked) => setNewFieldData(prev => ({ ...prev, affects_pricing: checked }))}
              />
              <Label>Affects pricing</Label>
            </div>
            
            {newFieldData.affects_pricing && (
              <div>
                <Label htmlFor="price_modifier">Price Modifier (£)</Label>
                <Input
                  id="price_modifier"
                  type="number"
                  step="0.01"
                  value={newFieldData.price_modifier}
                  onChange={(e) => setNewFieldData(prev => ({ ...prev, price_modifier: parseFloat(e.target.value) || 0 }))}
                  className="input-elegant"
                />
              </div>
            )}
            
            {newFieldData.field_type === 'checkbox' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newFieldData.auto_add_price_field}
                    onCheckedChange={(checked) => setNewFieldData(prev => ({ ...prev, auto_add_price_field: checked }))}
                  />
                  <Label>Auto-add price field</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newFieldData.auto_add_notes_field}
                    onCheckedChange={(checked) => setNewFieldData(prev => ({ ...prev, auto_add_notes_field: checked }))}
                  />
                  <Label>Auto-add notes field</Label>
                </div>
              </div>
            )}
            
            {/* Options for select and radio fields */}
            {(newFieldData.field_type === 'select' || newFieldData.field_type === 'radio') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Options</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewFieldData(prev => ({
                        ...prev,
                        options: [...prev.options, { label: '', value: '' }]
                      }));
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Option
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {newFieldData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Option label"
                        value={option.label}
                        onChange={(e) => {
                          const newOptions = [...newFieldData.options];
                          newOptions[index] = { ...option, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') };
                          setNewFieldData(prev => ({ ...prev, options: newOptions }));
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewFieldData(prev => ({
                            ...prev,
                            options: prev.options.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {newFieldData.options.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Add options for this {newFieldData.field_type} field
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsCreatingField(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateField}
              disabled={createAndAddFieldMutation.isPending || !newFieldData.label.trim()}
            >
              {createAndAddFieldMutation.isPending ? 'Creating...' : 'Create & Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};