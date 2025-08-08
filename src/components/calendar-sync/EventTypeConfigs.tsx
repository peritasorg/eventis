import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EventTypeConfig {
  id: string;
  event_type: string;
  display_name: string;
  color: string;
  text_color: string;
  is_all_day: boolean;
  is_active: boolean;
  sort_order: number;
}

const defaultColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export const EventTypeConfigs = () => {
  const { currentTenant } = useAuth();
  const [editingConfig, setEditingConfig] = useState<EventTypeConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: configs, refetch } = useSupabaseQuery(
    ['event-type-configs'],
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

  const createMutation = useSupabaseMutation(
    async (config: Omit<EventTypeConfig, 'id'>) => {
      if (!currentTenant?.id) throw new Error('No tenant');
      
      const { data, error } = await supabase
        .from('event_type_configs')
        .insert({
          ...config,
          tenant_id: currentTenant.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Event type created successfully!',
      invalidateQueries: [['event-type-configs']]
    }
  );

  const updateMutation = useSupabaseMutation(
    async (config: EventTypeConfig) => {
      const { data, error } = await supabase
        .from('event_type_configs')
        .update(config)
        .eq('id', config.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Event type updated successfully!',
      invalidateQueries: [['event-type-configs']]
    }
  );

  const deleteMutation = useSupabaseMutation(
    async (id: string) => {
      const { error } = await supabase
        .from('event_type_configs')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    {
      successMessage: 'Event type deleted successfully!',
      invalidateQueries: [['event-type-configs']]
    }
  );

  const handleSave = async (formData: FormData) => {
    const eventType = formData.get('event_type') as string;
    const displayName = formData.get('display_name') as string;
    const color = formData.get('color') as string;
    const textColor = formData.get('text_color') as string;
    const isAllDay = formData.get('is_all_day') === 'on';

    const config = {
      event_type: eventType,
      display_name: displayName,
      color,
      text_color: textColor,
      is_all_day: isAllDay,
      is_active: true,
      sort_order: editingConfig?.sort_order || (configs?.length || 0)
    };

    if (editingConfig) {
      await updateMutation.mutateAsync({ ...config, id: editingConfig.id });
    } else {
      await createMutation.mutateAsync(config);
    }

    setIsDialogOpen(false);
    setEditingConfig(null);
  };

  const openDialog = (config?: EventTypeConfig) => {
    setEditingConfig(config || null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Event Types</h3>
        <Button onClick={() => openDialog()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Event Type
        </Button>
      </div>

      <div className="grid gap-4">
        {configs?.map((config) => (
          <Card key={config.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div 
                className="w-6 h-6 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: config.color }}
              />
              <div>
                <h4 className="font-medium">{config.display_name}</h4>
                <p className="text-sm text-muted-foreground">
                  {config.event_type} {config.is_all_day && '(All Day)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDialog(config)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(config.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Edit Event Type' : 'Create Event Type'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSave(new FormData(e.currentTarget));
          }} className="space-y-4">
            <div>
              <Label htmlFor="event_type">Event Type Key</Label>
              <Input
                id="event_type"
                name="event_type"
                defaultValue={editingConfig?.event_type}
                placeholder="e.g., wedding, corporate, birthday"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={editingConfig?.display_name}
                placeholder="e.g., Wedding Reception"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color">Background Color</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    defaultValue={editingConfig?.color || '#3B82F6'}
                    className="w-12 h-10 p-1"
                  />
                  <div className="flex flex-wrap gap-1">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="w-6 h-6 rounded border-2 border-gray-300"
                        style={{ backgroundColor: color }}
                        onClick={(e) => {
                          const colorInput = document.getElementById('color') as HTMLInputElement;
                          if (colorInput) colorInput.value = color;
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="text_color">Text Color</Label>
                <Input
                  id="text_color"
                  name="text_color"
                  type="color"
                  defaultValue={editingConfig?.text_color || '#FFFFFF'}
                  className="w-12 h-10 p-1 mt-2"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_all_day"
                name="is_all_day"
                defaultChecked={editingConfig?.is_all_day}
              />
              <Label htmlFor="is_all_day">All Day Event Type</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingConfig ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};