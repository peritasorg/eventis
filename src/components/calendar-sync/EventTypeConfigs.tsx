import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Palette, Clock, Split } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SessionTemplateEditor } from './SessionTemplateEditor';
import type { SessionTemplate } from '@/hooks/useEventTypeConfigs';

interface EventTypeConfig {
  id: string;
  event_type: string;
  display_name: string;
  color: string;
  text_color: string;
  is_all_day: boolean;
  is_active: boolean;
  sort_order: number;
  allow_splitting: boolean;
  default_sessions: SessionTemplate[];
  split_naming_pattern: string;
}

const defaultColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export const EventTypeConfigs = () => {
  const { currentTenant } = useAuth();
  const [editingConfig, setEditingConfig] = useState<EventTypeConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    event_type: '',
    display_name: '',
    color: '#3B82F6',
    text_color: '#FFFFFF',
    is_all_day: false,
    allow_splitting: false,
    split_naming_pattern: '{Parent} - {Session}',
    default_sessions: [] as SessionTemplate[]
  });

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
          tenant_id: currentTenant.id,
          event_type: config.event_type,
          display_name: config.display_name,
          color: config.color,
          text_color: config.text_color,
          is_all_day: config.is_all_day,
          allow_splitting: config.allow_splitting,
          default_sessions: config.default_sessions as any,
          split_naming_pattern: config.split_naming_pattern,
          is_active: config.is_active,
          sort_order: config.sort_order
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
        .update({
          event_type: config.event_type,
          display_name: config.display_name,
          color: config.color,
          text_color: config.text_color,
          is_all_day: config.is_all_day,
          allow_splitting: config.allow_splitting,
          default_sessions: config.default_sessions as any,
          split_naming_pattern: config.split_naming_pattern,
          is_active: config.is_active,
          sort_order: config.sort_order
        })
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const config = {
      event_type: formData.event_type,
      display_name: formData.display_name,
      color: formData.color,
      text_color: formData.text_color,
      is_all_day: formData.is_all_day,
      allow_splitting: formData.allow_splitting,
      default_sessions: formData.default_sessions,
      split_naming_pattern: formData.split_naming_pattern,
      is_active: true,
      sort_order: editingConfig?.sort_order || (configs?.length || 0)
    };

    try {
      if (editingConfig) {
        await updateMutation.mutateAsync({ ...config, id: editingConfig.id });
      } else {
        await createMutation.mutateAsync(config);
      }

      setIsDialogOpen(false);
      setEditingConfig(null);
      setFormData({
        event_type: '',
        display_name: '',
        color: '#3B82F6',
        text_color: '#FFFFFF',
        is_all_day: false,
        allow_splitting: false,
        split_naming_pattern: '{Parent} - {Session}',
        default_sessions: []
      });
    } catch (error) {
      console.error('Error saving event type:', error);
    }
  };

  const openDialog = (config?: EventTypeConfig) => {
    setEditingConfig(config || null);
    setFormData({
      event_type: config?.event_type || '',
      display_name: config?.display_name || '',
      color: config?.color || '#3B82F6',
      text_color: config?.text_color || '#FFFFFF',
      is_all_day: config?.is_all_day || false,
      allow_splitting: config?.allow_splitting || false,
      split_naming_pattern: config?.split_naming_pattern || '{Parent} - {Session}',
      default_sessions: config?.default_sessions || []
    });
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
                  {config.allow_splitting && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Split className="w-3 h-3" />
                      Sessions: {config.default_sessions?.length || 0}
                    </span>
                  )}
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Edit Event Type' : 'Create Event Type'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <Label htmlFor="event_type">Event Type Key</Label>
              <Input
                id="event_type"
                value={formData.event_type}
                onChange={(e) => setFormData(prev => ({ ...prev, event_type: e.target.value }))}
                placeholder="e.g., wedding, corporate, birthday"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
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
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-10 p-1"
                  />
                  <div className="flex flex-wrap gap-1">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="w-6 h-6 rounded border-2 border-gray-300"
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="text_color">Text Color</Label>
                <Input
                  id="text_color"
                  type="color"
                  value={formData.text_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                  className="w-12 h-10 p-1 mt-2"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_all_day"
                checked={formData.is_all_day}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_all_day: checked }))}
              />
              <Label htmlFor="is_all_day">All Day Event Type</Label>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow_splitting"
                  checked={formData.allow_splitting}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_splitting: checked }))}
                />
                <Label htmlFor="allow_splitting" className="flex items-center gap-2">
                  <Split className="w-4 h-4" />
                  Enable Session Splitting
                </Label>
              </div>

              {formData.allow_splitting && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                  <div>
                    <Label htmlFor="split_naming_pattern">
                      Naming Pattern for Sub-Events
                    </Label>
                    <Input
                      id="split_naming_pattern"
                      value={formData.split_naming_pattern}
                      onChange={(e) => setFormData(prev => ({ ...prev, split_naming_pattern: e.target.value }))}
                      placeholder="{Parent} - {Session}"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {`{Parent}`} for parent event name and {`{Session}`} for session name
                    </p>
                  </div>

                  <SessionTemplateEditor
                    sessions={formData.default_sessions}
                    onChange={(sessions) => setFormData(prev => ({ ...prev, default_sessions: sessions }))}
                  />
                </div>
              )}
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