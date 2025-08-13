
import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Edit3, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface FormSectionProps {
  section: {
    id: string;
    title: string;
    description?: string;
    collapsed?: boolean;
  };
  fields: any[];
  editingField: string | null;
  previewMode: boolean;
  onEditField: (fieldId: string | null) => void;
  onRemoveField: (fieldId: string) => void;
  onUpdateField: (fieldId: string, updates: any) => void;
  onUpdateSection: (sectionId: string, updates: any) => void;
  onRemoveSection: (sectionId: string) => void;
  renderFieldPreview: (fieldInstance: any) => React.ReactNode;
  sectionIndex: number;
}

export const FormSection: React.FC<FormSectionProps> = ({
  section,
  fields,
  editingField,
  previewMode,
  onEditField,
  onRemoveField,
  onUpdateField,
  onUpdateSection,
  onRemoveSection,
  renderFieldPreview,
  sectionIndex,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(section.title);
  const [isCollapsed, setIsCollapsed] = useState(section.collapsed || false);

  const handleTitleSave = () => {
    onUpdateSection(section.id, { title: tempTitle });
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTempTitle(section.title);
    setIsEditingTitle(false);
  };

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onUpdateSection(section.id, { collapsed: newCollapsed });
  };

  return (
    <Card className="mb-6">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-6 w-6 p-0"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSave();
                    if (e.key === 'Escape') handleTitleCancel();
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={handleTitleSave} className="h-6 text-xs">
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleTitleCancel} className="h-6 text-xs">
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex-1">
                <h3 
                  className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                  onClick={() => !previewMode && setIsEditingTitle(true)}
                >
                  {section.title}
                </h3>
                {section.description && (
                  <p className="text-sm text-gray-600">{section.description}</p>
                )}
              </div>
            )}
          </div>
          
          {!previewMode && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingTitle(true)}
                className="h-7 w-7 p-0"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveSection(section.id)}
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <CardContent className="p-4">
          <Droppable droppableId={`section-${section.id}`} type="FIELD">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-4 min-h-16 p-4 rounded-lg transition-colors ${
                  snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : 'bg-gray-50'
                }`}
              >
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Drop fields here or add from the library</p>
                  </div>
                ) : (
                  fields.map((fieldInstance, index) => (
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
                          className={`group relative ${
                            snapshot.isDragging ? 'z-50' : ''
                          }`}
                        >
                          <Card className={`transition-all duration-200 ${
                            snapshot.isDragging 
                              ? 'shadow-xl rotate-1 scale-105' 
                              : 'hover:shadow-md'
                          } ${
                            editingField === fieldInstance.id 
                              ? 'ring-2 ring-blue-500 bg-blue-50' 
                              : 'bg-white'
                          }`}>
                            <CardContent className="p-4">
                              {!previewMode && (
                                <div className="flex items-center justify-between mb-3">
                                  <div 
                                    {...provided.dragHandleProps}
                                    className="flex items-center gap-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                     <span className="text-xs font-medium">
                                       {fieldInstance.name || fieldInstance.label}
                                     </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onEditField(
                                        editingField === fieldInstance.id ? null : fieldInstance.id
                                      )}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onRemoveField(fieldInstance.id)}
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                              
                              {editingField === fieldInstance.id ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-xs">Custom Label</Label>
                                      <Input
                                         defaultValue={fieldInstance.label_override || ''}
                                         placeholder={fieldInstance.name || fieldInstance.label}
                                         className="h-8 text-sm"
                                        onBlur={(e) => {
                                          if (e.target.value !== fieldInstance.label_override) {
                                            onUpdateField(fieldInstance.id, {
                                              label_override: e.target.value || null
                                            });
                                          }
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Placeholder</Label>
                                      <Input
                                         defaultValue={fieldInstance.placeholder_override || ''}
                                         placeholder={fieldInstance.placeholder_text}
                                         className="h-8 text-sm"
                                        onBlur={(e) => {
                                          if (e.target.value !== fieldInstance.placeholder_override) {
                                            onUpdateField(fieldInstance.id, {
                                              placeholder_override: e.target.value || null
                                            });
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        checked={fieldInstance.required_override ?? true}
                                        onCheckedChange={(checked) => {
                                          onUpdateField(fieldInstance.id, {
                                            required_override: checked
                                          });
                                        }}
                                      />
                                      <Label className="text-xs">Required</Label>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => onEditField(null)}
                                      className="h-7"
                                    >
                                      Done
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  {renderFieldPreview(fieldInstance)}
                                </div>
                              )}
                            </CardContent>
                          </Card>
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
      )}
    </Card>
  );
};
