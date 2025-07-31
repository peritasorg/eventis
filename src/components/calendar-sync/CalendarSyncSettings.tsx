import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Trash2, Settings, RefreshCw, Plus, Link, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { calendarSyncService, CalendarIntegration, CalendarSyncPreferences } from '@/services/calendarSync';

export const CalendarSyncSettings = () => {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<CalendarIntegration | null>(null);
  const [preferences, setPreferences] = useState<CalendarSyncPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  useEffect(() => {
    if (selectedIntegration) {
      loadPreferences(selectedIntegration.id);
    }
  }, [selectedIntegration]);

  const loadIntegrations = async () => {
    try {
      const data = await calendarSyncService.getIntegrations();
      setIntegrations(data);
      if (data.length > 0 && !selectedIntegration) {
        setSelectedIntegration(data[0]);
      }
    } catch (error) {
      toast.error('Failed to load calendar integrations');
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async (integrationId: string) => {
    try {
      const prefs = await calendarSyncService.getPreferences(integrationId);
      setPreferences(prefs || {
        auto_sync: true,
        sync_frequency: 15,
        sync_event_types: [],
        sync_event_statuses: ['confirmed', 'inquiry'],
        include_form_data: true,
        description_template: null,
      });
    } catch (error) {
      toast.error('Failed to load sync preferences');
    }
  };

  const handleConnectCalendar = async (provider: 'google' | 'outlook') => {
    setConnecting(true);
    try {
      const authUrl = provider === 'google' 
        ? await calendarSyncService.connectGoogle()
        : await calendarSyncService.connectOutlook();
      
      // Open OAuth flow in new window
      window.open(authUrl, 'calendar-auth', 'width=600,height=700');
      
      // Listen for successful connection
      const checkConnection = setInterval(async () => {
        const updated = await calendarSyncService.getIntegrations();
        if (updated.length > integrations.length) {
          setIntegrations(updated);
          setSelectedIntegration(updated[0]);
          clearInterval(checkConnection);
          toast.success(`${provider} calendar connected successfully!`);
        }
      }, 2000);

      // Stop checking after 2 minutes
      setTimeout(() => clearInterval(checkConnection), 120000);
      
    } catch (error) {
      toast.error(`Failed to connect ${provider} calendar`);
    } finally {
      setConnecting(false);
    }
  };

  const handleRemoveIntegration = async (integrationId: string) => {
    try {
      await calendarSyncService.removeIntegration(integrationId);
      await loadIntegrations();
      if (selectedIntegration?.id === integrationId) {
        setSelectedIntegration(integrations[0] || null);
      }
      toast.success('Calendar integration removed');
    } catch (error) {
      toast.error('Failed to remove calendar integration');
    }
  };

  const handleUpdatePreferences = async (updates: Partial<CalendarSyncPreferences>) => {
    if (!selectedIntegration || !preferences) return;

    try {
      const newPreferences = { ...preferences, ...updates };
      await calendarSyncService.updatePreferences(selectedIntegration.id, newPreferences);
      setPreferences(newPreferences);
      toast.success('Sync preferences updated');
    } catch (error) {
      toast.error('Failed to update sync preferences');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Calendar Sync</h3>
          <p className="text-muted-foreground text-sm">
            Connect your calendars to automatically sync events
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleConnectCalendar('google')}
            disabled={connecting}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Connect Google
          </Button>
          <Button
            onClick={() => handleConnectCalendar('outlook')}
            disabled={connecting}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Connect Outlook
          </Button>
        </div>
      </div>

      {integrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Calendar Connections</h3>
            <p className="text-muted-foreground text-center mb-4">
              Connect your Google or Outlook calendar to automatically sync your events
            </p>
            <div className="flex gap-2">
              <Button onClick={() => handleConnectCalendar('google')} disabled={connecting}>
                <Link className="h-4 w-4 mr-2" />
                Connect Google Calendar
              </Button>
              <Button onClick={() => handleConnectCalendar('outlook')} disabled={connecting} variant="outline">
                <Link className="h-4 w-4 mr-2" />
                Connect Outlook Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connected Calendars */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Connected Calendars
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedIntegration?.id === integration.id
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/20'
                  }`}
                  onClick={() => setSelectedIntegration(integration)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {integration.is_active ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <div className="font-medium">{integration.calendar_name}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {integration.provider} Calendar
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                        {integration.sync_direction}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Calendar Integration</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this calendar integration? This will stop all future syncing.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveIntegration(integration.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {integration.last_sync_at && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Last sync: {new Date(integration.last_sync_at).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sync Settings */}
          {selectedIntegration && preferences && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Sync Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Auto Sync */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync events when they change
                    </p>
                  </div>
                  <Switch
                    checked={preferences.auto_sync}
                    onCheckedChange={(checked) => 
                      handleUpdatePreferences({ auto_sync: checked })
                    }
                  />
                </div>

                <Separator />

                {/* Sync Frequency */}
                <div className="space-y-2">
                  <Label>Sync Frequency (minutes)</Label>
                  <Input
                    type="number"
                    value={preferences.sync_frequency}
                    onChange={(e) => 
                      handleUpdatePreferences({ sync_frequency: parseInt(e.target.value) })
                    }
                    min="5"
                    max="1440"
                  />
                </div>

                {/* Event Types */}
                <div className="space-y-2">
                  <Label>Sync Event Types</Label>
                  <Select
                    value={preferences.sync_event_types?.join(',')}
                    onValueChange={(value) => 
                      handleUpdatePreferences({ sync_event_types: value ? value.split(',') : [] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event types to sync" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="anniversary">Anniversary</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Event Statuses */}
                <div className="space-y-2">
                  <Label>Sync Event Statuses</Label>
                  <Select
                    value={preferences.sync_event_statuses?.join(',')}
                    onValueChange={(value) => 
                      handleUpdatePreferences({ sync_event_statuses: value ? value.split(',') : [] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select statuses to sync" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inquiry,confirmed">Inquiry & Confirmed</SelectItem>
                      <SelectItem value="confirmed">Confirmed Only</SelectItem>
                      <SelectItem value="inquiry">Inquiry Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Include Form Data */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Include Form Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Add form responses to calendar event description
                    </p>
                  </div>
                  <Switch
                    checked={preferences.include_form_data}
                    onCheckedChange={(checked) => 
                      handleUpdatePreferences({ include_form_data: checked })
                    }
                  />
                </div>

                {/* Description Template */}
                <div className="space-y-2">
                  <Label>Custom Description Template</Label>
                  <Textarea
                    placeholder="Optional: Custom template for event descriptions..."
                    value={preferences.description_template || ''}
                    onChange={(e) => 
                      handleUpdatePreferences({ description_template: e.target.value || null })
                    }
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the default template
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};