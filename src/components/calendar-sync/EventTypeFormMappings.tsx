import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const EventTypeFormMappings = () => {
  const { currentTenant } = useAuth();
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: eventTypes } = useSupabaseQuery(
    ['event-type-configs-for-mappings'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_type_configs')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  );

  const { data: formTemplates } = useSupabaseQuery(
    ['form-templates-for-mappings'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  );

  const { data: mappings, refetch } = useSupabaseQuery(
    ['event-type-form-mappings', selectedEventType],
    async () => {
      if (!currentTenant?.id || !selectedEventType) return [];
      
      const { data, error } = await supabase
        .from('event_type_form_mappings')
        .select(`
          *,
          form_templates (
            id,
            name,
            description
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('event_type_config_id', selectedEventType)
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  );

  const addMappingMutation = useSupabaseMutation(
    async ({ formTemplateId, defaultLabel }: { formTemplateId: string; defaultLabel: string }) => {
      if (!currentTenant?.id || !selectedEventType) throw new Error('Missing required data');
      
      const { data, error } = await supabase
        .from('event_type_form_mappings')
        .insert({
          tenant_id: currentTenant.id,
          event_type_config_id: selectedEventType,
          form_template_id: formTemplateId,
          default_label: defaultLabel,
          auto_assign: true,
          sort_order: mappings?.length || 0
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Form mapping added successfully!',
      invalidateQueries: [['event-type-form-mappings', selectedEventType]]
    }
  );

  const removeMappingMutation = useSupabaseMutation(
    async (mappingId: string) => {
      const { error } = await supabase
        .from('event_type_form_mappings')
        .delete()
        .eq('id', mappingId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Form mapping removed successfully!',
      invalidateQueries: [['event-type-form-mappings', selectedEventType]]
    }
  );

  const updateMappingMutation = useSupabaseMutation(
    async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('event_type_form_mappings')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    {
      successMessage: 'Form mapping updated successfully!',
      invalidateQueries: [['event-type-form-mappings', selectedEventType]]
    }
  );

  const handleAddMapping = async (formData: FormData) => {
    const formTemplateId = formData.get('form_template_id') as string;
    const defaultLabel = formData.get('default_label') as string;

    await addMappingMutation.mutateAsync({ formTemplateId, defaultLabel });
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Form Assignments by Event Type</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Select Event Type</Label>
          <Select value={selectedEventType} onValueChange={setSelectedEventType}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an event type to configure forms" />
            </SelectTrigger>
            <SelectContent>
              {eventTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEventType && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Default Forms</h4>
              <Button onClick={() => setIsDialogOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Form
              </Button>
            </div>

            <div className="space-y-2">
              {mappings?.map((mapping, index) => (
                <Card key={mapping.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <h5 className="font-medium">{mapping.form_templates?.name}</h5>
                        <p className="text-sm text-muted-foreground">
                          Default label: {mapping.default_label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={mapping.auto_assign}
                          onCheckedChange={(checked) =>
                            updateMappingMutation.mutate({
                              id: mapping.id,
                              updates: { auto_assign: checked }
                            })
                          }
                        />
                        <Label className="text-sm">Auto-assign</Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMappingMutation.mutate(mapping.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Form to Event Type</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAddMapping(new FormData(e.currentTarget));
          }} className="space-y-4">
            <div>
              <Label htmlFor="form_template_id">Form Template</Label>
              <Select name="form_template_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a form template" />
                </SelectTrigger>
                <SelectContent>
                  {formTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="default_label">Default Label</Label>
              <Input
                id="default_label"
                name="default_label"
                placeholder="e.g., Main Form, Catering Options"
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Form</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};