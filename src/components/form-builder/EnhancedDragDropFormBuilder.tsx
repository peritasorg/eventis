import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Edit3, Trash2, Eye, Plus, FolderPlus, Check, X, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  category?: string;
  options?: any;
  active: boolean;
}

interface FormFieldInstance {
  id: string;
  field_library_id: string;
  field_order: number;
  form_section_id?: string;
  label_override?: string;
  field_library: FieldLibraryItem;
}

interface FormSectionData {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export const EnhancedDragDropFormBuilder: React.FC<EnhancedDragDropFormBuilderProps> = ({ form, onBack }) => {
  const { currentTenant } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingLibraryField, setEditingLibraryField] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [isCreateFieldOpen, setIsCreateFieldOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sections, setSections] = useState<FormSectionData[]>([]);
  const [newField, setNewField] = useState(() => ({
    label: '',
    field_type: 'text',
    category: '',
    options: [] as string[],
    toggle_true_value: 'Yes',
    toggle_false_value: 'No'
  }));

  // Fetch field categories
  const { data: fieldCategories } = useSupabaseQuery(
    ['field-categories'],
    async () => {
      try {
        const response = await fetch(`https://vbowtpkisiabdwwgttry.supabase.co/rest/v1/field_categories?active=eq.true&order=sort_order.asc`, {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZib3d0cGtpc2lhYmR3d2d0dHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTY0MDUsImV4cCI6MjA2NTkzMjQwNX0.g-2yp1SgMTYA9doXALsPRO0dMJX4sE7Ol1DNBIymSFU',
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    }
  );

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

  // Fetch form pages first, then sections
  const { data: formPages } = useSupabaseQuery(
    ['form-pages', form.id],
    async () => {
      if (!form.id || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_pages')
        .select('*')
        .eq('form_template_id', form.id)
        .eq('tenant_id', currentTenant.id)
        .order('page_number');
      
      if (error) throw error;
      
      // If no pages exist, create the first one
      if (!data || data.length === 0) {
        const { data: newPage, error: createError } = await supabase
          .from('form_pages')
          .insert([{
            form_template_id: form.id,
            tenant_id: currentTenant.id,
            page_title: 'Page 1',
            page_number: 1
          }])
          .select()
          .single();
        
        if (createError) throw createError;
        return [newPage];
      }
      
      return data || [];
    }
  );

  // Fetch form sections for the first page
  const { data: formSections, refetch: refetchSections } = useSupabaseQuery(
    ['form-sections', formPages?.[0]?.id],
    async () => {
      if (!formPages?.[0]?.id || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_sections')
        .select('*')
        .eq('form_page_id', formPages[0].id)
        .eq('tenant_id', currentTenant.id)
        .order('section_order');
      
      if (error) throw error;
      
      // If no sections exist, create the first one
      if (!data || data.length === 0) {
        const { data: newSection, error: createError } = await supabase
          .from('form_sections')
          .insert([{
            form_page_id: formPages[0].id,
            tenant_id: currentTenant.id,
            section_title: 'Section 1',
            section_order: 0
          }])
          .select()
          .single();
        
        if (createError) throw createError;
        return [newSection];
      }
      
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

  // Initialize sections from database
  useEffect(() => {
    if (formSections && formSections.length > 0) {
      const sectionsData: FormSectionData[] = formSections.map((section) => ({
        id: section.id,
        title: section.section_title || 'Untitled Section',
        description: section.section_description,
        order: section.section_order
      }));
      setSections(sectionsData);
    }
  }, [formSections]);

  // Delete field from library mutation
  const deleteFieldMutation = useSupabaseMutation(
    async (fieldId: string) => {
      const { error } = await supabase
        .from('field_library')
        .update({ active: false })
        .eq('id', fieldId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field deleted!',
      onSuccess: () => {
        refetchLibrary();
        setEditingLibraryField(null);
      }
    }
  );

  // Create new field mutation
  const createFieldMutation = useSupabaseMutation(
    async (fieldData: any) => {
      const name = fieldData.label
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 50) + '_' + Date.now();

      let options = null;
      if (fieldData.field_type === 'dropdown' && fieldData.options.length > 0) {
        options = fieldData.options.filter((opt: string) => opt.trim());
      } else if (fieldData.field_type === 'toggle') {
        options = {
          true_value: fieldData.toggle_true_value,
          false_value: fieldData.toggle_false_value
        };
      }

      const { data, error } = await supabase
        .from('field_library')
        .insert([{
          name: name,
          label: fieldData.label,
          field_type: fieldData.field_type,
          category: fieldData.category || null,
          options: options,
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
          category: '',
          options: [],
          toggle_true_value: 'Yes',
          toggle_false_value: 'No'
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
        setEditingLibraryField(null);
      }
    }
  );

  // Update section title mutation
  const updateSectionMutation = useSupabaseMutation(
    async ({ sectionId, title }: { sectionId: string; title: string }) => {
      const { error } = await supabase
        .from('form_sections')
        .update({ section_title: title })
        .eq('id', sectionId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Section updated!',
      onSuccess: () => {
        refetchSections();
        setEditingSection(null);
      }
    }
  );

  // Add field to form mutation - FIX UUID ISSUE
  const addFieldMutation = useSupabaseMutation(
    async ({ fieldLibraryId, sectionId }: { fieldLibraryId: string; sectionId?: string }) => {
      const maxOrder = Math.max(...(formFields?.map(f => f.field_order) || [0]), 0) + 1;
      
      // Use the first section if no sectionId provided
      const targetSectionId = sectionId || (sections.length > 0 ? sections[0].id : null);
      
      if (!targetSectionId) {
        throw new Error('No section available');
      }
      
      const { error } = await supabase
        .from('form_field_instances')
        .insert([{
          form_template_id: form.id,
          field_library_id: fieldLibraryId,
          field_order: maxOrder,
          form_section_id: targetSectionId,
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

  // Add new section mutation
  const addSectionMutation = useSupabaseMutation(
    async (data: any) => {
      const maxOrder = Math.max(...(sections.map(s => s.order) || [0]), 0) + 1;
      
      const { data: result, error } = await supabase
        .from('form_sections')
        .insert([{
          form_template_id: form.id,
          tenant_id: currentTenant?.id,
          section_title: `Section ${sections.length + 1}`,
          section_order: maxOrder
        }])
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    {
      successMessage: 'Section added!',
      onSuccess: refetchSections
    }
  );

  const updateSection = (sectionId: string, title: string) => {
    updateSectionMutation.mutate({ sectionId, title });
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'FORM_FIELD') {
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

      // Reorder fields within the destination section
      const destSectionFields = sourceSection === destSection 
        ? sourceSectionFields 
        : getFieldsForSection(destSection);
      
      const reorderedFields: FormFieldInstance[] = Array.from(destSectionFields);
      
      if (sourceSection === destSection) {
        // Same section - just reorder
        const [removed] = reorderedFields.splice(source.index, 1);
        if (removed) {
          reorderedFields.splice(destination.index, 0, removed);
        }
      } else {
        // Different sections - insert at destination
        reorderedFields.splice(destination.index, 0, draggedField);
      }
      
      // Update field orders for the destination section
      for (let i = 0; i < reorderedFields.length; i++) {
        await supabase
          .from('form_field_instances')
          .update({ field_order: i + 1 })
          .eq('id', reorderedFields[i].id);
      }

      refetchFields();
    }
  };

  const getFieldsForSection = (sectionId: string) => {
    if (!formFields) return [];
    return formFields
      .filter(field => field.form_section_id === sectionId)
      .sort((a, b) => a.field_order - b.field_order);
  };

  const renderFieldPreview = (fieldInstance: FormFieldInstance) => {
    const field = fieldInstance.field_library;
    if (!field) return null;

    const label = fieldInstance.label_override || field.label;

    switch (field.field_type) {
      case 'text':
        return (
          <div>
            <Label className="text-sm font-medium">{label}</Label>
            <Input placeholder={`Enter ${label.toLowerCase()}`} disabled />
          </div>
        );
      case 'dropdown':
        return (
          <div>
            <Label className="text-sm font-medium">{label}</Label>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
            </Select>
          </div>
        );
      case 'toggle':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox disabled />
            <Label className="text-sm font-medium">{label}</Label>
          </div>
        );
      default:
        return (
          <div>
            <Label className="text-sm font-medium">{label}</Label>
            <Input placeholder="Enter value" disabled />
          </div>
        );
    }
  };

  // Helper functions for create field dialog
  const addOption = () => {
    setNewField({
      ...newField,
      options: [...newField.options, '']
    });
  };

  const updateOption = (index: number, value: string) => {
    const updatedOptions = [...newField.options];
    updatedOptions[index] = value;
    setNewField({
      ...newField,
      options: updatedOptions
    });
  };

  const removeOption = (index: number) => {
    setNewField({
      ...newField,
      options: newField.options.filter((_, i) => i !== index)
    });
  };

  // Reset form when dialog opens/closes
  const resetNewFieldForm = () => {
    setNewField({
      label: '',
      field_type: 'text',
      category: '',
      options: [],
      toggle_true_value: 'Yes',
      toggle_false_value: 'No'
    });
  };

  // Create Field Dialog Component
  const CreateFieldDialog = () => (
    <Dialog 
      open={isCreateFieldOpen} 
      onOpenChange={(open) => {
        setIsCreateFieldOpen(open);
        if (!open) resetNewFieldForm();
      }}
    >
      <DialogContent className="max-w-lg">
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
                <SelectItem value="toggle">Toggle</SelectItem>
                <SelectItem value="dropdown">Dropdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Category</Label>
            <Select value={newField.category} onValueChange={(value) => setNewField({ ...newField, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Category</SelectItem>
                {fieldCategories?.map((category: any) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newField.field_type === 'dropdown' && (
            <div>
              <Label>Options</Label>
              <div className="space-y-2">
                {newField.options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {newField.field_type === 'toggle' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>True Value</Label>
                <Input
                  value={newField.toggle_true_value}
                  onChange={(e) => setNewField({ ...newField, toggle_true_value: e.target.value })}
                  placeholder="Yes"
                />
              </div>
              <div>
                <Label>False Value</Label>
                <Input
                  value={newField.toggle_false_value}
                  onChange={(e) => setNewField({ ...newField, toggle_false_value: e.target.value })}
                  placeholder="No"
                />
              </div>
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

  // Edit Library Field Dialog Component
  const EditLibraryFieldDialog = () => {
    if (!editingLibraryField) return null;
    
    const field = fieldLibrary?.find(f => f.id === editingLibraryField);
    if (!field) return null;

    const [editData, setEditData] = useState({
      label: field.label,
      category: field.category || '',
      options: Array.isArray(field.options) ? field.options : [],
      toggle_true_value: field.options?.true_value || 'Yes',
      toggle_false_value: field.options?.false_value || 'No'
    });

    const updateEditOption = (index: number, value: string) => {
      const updatedOptions = [...editData.options];
      updatedOptions[index] = value;
      setEditData({ ...editData, options: updatedOptions });
    };

    const addEditOption = () => {
      setEditData({
        ...editData,
        options: [...editData.options, '']
      });
    };

    const removeEditOption = (index: number) => {
      setEditData({
        ...editData,
        options: editData.options.filter((_, i) => i !== index)
      });
    };

    const handleSave = () => {
      let options = null;
      if (field.field_type === 'dropdown' && editData.options.length > 0) {
        options = editData.options.filter((opt: string) => opt.trim());
      } else if (field.field_type === 'toggle') {
        options = {
          true_value: editData.toggle_true_value,
          false_value: editData.toggle_false_value
        };
      }

      updateLibraryFieldMutation.mutate({
        fieldId: field.id,
        updates: {
          label: editData.label,
          category: editData.category || null,
          options: options
        }
      });
    };

    const handleDelete = () => {
      if (confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
        deleteFieldMutation.mutate(field.id);
      }
    };

    return (
      <Dialog open={!!editingLibraryField} onOpenChange={() => setEditingLibraryField(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Library Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input
                value={editData.label}
                onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                placeholder="Field label"
              />
            </div>

            <div>
              <Label>Type</Label>
              <Input value={field.field_type} disabled className="capitalize" />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={editData.category} onValueChange={(value) => setEditData({ ...editData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {fieldCategories?.map((category: any) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {field.field_type === 'dropdown' && (
              <div>
                <Label>Options</Label>
                <div className="space-y-2">
                  {editData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateEditOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeEditOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addEditOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            {field.field_type === 'toggle' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>True Value</Label>
                  <Input
                    value={editData.toggle_true_value}
                    onChange={(e) => setEditData({ ...editData, toggle_true_value: e.target.value })}
                    placeholder="Yes"
                  />
                </div>
                <div>
                  <Label>False Value</Label>
                  <Input
                    value={editData.toggle_false_value}
                    onChange={(e) => setEditData({ ...editData, toggle_false_value: e.target.value })}
                    placeholder="No"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={deleteFieldMutation.isPending}
                className="mr-auto"
              >
                {deleteFieldMutation.isPending ? 'Deleting...' : 'Delete Field'}
              </Button>
              <Button variant="outline" onClick={() => setEditingLibraryField(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateLibraryFieldMutation.isPending} className="flex-1">
                {updateLibraryFieldMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Edit Field Dialog Component
  const EditFieldDialog = () => {
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
            <div className="space-y-2">
              {filteredLibraryFields.map((field) => (
                <div key={field.id} className="p-3 border rounded-lg bg-white transition-all animate-fade-in hover:shadow-md hover:border-blue-200">
                  <div className="flex items-center justify-between gap-2">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setEditingLibraryField(field.id)}
                    >
                      <div className="font-medium text-sm">{field.label}</div>
                      <div className="text-xs text-gray-500 capitalize">{field.field_type}</div>
                      {field.category && (
                        <div className="text-xs text-blue-600 mt-1">
                          {fieldCategories?.find((cat: any) => cat.name === field.category)?.display_name || field.category}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        addFieldMutation.mutate({
                          fieldLibraryId: field.id
                        });
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
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
                    {previewMode ? 'Preview mode' : 'Click + to add fields • Drag to reorder • Click field names to edit'}
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
                  <Button onClick={() => addSectionMutation.mutate({})} variant="outline" size="sm">
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
              <div className="space-y-6">
                {sections.map((section, sectionIndex) => {
                  const sectionFields = getFieldsForSection(section.id);
                  
                  return (
                    <Card key={section.id} className="overflow-hidden transition-all animate-fade-in">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          {editingSection === section.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={section.title}
                                onChange={(e) => setSections(sections.map(s => 
                                  s.id === section.id ? { ...s, title: e.target.value } : s
                                ))}
                                className="h-8"
                                autoFocus
                                onBlur={() => updateSection(section.id, section.title)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') updateSection(section.id, section.title);
                                  if (e.key === 'Escape') setEditingSection(null);
                                }}
                              />
                              <Button size="sm" variant="ghost" onClick={() => updateSection(section.id, section.title)}>
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
                                  <p className="text-sm">Drop fields here or use + buttons in the library</p>
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
            </div>
          </div>
        </div>

        <CreateFieldDialog />
        <EditFieldDialog />
        <EditLibraryFieldDialog />
      </div>
    </DragDropContext>
  );
};