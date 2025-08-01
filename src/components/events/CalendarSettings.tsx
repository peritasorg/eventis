import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Plus, Trash2, Palette } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EventTypeConfig {
  id: string;
  event_type: string;
  display_name: string;
  color: string;
  text_color: string;
  is_active: boolean;
  sort_order: number;
}

export const CalendarSettings = () => {
  const { currentTenant } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EventTypeConfig | null>(null);
  const [newEventType, setNewEventType] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [urgentDays, setUrgentDays] = useState(7);
  const [warningDays, setWarningDays] = useState(28);

  const { data: eventTypeConfigs, refetch } = useSupabaseQuery(
    ['event-type-configs'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from('event_type_configs')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  );

  const createConfigMutation = useSupabaseMutation(
    async (config: Partial<EventTypeConfig>) => {
      const { data, error } = await (supabase as any)
        .from('event_type_configs')
        .insert({
          tenant_id: currentTenant?.id,
          event_type: config.event_type,
          display_name: config.display_name,
          color: config.color,
          text_color: '#FFFFFF',
          sort_order: (eventTypeConfigs?.length || 0) + 1
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        refetch();
        setNewEventType('');
        setNewDisplayName('');
        setNewColor('#3B82F6');
        toast.success('Event type added successfully');
      }
    }
  );

  const updateConfigMutation = useSupabaseMutation(
    async (config: EventTypeConfig) => {
      const { data, error } = await (supabase as any)
        .from('event_type_configs')
        .update({
          display_name: config.display_name,
          color: config.color,
          text_color: config.text_color
        })
        .eq('id', config.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        refetch();
        setEditingConfig(null);
        toast.success('Event type updated successfully');
      }
    }
  );

  const deleteConfigMutation = useSupabaseMutation(
    async (configId: string) => {
      const { error } = await (supabase as any)
        .from('event_type_configs')
        .update({ is_active: false })
        .eq('id', configId);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        refetch();
        toast.success('Event type deleted successfully');
      }
    }
  );

  const handleCreateConfig = () => {
    if (!newEventType.trim() || !newDisplayName.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    createConfigMutation.mutate({
      event_type: newEventType.toLowerCase().replace(/\s+/g, '_'),
      display_name: newDisplayName,
      color: newColor
    });
  };

  const handleUpdateConfig = (config: EventTypeConfig) => {
    updateConfigMutation.mutate(config);
  };

  const handleDeleteConfig = (configId: string) => {
    if (confirm('Are you sure you want to delete this event type?')) {
      deleteConfigMutation.mutate(configId);
    }
  };

  const predefinedColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#6B7280', '#059669', '#0891B2'
  ]; // Removed red and orange - reserved for date warnings

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Calendar Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Calendar Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add New Event Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Event Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-type">Event Type Key</Label>
                  <Input
                    id="event-type"
                    placeholder="e.g., wedding, birthday"
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    placeholder="e.g., Wedding, Birthday Party"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-12 h-8 border border-border rounded cursor-pointer"
                  />
                  <div className="flex gap-1">
                    {predefinedColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewColor(color)}
                        className="w-6 h-6 border border-border rounded-sm cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div
                    className="px-3 py-1 rounded text-white text-sm font-medium"
                    style={{ backgroundColor: newColor }}
                  >
                    Preview
                  </div>
                </div>
              </div>
              
              <Button onClick={handleCreateConfig} disabled={createConfigMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Add Event Type
              </Button>
            </CardContent>
          </Card>

          {/* Existing Event Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Existing Event Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {eventTypeConfigs?.map((config) => (
                  <div key={config.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    {editingConfig?.id === config.id ? (
                      <div className="flex-1 grid grid-cols-3 gap-4">
                        <Input
                          value={editingConfig.display_name}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            display_name: e.target.value
                          })}
                        />
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={editingConfig.color}
                            onChange={(e) => setEditingConfig({
                              ...editingConfig,
                              color: e.target.value
                            })}
                            className="w-10 h-8 border border-border rounded cursor-pointer"
                          />
                          <Badge style={{ backgroundColor: editingConfig.color, color: editingConfig.text_color }}>
                            {editingConfig.display_name}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateConfig(editingConfig)}
                            disabled={updateConfigMutation.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingConfig(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Badge style={{ backgroundColor: config.color, color: config.text_color }}>
                            {config.display_name}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {config.event_type}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingConfig(config)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteConfig(config.id)}
                            disabled={deleteConfigMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                
                {(!eventTypeConfigs || eventTypeConfigs.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No event types configured yet. Add your first event type above.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Date Warning Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Date Warning Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="urgent-days">Urgent Days (Orange)</Label>
                  <Input
                    id="urgent-days"
                    type="number"
                    value={urgentDays}
                    onChange={(e) => setUrgentDays(parseInt(e.target.value))}
                    min="1"
                    max="365"
                  />
                  <p className="text-xs text-muted-foreground">Events within this many days show in orange</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warning-days">Warning Days (Red)</Label>
                  <Input
                    id="warning-days"
                    type="number"
                    value={warningDays}
                    onChange={(e) => setWarningDays(parseInt(e.target.value))}
                    min="1"
                    max="365"
                  />
                  <p className="text-xs text-muted-foreground">Events within this many days show in red</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span>Urgent events (within {urgentDays} days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Warning events (within {warningDays} days)</span>
                </div>
                <p className="mt-3 text-xs">
                  These colors are reserved and cannot be used for event types.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
