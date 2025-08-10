import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Grip, Plus, Trash2, Edit2 } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FormField {
  id: string;
  name: string;
  field_type: 'text' | 'price_fixed' | 'price_per_person' | 'counter';
  has_notes: boolean;
  has_pricing: boolean;
  pricing_type?: 'fixed' | 'per_person';
  default_price_gbp?: number;
  placeholder_text?: string;
}

interface FormSection {
  id: string;
  title: string;
  order: number;
  field_ids: string[];
}

interface NewFormBuilderProps {
  formId?: string;
  onSave?: () => void;
}

export const NewFormBuilder: React.FC<NewFormBuilderProps> = ({ formId, onSave }) => {
  const { currentTenant } = useAuth();
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [sections, setSections] = useState<FormSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Fetch available fields
  const { data: availableFields = [] } = useSupabaseQuery(
    ['new-form-fields', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('new_form_fields')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  );

  // Fetch form if editing
  const { data: form } = useSupabaseQuery(
    ['new-form', formId],
    async () => {
      if (!formId) return null;
      
      const { data, error } = await supabase
        .from('new_forms')
        .select('*')
        .eq('id', formId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setFormName(data.name);
        setFormDescription(data.description || '');
        // Parse sections from JSON
        const parsedSections = Array.isArray(data.sections) 
          ? data.sections as unknown as FormSection[]
          : [];
        setSections(parsedSections);
      }
      
      return data;
    }
  );

  // Save form mutation
  const saveFormMutation = useSupabaseMutation(
    async (formData: any) => {
      const payload = {
        name: formName,
        description: formDescription,
        sections: sections as any, // Cast to any for JSON compatibility
        tenant_id: currentTenant?.id,
        is_active: true
      };

      if (formId) {
        const { data, error } = await supabase
          .from('new_forms')
          .update(payload)
          .eq('id', formId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('new_forms')
          .insert(payload)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    {
      onSuccess: () => {
        toast.success('Form saved successfully');
        onSave?.();
      },
      onError: (error) => {
        toast.error('Failed to save form: ' + error.message);
      }
    }
  );

  const addSection = () => {
    const newSection: FormSection = {
      id: crypto.randomUUID(),
      title: 'New Section',
      order: sections.length,
      field_ids: []
    };
    setSections([...sections, newSection]);
    setSelectedSection(newSection.id);
  };

  const addFieldToSection = (fieldId: string, sectionId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, field_ids: [...section.field_ids, fieldId] }
        : section
    ));
  };

  const removeFieldFromSection = (fieldId: string, sectionId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, field_ids: section.field_ids.filter(id => id !== fieldId) }
        : section
    ));
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    if (source.droppableId === 'fields' && destination.droppableId.startsWith('section-')) {
      const sectionId = destination.droppableId.replace('section-', '');
      const fieldId = result.draggableId;
      addFieldToSection(fieldId, sectionId);
    }
  };

  const getFieldById = (fieldId: string): FormField | undefined => {
    return availableFields.find(field => field.id === fieldId);
  };

  const renderField = (field: FormField, sectionId: string) => (
    <div key={field.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
      <div className="flex-1">
        <div className="font-medium">{field.name}</div>
        <div className="text-sm text-muted-foreground">
          {field.field_type} {field.has_pricing && `• £${field.default_price_gbp || 0}`}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => removeFieldFromSection(field.id, sectionId)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="h-full flex">
      <DragDropContext onDragEnd={onDragEnd}>
        {/* Field Library Sidebar */}
        <div className="w-80 border-r bg-background p-6 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Field Library</h3>
              <Droppable droppableId="fields">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {availableFields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="p-3 bg-card border rounded-lg cursor-grab hover:shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Grip className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{field.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {field.field_type}
                                  {field.has_pricing && ` • £${field.default_price_gbp || 0}`}
                                </div>
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
            </div>
          </div>
        </div>

        {/* Main Form Builder */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Form Header */}
            <Card>
              <CardHeader>
                <CardTitle>Form Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Form Name</label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Asian Wedding Package"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe this form..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Form Sections */}
            <div className="space-y-4">
              {sections.map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Input
                        value={section.title}
                        onChange={(e) => {
                          setSections(sections.map(s => 
                            s.id === section.id ? { ...s, title: e.target.value } : s
                          ));
                        }}
                        className="text-lg font-semibold border-none p-0 h-auto"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSections(sections.filter(s => s.id !== section.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Droppable droppableId={`section-${section.id}`}>
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="min-h-[100px] p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg space-y-2"
                        >
                          {section.field_ids.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              Drag fields here from the library
                            </div>
                          ) : (
                            section.field_ids.map((fieldId) => {
                              const field = getFieldById(fieldId);
                              return field ? renderField(field, section.id) : null;
                            })
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              ))}

              <Button onClick={addSection} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>

            {/* Save Button */}
            <div className="flex justify-end space-x-2">
              <Button 
                onClick={() => saveFormMutation.mutate({})}
                disabled={!formName.trim() || saveFormMutation.isPending}
              >
                {saveFormMutation.isPending ? 'Saving...' : 'Save Form'}
              </Button>
            </div>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};