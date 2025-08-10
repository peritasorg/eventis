import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldLibrary } from '@/components/form-builder/FieldLibrary';
import { FormCanvas } from '@/components/form-builder/FormCanvas';
import { FormPreview } from '@/components/form-builder/FormPreview';
import { useFormFields, FormField } from '@/hooks/useFormFields';
import { useForms, Form, FormSection } from '@/hooks/useForms';
import { toast } from 'sonner';
import { DropResult } from '@hello-pangea/dnd';

export const FormBuilder = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  const { formFields } = useFormFields();
  const { forms, createForm, updateForm, isCreating, isUpdating } = useForms();
  
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    sections: FormSection[];
  }>({
    name: '',
    description: '',
    sections: []
  });
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const currentForm = forms.find(f => f.id === formId);
  
  useEffect(() => {
    if (formId && currentForm) {
      setFormData({
        name: currentForm.name,
        description: currentForm.description || '',
        sections: currentForm.sections || []
      });
    } else if (!formId) {
      // New form - create default section
      setFormData({
        name: '',
        description: '',
        sections: [{
          id: 'section-1',
          title: 'Guest Information',
          order: 0,
          field_ids: []
        }]
      });
    }
  }, [formId, currentForm]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a form name');
      return;
    }

    setIsSaving(true);
    try {
      if (formId) {
        await updateForm({
          id: formId,
          ...formData
        });
        toast.success('Form updated successfully');
      } else {
        const newForm = await createForm(formData);
        navigate(`/form-builder/${newForm.id}`);
        toast.success('Form created successfully');
      }
    } catch (error) {
      console.error('Failed to save form:', error);
      toast.error('Failed to save form');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    
    if (!destination) return;
    
    // Handle drag from library to section
    if (source.droppableId === 'field-library') {
      const draggedField = formFields.find(f => f.id === result.draggableId);
      if (!draggedField) return;
      
      const targetSectionId = destination.droppableId.replace('section-', '');
      const updatedSections = formData.sections.map(section => {
        if (section.id === targetSectionId) {
          const newFieldIds = [...section.field_ids];
          newFieldIds.splice(destination.index, 0, draggedField.id);
          return { ...section, field_ids: newFieldIds };
        }
        return section;
      });
      
      setFormData(prev => ({ ...prev, sections: updatedSections }));
      return;
    }

    // Handle reordering within a section
    if (source.droppableId === destination.droppableId) {
      const sectionId = source.droppableId.replace('section-', '');
      const updatedSections = formData.sections.map(section => {
        if (section.id === sectionId) {
          const newFieldIds = [...section.field_ids];
          const [removed] = newFieldIds.splice(source.index, 1);
          newFieldIds.splice(destination.index, 0, removed);
          return { ...section, field_ids: newFieldIds };
        }
        return section;
      });
      
      setFormData(prev => ({ ...prev, sections: updatedSections }));
    }
  };

  const handleFieldDrag = (field: FormField) => {
    // This is handled by the drag and drop context
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/forms')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Button>
          <div className="flex-1">
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Form Name"
              className="text-lg font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isCreating || isUpdating}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        
        <div className="mt-2">
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Form description (optional)"
            rows={2}
            className="resize-none border-none bg-transparent p-0 focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Field Library Sidebar */}
        <div className="w-80 border-r bg-muted/50">
          <FieldLibrary onFieldDrag={handleFieldDrag} />
        </div>

        {/* Form Canvas */}
        <div className="flex-1">
          <FormCanvas
            sections={formData.sections}
            fields={formFields}
            onSectionsChange={(sections) => setFormData(prev => ({ ...prev, sections }))}
            onDragEnd={handleDragEnd}
          />
        </div>
      </div>

      {/* Preview Modal */}
      <FormPreview
        formName={formData.name || 'Untitled Form'}
        sections={formData.sections}
        fields={formFields}
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};