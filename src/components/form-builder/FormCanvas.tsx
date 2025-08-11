import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Settings, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormSection } from '@/hooks/useForms';
import { FormField } from '@/hooks/useFormFields';

interface FormCanvasProps {
  sections: FormSection[];
  fields: FormField[];
  onSectionsChange: (sections: FormSection[]) => void;
  onDragEnd: (result: DropResult) => void;
}

export const FormCanvas: React.FC<FormCanvasProps> = ({
  sections,
  fields,
  onSectionsChange,
  onDragEnd
}) => {
  const addSection = () => {
    const newSection: FormSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      order: sections.length,
      field_ids: []
    };
    onSectionsChange([...sections, newSection]);
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    const updatedSections = sections.map(section =>
      section.id === sectionId ? { ...section, title } : section
    );
    onSectionsChange(updatedSections);
  };

  const removeSection = (sectionId: string) => {
    if (window.confirm('Are you sure you want to delete this section? All fields in it will be removed.')) {
      const updatedSections = sections.filter(section => section.id !== sectionId);
      onSectionsChange(updatedSections);
    }
  };

  const removeFieldFromSection = (sectionId: string, fieldId: string) => {
    const updatedSections = sections.map(section =>
      section.id === sectionId
        ? { ...section, field_ids: section.field_ids.filter(id => id !== fieldId) }
        : section
    );
    onSectionsChange(updatedSections);
  };

  const getFieldById = (fieldId: string) => fields.find(f => f.id === fieldId);

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return '📝';
      case 'counter': return '🔢';
      case 'price_fixed': return '💰';
      case 'price_per_person': return '👥';
      default: return '📋';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {sections.map((section, index) => (
        <Card key={section.id} className="border-2 border-dashed border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{section.title === 'New Section' ? '📋' : '👥'}</span>
              <Input
                value={section.title}
                onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                className="text-lg font-semibold border-none p-0 h-auto bg-transparent focus-visible:ring-0"
                placeholder="Section Title"
              />
              <div className="ml-auto flex gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeSection(section.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Droppable droppableId={`section-${section.id}`} type="field">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[100px] space-y-2 p-3 rounded-lg border-2 border-dashed transition-colors ${
                    snapshot.isDraggingOver 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  {section.field_ids.map((fieldId, fieldIndex) => {
                    const field = getFieldById(fieldId);
                    if (!field) return null;

                    return (
                      <Draggable key={fieldId} draggableId={fieldId} index={fieldIndex}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-white p-3 rounded-lg border flex items-center gap-3 group ${
                              snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-sm'
                            }`}
                          >
                            <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-600">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <span className="text-lg">{getFieldIcon(field.field_type)}</span>
                            <div className="flex-1">
                              <div className="font-medium">{field.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {field.field_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                {field.unit_price && ` • £${field.unit_price}`}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFieldFromSection(section.id, fieldId)}
                              className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  {section.field_ids.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      Drag fields here from the library
                    </div>
                  )}
                </div>
              )}
            </Droppable>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => {/* Add field logic */}}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        size="lg"
        onClick={addSection}
        className="w-full h-16 border-2 border-dashed"
      >
        <Plus className="h-5 w-5 mr-2" />
        Add New Section
      </Button>
    </div>
  );
};