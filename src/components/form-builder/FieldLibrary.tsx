import React, { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Search, Plus, FileText, Calculator, Hash, Trash2, Edit, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFormFields, FormField } from '@/hooks/useFormFields';
import { useNavigate } from 'react-router-dom';

interface FieldLibraryProps {
  onFieldDrag?: (field: FormField) => void;
  showCreateButton?: boolean;
}

export const FieldLibrary: React.FC<FieldLibraryProps> = ({ 
  onFieldDrag, 
  showCreateButton = true 
}) => {
  const { fieldsByCategory, deleteField, isDeleting } = useFormFields();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return <FileText className="h-4 w-4" />;
      case 'counter': return <Hash className="h-4 w-4" />;
      default: return <Calculator className="h-4 w-4" />;
    }
  };

  const filteredFields = Object.entries(fieldsByCategory || {}).reduce((acc, [category, fields]) => {
    if (Array.isArray(fields)) {
      const filtered = fields.filter(field =>
        field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.help_text?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
    }
    return acc;
  }, {} as Record<string, FormField[]>);

  const handleDeleteField = async (fieldId: string) => {
    if (window.confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
      deleteField(fieldId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold">Field Library</h3>
          {showCreateButton && (
            <Button
              size="sm"
              onClick={() => navigate('/field-edit', { 
                state: { from: window.location.pathname } 
              })}
              className="ml-auto"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Field
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Droppable droppableId="field-types" type="field-type" isDropDisabled={true}>
        {(provided) => (
          <div 
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {(() => {
              let globalIndex = 0;
              return Object.entries(filteredFields).map(([category, fields]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    {category === 'Text Fields' && <FileText className="h-4 w-4" />}
                    {category === 'Counter Fields' && <Hash className="h-4 w-4" />}
                    {category === 'Pricing Fields' && <Calculator className="h-4 w-4" />}
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {fields.map((field) => (
                    <Draggable key={field.id} draggableId={field.id} index={globalIndex++}>
                      {(provided, snapshot) => (
                        <Card 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`cursor-move hover:shadow-md transition-shadow group ${
                            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                          }`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div {...provided.dragHandleProps} className="mr-2 mt-1">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {getFieldIcon(field.field_type)}
                                  <span className="font-medium text-sm truncate">{field.name}</span>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span>Type: {field.field_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                    {field.has_pricing && field.default_price_gbp && (
                                      <span>£{field.default_price_gbp}</span>
                                    )}
                                  </div>
                                  {field.help_text && (
                                    <p className="text-xs truncate">{field.help_text}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/field-edit/${field.id}`, { 
                                      state: { from: window.location.pathname } 
                                    });
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteField(field.id);
                                  }}
                                  disabled={isDeleting}
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                </div>
              </div>
            ));
            })()}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {Object.keys(filteredFields).length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? 'No fields match your search.' : 'No fields available. Create your first field!'}
        </div>
      )}

    </div>

  );
};