import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Settings, Palette } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventTypeFormAssignments } from './EventTypeFormAssignments';
import { TimeSlotManager } from './TimeSlotManager';
import { toast } from 'sonner';

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
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>({});
  const [newEventType, setNewEventType] = useState({
    event_type: '',
    display_name: '',
    color: '#3B82F6'
  });

  const { data: eventTypeConfigs, refetch } = useSupabaseQuery(
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

  const createConfigMutation = useSupabaseMutation(
    async (config: any) => {
      const { data, error } = await supabase
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
      successMessage: 'Event type created successfully!',
      invalidateQueries: [['event-type-configs']]
    }
  );

  const updateConfigMutation = useSupabaseMutation(
    async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('event_type_configs')
        .update(updates)
        .eq('id', id)
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

  const deleteConfigMutation = useSupabaseMutation(
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

  const handleCreateConfig = () => {
    if (!newEventType.event_type.trim() || !newEventType.display_name.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    createConfigMutation.mutate({
      event_type: newEventType.event_type.toLowerCase().replace(/\s+/g, '_'),
      display_name: newEventType.display_name,
      color: newEventType.color
    });

    setNewEventType({
      event_type: '',
      display_name: '',
      color: '#3B82F6'
    });
  };

  const handleUpdateConfig = (id: string) => {
    updateConfigMutation.mutate({
      id,
      ...editingData
    });
    setEditingConfig(null);
    setEditingData({});
  };

  const handleDeleteConfig = (id: string) => {
    if (confirm('Are you sure you want to delete this event type?')) {
      deleteConfigMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Calendar Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Calendar Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="event-types" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="event-types">Event Types</TabsTrigger>
            <TabsTrigger value="time-slots">Time Slots</TabsTrigger>
            <TabsTrigger value="warnings">Date Warnings</TabsTrigger>
          </TabsList>

          <TabsContent value="event-types" className="space-y-6">
            {/* Add New Event Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Event Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event_type">Event Type Key</Label>
                    <Input
                      id="event_type"
                      value={newEventType.event_type}
                      onChange={(e) => setNewEventType({ ...newEventType, event_type: e.target.value })}
                      placeholder="e.g., wedding"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={newEventType.display_name}
                      onChange={(e) => setNewEventType({ ...newEventType, display_name: e.target.value })}
                      placeholder="e.g., Wedding"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        id="color"
                        value={newEventType.color}
                        onChange={(e) => setNewEventType({ ...newEventType, color: e.target.value })}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={newEventType.color}
                        onChange={(e) => setNewEventType({ ...newEventType, color: e.target.value })}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleCreateConfig} disabled={createConfigMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  {createConfigMutation.isPending ? 'Adding...' : 'Add Event Type'}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Event Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {eventTypeConfigs?.map((config) => (
                  <div key={config.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: config.color }}
                        />
                        {editingConfig === config.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingData.display_name || ''}
                              onChange={(e) => setEditingData({ ...editingData, display_name: e.target.value })}
                              className="w-32"
                            />
                            <Input
                              type="color"
                              value={editingData.color || config.color}
                              onChange={(e) => setEditingData({ ...editingData, color: e.target.value })}
                              className="w-16 h-8 p-1"
                            />
                          </div>
                        ) : (
                          <>
                            <span className="font-medium">{config.display_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {config.event_type}
                            </Badge>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {editingConfig === config.id ? (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handleUpdateConfig(config.id)}
                              disabled={updateConfigMutation.isPending}
                            >
                              {updateConfigMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setEditingConfig(null);
                                setEditingData({});
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingConfig(config.id);
                                setEditingData({
                                  display_name: config.display_name,
                                  color: config.color
                                });
                              }}
                            >
                              <Palette className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteConfig(config.id)}
                              disabled={deleteConfigMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <EventTypeFormAssignments eventTypeConfig={config} />
                  </div>
                ))}
                
                {(!eventTypeConfigs || eventTypeConfigs.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No event types configured yet.</p>
                    <p className="text-sm">Add your first event type above to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time-slots">
            <TimeSlotManager />
          </TabsContent>

          <TabsContent value="warnings" className="space-y-6">
            {/* Date Warning Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Date Warning Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Urgent Warnings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Urgent Warnings (Orange)</h4>
                      <p className="text-sm text-muted-foreground">
                        Show orange warnings when events are approaching
                      </p>
                    </div>
                    <Switch 
                      checked={true} 
                      disabled 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label>Show warning when event is within</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          defaultValue="28" 
                          className="w-20"
                          min="1"
                          max="365"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                        <span className="text-sm">28 days warning</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Critical Warnings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Critical Warnings (Red)</h4>
                      <p className="text-sm text-muted-foreground">
                        Show red warnings when events are very close
                      </p>
                    </div>
                    <Switch 
                      checked={true} 
                      disabled 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label>Show critical warning when event is within</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          defaultValue="7" 
                          className="w-20"
                          min="1"
                          max="365"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <span className="text-sm">7 days critical warning</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
