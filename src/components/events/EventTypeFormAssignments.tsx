import React, { useState } from 'react';
import { Plus, X, Edit2, GripVertical, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEventTypeFormMappings } from '@/hooks/useEventTypeFormMappings';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EventTypeFormAssignmentsProps {
  eventTypeConfig: {
    id: string;
    event_type: string;
    display_name: string;
  };
}

export const EventTypeFormAssignments: React.FC<EventTypeFormAssignmentsProps> = ({
  eventTypeConfig
}) => {
  const { currentTenant } = useAuth();
  const [isAddingForm, setIsAddingForm] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [defaultLabel, setDefaultLabel] = useState('');
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const { mappings, addMapping, removeMapping, updateMapping, isLoading } = useEventTypeFormMappings(eventTypeConfig.id);

  // Fetch available form templates
  const { data: formTemplates = [] } = useSupabaseQuery(
    ['form-templates-for-assignment'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('forms')
        .select('id, name, description')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  );

  // Filter out already assigned forms
  const availableForms = formTemplates.filter(
    form => !mappings?.some(mapping => mapping.form_template_id === form.id)
  );

  const handleAddForm = () => {
    if (!selectedFormId || !defaultLabel.trim()) return;
    
    addMapping({ 
      formTemplateId: selectedFormId, 
      defaultLabel: defaultLabel.trim() 
    });
    
    setSelectedFormId('');
    setDefaultLabel('');
    setIsAddingForm(false);
  };

  const handleSaveEdit = (mappingId: string) => {
    if (!editingLabel.trim()) return;
    
    updateMapping({ 
      mappingId, 
      updates: { default_label: editingLabel.trim() } 
    });
    
    setEditingMapping(null);
    setEditingLabel('');
  };

  const startEdit = (mapping: any) => {
    setEditingMapping(mapping.id);
    setEditingLabel(mapping.default_label);
  };

  const cancelEdit = () => {
    setEditingMapping(null);
    setEditingLabel('');
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Default Forms for "{eventTypeConfig.display_name}"
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mappings && mappings.length > 0 ? (
          <div className="space-y-2">
            {mappings.map((mapping) => (
              <div key={mapping.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {mapping.form_templates?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Label: {editingMapping === mapping.id ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          placeholder="Enter label"
                          className="h-6 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleSaveEdit(mapping.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={cancelEdit}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      mapping.default_label
                    )}
                  </div>
                </div>

                <Badge variant="secondary" className="text-xs">
                  #{mapping.sort_order}
                </Badge>

                {editingMapping !== mapping.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => startEdit(mapping)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => removeMapping(mapping.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            No forms assigned to this event type
          </div>
        )}

        {isAddingForm ? (
          <div className="space-y-2 p-3 border rounded-lg bg-background">
            <Select value={selectedFormId} onValueChange={setSelectedFormId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a form template" />
              </SelectTrigger>
              <SelectContent>
                {availableForms.map((form) => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Default label for this form"
              value={defaultLabel}
              onChange={(e) => setDefaultLabel(e.target.value)}
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddForm}
                disabled={!selectedFormId || !defaultLabel.trim() || isLoading}
              >
                Add Form
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddingForm(false);
                  setSelectedFormId('');
                  setDefaultLabel('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddingForm(true)}
            disabled={availableForms.length === 0}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {availableForms.length === 0 ? 'No more forms available' : 'Assign Form'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};