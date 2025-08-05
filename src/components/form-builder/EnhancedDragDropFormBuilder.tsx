import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Edit3, Trash2, Eye, Plus, FolderPlus, Check, X, ArrowLeft, Search } from 'lucide-react';
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
  const [editingLibraryField, setEditingLibraryField] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [isCreateFieldOpen, setIsCreateFieldOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sections, setSections] = useState<FormSectionData[]>([
    { id: 'section1', title: 'Section 1', order: 0 }
  ]);
  const [newField, setNewField] = useState({
    label: '',
    field_type: 'text',
    placeholder: '',
    help_text: '',
    price_modifier: 0,
    affects_pricing: false
  });

  // Fetch field library
  const { data: fieldLibrary, refetch: refetchLibrary } = useSupabaseQuery(
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

  // Initialize sections for existing forms
  useEffect(() => {
    if (formFields && formFields.length > 0) {
      // Check if form already has sections, if not, use default "Section 1"
      const existingSections = Array.from(new Set(formFields.map(f => f.form_section_id).filter(Boolean))) as string[];
      if (existingSections.length === 0) {
        setSections([{ id: 'section1', title: 'Section 1', order: 0 }]);
      } else {
        const sectionsData: FormSectionData[] = existingSections.map((id, index) => ({
          id: id,
          title: `Section ${index + 1}`,
          order: index
        }));
        setSections(sectionsData);
      }
    }
  }, [formFields]);

  // Create new field mutation
  const createFieldMutation = useSupabaseMutation(
    async (fieldData: any) => {
      const name = fieldData.label
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 50) + '_' + Date.now();

      const { data, error } = await supabase
        .from('field_library')
        .insert([{
          name: name,
          label: fieldData.label,
          field_type: fieldData.field_type,
          placeholder: fieldData.placeholder || null,
          help_text: fieldData.help_text || null,
          price_modifier: fieldData.affects_pricing ? fieldData.price_modifier : 0,
          affects_pricing: fieldData.affects_pricing,
          tenant_id: currentTenant?.id,
          active: true
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Field created!',
      onSuccess: () => {
        setIsCreateFieldOpen(false);
        setNewField({
          label: '',
          field_type: 'text',
          placeholder: '',
          help_text: '',
          price_modifier: 0,
          affects_pricing: false
        });
        refetchLibrary();
      }
    }
  );

  // Update library field mutation
  const updateLibraryFieldMutation = useSupabaseMutation(
    async ({ fieldId, updates }: { fieldId: string; updates: any }) => {
      const { error } = await supabase
        .from('field_library')
        .update(updates)
        .eq('id', fieldId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field updated!',
      onSuccess: () => {
        refetchLibrary();
        refetchFields();
      }
    }
  );

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
          form_section_id: sectionId === 'section1' ? sectionId : sectionId,
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
      title: `Section ${sections.length + 1}`,
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
    if (sectionId === 'section1') return;
    
    // Move fields from this section to section1
    const fieldsInSection = formFields?.filter(f => f.form_section_id === sectionId) || [];
    fieldsInSection.forEach(field => {
      updateFieldMutation.mutate({
        fieldId: field.id,
        updates: { form_section_id: 'section1' }
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
            form_section_id: destSection
          })
          .eq('id', draggedField.id);
      }

      // Reorder fields
      const destSectionFields = getFieldsForSection(destSection);
      
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
      }

      refetchFields();
    } else if (type === 'LIBRARY_REORDER') {
      // Reordering library fields - we'll implement this later if needed
    }
  };

  const getFieldsForSection = (sectionId: string) => {
    if (!formFields) return [];
    return formFields
      .filter(field => (field.form_section_id || 'section1') === sectionId)
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

  const renderCreateFieldDialog = () => (
    <Dialog open={isCreateFieldOpen} onOpenChange={setIsCreateFieldOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Field</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Label *</Label>
            <Input
              value={newField.label}
              onChange={(e) => setNewField({ ...newField, label: e.target.value })}
              placeholder="Field label"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={newField.field_type} onValueChange={(value) => setNewField({ ...newField, field_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="textarea">Textarea</SelectItem>
                <SelectItem value="checkbox">Toggle/Checkbox</SelectItem>
                <SelectItem value="select">Select Dropdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Placeholder</Label>
            <Input
              value={newField.placeholder}
              onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
              placeholder="Optional placeholder text"
            />
          </div>
          <div>
            <Label>Help Text</Label>
            <Input
              value={newField.help_text}
              onChange={(e) => setNewField({ ...newField, help_text: e.target.value })}
              placeholder="Optional help text"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={newField.affects_pricing}
              onCheckedChange={(checked) => setNewField({ ...newField, affects_pricing: !!checked })}
            />
            <Label>Affects Pricing</Label>
          </div>
          {newField.affects_pricing && (
            <div>
              <Label>Price (£)</Label>
              <Input
                type="number"
                step="0.01"
                value={newField.price_modifier}
                onChange={(e) => setNewField({ ...newField, price_modifier: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsCreateFieldOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!newField.label.trim()) {
                  toast.error('Field label is required');
                  return;
                }
                createFieldMutation.mutate(newField);
              }} 
              disabled={createFieldMutation.isPending} 
              className="flex-1"
            >
              {createFieldMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderEditFieldDialog = () => {
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

  const renderEditLibraryFieldDialog = () => {
    if (!editingLibraryField) return null;
    
    const field = fieldLibrary?.find(f => f.id === editingLibraryField);
    if (!field) return null;

    return (
      <Dialog open={!!editingLibraryField} onOpenChange={() => setEditingLibraryField(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Library Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input
                value={field.label}
                onChange={(e) => updateLibraryFieldMutation.mutate({
                  fieldId: field.id,
                  updates: { label: e.target.value }
                })}
                placeholder="Field label"
              />
            </div>
            <div>
              <Label>Placeholder</Label>
              <Input
                value={field.placeholder || ''}
                onChange={(e) => updateLibraryFieldMutation.mutate({
                  fieldId: field.id,
                  updates: { placeholder: e.target.value }
                })}
                placeholder="Placeholder text"
              />
            </div>
            <div>
              <Label>Help Text</Label>
              <Textarea
                value={field.help_text || ''}
                onChange={(e) => updateLibraryFieldMutation.mutate({
                  fieldId: field.id,
                  updates: { help_text: e.target.value }
                })}
                placeholder="Help text"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={field.affects_pricing}
                onCheckedChange={(checked) => updateLibraryFieldMutation.mutate({
                  fieldId: field.id,
                  updates: { affects_pricing: !!checked }
                })}
              />
              <Label>Affects Pricing</Label>
            </div>
            {field.affects_pricing && (
              <div>
                <Label>Price (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={field.price_modifier || 0}
                  onChange={(e) => updateLibraryFieldMutation.mutate({
                    fieldId: field.id,
                    updates: { price_modifier: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingLibraryField(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Filter library fields
  const filteredLibraryFields = fieldLibrary?.filter(field => 
    field.label.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-full flex bg-gray-50 dark:bg-gray-900">
        {/* Left Sidebar - Field Library */}
        <div className="w-80 border-r bg-white dark:bg-gray-800 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Field Library</h3>
              <Button onClick={() => setIsCreateFieldOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <Droppable droppableId="field-library" type="LIBRARY_FIELD" isDropDisabled={true}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {filteredLibraryFields.map((field, index) => (
                    <Draggable key={field.id} draggableId={field.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`p-3 border rounded-lg bg-white cursor-grab transition-all animate-fade-in ${
                            snapshot.isDragging 
                              ? 'shadow-lg rotate-2 scale-105 bg-blue-50 border-blue-200' 
                              : 'hover:shadow-md hover:border-blue-200'
                          }`}
                          onClick={() => setEditingLibraryField(field.id)}
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
                  
                  {filteredLibraryFields.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {searchTerm ? 'No fields match your search' : 'No fields available'}
                      </p>
                      <p className="text-xs mt-1">Create your first field to get started</p>
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
                    {previewMode ? 'Preview mode' : 'Drag fields from the library • Click to edit • Smooth animations'}
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
              {sections.length === 0 && !previewMode ? (
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
                <Droppable droppableId="sections" type="SECTION">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-6">
                      {sections.map((section, sectionIndex) => {
                        const sectionFields = getFieldsForSection(section.id);
                        
                        return (
                          <Draggable key={section.id} draggableId={section.id} index={sectionIndex} isDragDisabled={previewMode}>
                            {(provided, snapshot) => (
                              <Card 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`overflow-hidden transition-all animate-fade-in ${
                                  snapshot.isDragging ? 'shadow-lg scale-105' : ''
                                }`}
                              >
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
                                        {!previewMode && (
                                          <div {...provided.dragHandleProps} className="cursor-grab">
                                            <GripVertical className="h-4 w-4 text-gray-400" />
                                          </div>
                                        )}
                                        <CardTitle 
                                          className="cursor-pointer hover:text-blue-600"
                                          onClick={() => !previewMode && setEditingSection(section.id)}
                                        >
                                          {section.title}
                                        </CardTitle>
                                        {!previewMode && section.id !== 'section1' && (
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
                                                className={`p-4 border rounded-lg bg-white transition-all animate-fade-in ${
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
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          </div>
        </div>

        {renderCreateFieldDialog()}
        {renderEditFieldDialog()}
        {renderEditLibraryFieldDialog()}
      </div>
    </DragDropContext>
  );
};