import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Clock, Users, Settings, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { toast } from 'sonner';

export const EventSettings: React.FC = () => {
  const { currentTenant } = useAuth();
  
  // Time Range Management
  const [isTimeRangeDialogOpen, setIsTimeRangeDialogOpen] = useState(false);
  const [timeRangeName, setTimeRangeName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [editingTimeRange, setEditingTimeRange] = useState<any>(null);

  // Ethnicity Options Management
  const [isEthnicityDialogOpen, setIsEthnicityDialogOpen] = useState(false);
  const [ethnicityName, setEthnicityName] = useState('');
  const [editingEthnicity, setEditingEthnicity] = useState<any>(null);

  // Calendar Warning Settings
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [warningDaysThreshold, setWarningDaysThreshold] = useState('7');
  const [warningMessage, setWarningMessage] = useState('Event approaching with unpaid balance');
  const [warningColor, setWarningColor] = useState('#F59E0B');

  // Fetch time ranges
  const { data: timeRanges, refetch: refetchTimeRanges } = useSupabaseQuery(
    ['event_time_ranges', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_time_ranges')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  );

  // Fetch ethnicity options
  const { data: ethnicityOptions, refetch: refetchEthnicityOptions } = useSupabaseQuery(
    ['event_ethnicity_options', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_ethnicity_options')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('ethnicity_name');
      
      if (error) throw error;
      return data || [];
    }
  );

  // Fetch calendar warning settings
  const { data: calendarWarningSettings, refetch: refetchCalendarWarningSettings } = useSupabaseQuery(
    ['calendar_warning_settings', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('calendar_warning_settings')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  );

  // Initialize warning settings when data loads
  useEffect(() => {
    if (calendarWarningSettings) {
      setWarningDaysThreshold(calendarWarningSettings.warning_days_threshold?.toString() || '7');
      setWarningMessage(calendarWarningSettings.warning_message || 'Event approaching with unpaid balance');
      setWarningColor(calendarWarningSettings.warning_color || '#F59E0B');
    }
  }, [calendarWarningSettings]);

  // Calendar warning settings mutation
  const saveCalendarWarningMutation = useSupabaseMutation(
    async () => {
      if (!currentTenant?.id) throw new Error('No tenant');
      
      const { data, error } = await supabase
        .from('calendar_warning_settings')
        .upsert({
          tenant_id: currentTenant.id,
          warning_days_threshold: parseInt(warningDaysThreshold),
          warning_message: warningMessage,
          warning_color: warningColor,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast.success('Calendar warning settings saved successfully!');
        setIsWarningDialogOpen(false);
        refetchCalendarWarningSettings();
      }
    }
  );

  // Time range mutations
  const saveTimeRangeMutation = useSupabaseMutation(
    async () => {
      if (!currentTenant?.id || !timeRangeName.trim() || !startTime || !endTime) {
        throw new Error('All fields are required');
      }

      if (editingTimeRange) {
        const { error } = await supabase
          .from('event_time_ranges')
          .update({
            name: timeRangeName.trim(),
            start_time: startTime,
            end_time: endTime
          })
          .eq('id', editingTimeRange.id)
          .eq('tenant_id', currentTenant.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_time_ranges')
          .insert({
            tenant_id: currentTenant.id,
            name: timeRangeName.trim(),
            start_time: startTime,
            end_time: endTime,
            is_active: true
          });
        
        if (error) throw error;
      }
    },
    {
      onSuccess: () => {
        toast.success(editingTimeRange ? 'Time range updated' : 'Time range added');
        resetTimeRangeForm();
        refetchTimeRanges();
      }
    }
  );

  const deleteTimeRangeMutation = useSupabaseMutation(
    async (id: string) => {
      if (!currentTenant?.id) throw new Error('No tenant');
      
      const { error } = await supabase
        .from('event_time_ranges')
        .delete()
        .eq('id', id)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Time range deleted');
        refetchTimeRanges();
      }
    }
  );

  // Ethnicity mutations
  const saveEthnicityMutation = useSupabaseMutation(
    async () => {
      if (!currentTenant?.id || !ethnicityName.trim()) {
        throw new Error('Ethnicity name is required');
      }

      if (editingEthnicity) {
        const { error } = await supabase
          .from('event_ethnicity_options')
          .update({
            ethnicity_name: ethnicityName.trim()
          })
          .eq('id', editingEthnicity.id)
          .eq('tenant_id', currentTenant.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_ethnicity_options')
          .insert({
            tenant_id: currentTenant.id,
            ethnicity_name: ethnicityName.trim(),
            is_active: true
          });
        
        if (error) throw error;
      }
    },
    {
      onSuccess: () => {
        toast.success(editingEthnicity ? 'Ethnicity updated' : 'Ethnicity added');
        resetEthnicityForm();
        refetchEthnicityOptions();
      }
    }
  );

  const deleteEthnicityMutation = useSupabaseMutation(
    async (id: string) => {
      if (!currentTenant?.id) throw new Error('No tenant');
      
      const { error } = await supabase
        .from('event_ethnicity_options')
        .delete()
        .eq('id', id)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Ethnicity option deleted');
        refetchEthnicityOptions();
      }
    }
  );

  const resetTimeRangeForm = () => {
    setTimeRangeName('');
    setStartTime('');
    setEndTime('');
    setEditingTimeRange(null);
    setIsTimeRangeDialogOpen(false);
  };

  const resetEthnicityForm = () => {
    setEthnicityName('');
    setEditingEthnicity(null);
    setIsEthnicityDialogOpen(false);
  };

  const handleEditTimeRange = (timeRange: any) => {
    setEditingTimeRange(timeRange);
    setTimeRangeName(timeRange.name);
    setStartTime(timeRange.start_time);
    setEndTime(timeRange.end_time);
    setIsTimeRangeDialogOpen(true);
  };

  const handleEditEthnicity = (ethnicity: any) => {
    setEditingEthnicity(ethnicity);
    setEthnicityName(ethnicity.ethnicity_name);
    setIsEthnicityDialogOpen(true);
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // Format HH:MM
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Event Settings</h1>
      </div>

      {/* Time Ranges Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Ranges
            </CardTitle>
            <Dialog open={isTimeRangeDialogOpen} onOpenChange={setIsTimeRangeDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  resetTimeRangeForm();
                  setIsTimeRangeDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Range
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTimeRange ? 'Edit Time Range' : 'Add Time Range'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="time_range_name">Name</Label>
                    <Input
                      id="time_range_name"
                      value={timeRangeName}
                      onChange={(e) => setTimeRangeName(e.target.value)}
                      placeholder="e.g., Evening Session"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => saveTimeRangeMutation.mutate({})}
                    disabled={!timeRangeName.trim() || !startTime || !endTime || saveTimeRangeMutation.isPending}
                    className="w-full"
                  >
                    {saveTimeRangeMutation.isPending ? 'Saving...' : (editingTimeRange ? 'Update' : 'Add')} Time Range
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {timeRanges && timeRanges.length > 0 ? (
            <div className="space-y-3">
              {timeRanges.map((range) => (
                <div key={range.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{range.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(range.start_time)} - {formatTime(range.end_time)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={range.is_active ? "default" : "secondary"}>
                      {range.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTimeRange(range)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTimeRangeMutation.mutate(range.id)}
                      disabled={deleteTimeRangeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No time ranges configured. Add your first time range to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ethnicity Options Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Ethnicity Options
            </CardTitle>
            <Dialog open={isEthnicityDialogOpen} onOpenChange={setIsEthnicityDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  resetEthnicityForm();
                  setIsEthnicityDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ethnicity
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingEthnicity ? 'Edit Ethnicity' : 'Add Ethnicity'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ethnicity_name">Ethnicity Name</Label>
                    <Input
                      id="ethnicity_name"
                      value={ethnicityName}
                      onChange={(e) => setEthnicityName(e.target.value)}
                      placeholder="e.g., Asian"
                    />
                  </div>
                  <Button
                    onClick={() => saveEthnicityMutation.mutate({})}
                    disabled={!ethnicityName.trim() || saveEthnicityMutation.isPending}
                    className="w-full"
                  >
                    {saveEthnicityMutation.isPending ? 'Saving...' : (editingEthnicity ? 'Update' : 'Add')} Ethnicity
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {ethnicityOptions && ethnicityOptions.length > 0 ? (
            <div className="space-y-3">
              {ethnicityOptions.map((option) => (
                <div key={option.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{option.ethnicity_name}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={option.is_active ? "default" : "secondary"}>
                      {option.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditEthnicity(option)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEthnicityMutation.mutate(option.id)}
                      disabled={deleteEthnicityMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No ethnicity options configured. Add your first option to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Warning Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Calendar Warnings for Unpaid Balances
            </CardTitle>
            <Dialog open={isWarningDialogOpen} onOpenChange={setIsWarningDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsWarningDialogOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Warnings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Calendar Warning Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="warning_days">Warning Days Threshold</Label>
                    <Input
                      id="warning_days"
                      type="number"
                      value={warningDaysThreshold}
                      onChange={(e) => setWarningDaysThreshold(e.target.value)}
                      placeholder="7"
                      min="1"
                      max="365"
                    />
                    <p className="text-xs text-muted-foreground">
                      Show warning when event is within this many days and has unpaid balance
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warning_message">Warning Message</Label>
                    <Input
                      id="warning_message"
                      value={warningMessage}
                      onChange={(e) => setWarningMessage(e.target.value)}
                      placeholder="Event approaching with unpaid balance"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warning_color">Warning Color</Label>
                    <Input
                      id="warning_color"
                      type="color"
                      value={warningColor}
                      onChange={(e) => setWarningColor(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => saveCalendarWarningMutation.mutate({})}
                    disabled={saveCalendarWarningMutation.isPending}
                    className="w-full"
                  >
                    {saveCalendarWarningMutation.isPending ? 'Saving...' : 'Save Warning Settings'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Current Settings</h4>
              <div className="text-sm space-y-1">
                <div>Warning threshold: {calendarWarningSettings?.warning_days_threshold || 7} days</div>
                <div>Warning message: "{calendarWarningSettings?.warning_message || 'Event approaching with unpaid balance'}"</div>
                <div className="flex items-center gap-2">
                  Warning color: 
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: calendarWarningSettings?.warning_color || '#F59E0B' }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>How it works:</strong> Events will show warnings in the calendar view when they are within the threshold days AND have an unpaid balance (remaining amount &gt; £0). This helps you focus on events that need payment follow-up.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};