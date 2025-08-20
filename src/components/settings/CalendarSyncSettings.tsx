import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Calendar, CheckCircle, XCircle, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { CalendarPreview } from './CalendarPreview';
import { CalendarReconciliation } from './CalendarReconciliation';
import { useQuery } from '@tanstack/react-query';

export const CalendarSyncSettings = () => {
  const [loading, setLoading] = useState(false);
  const [testEventId, setTestEventId] = useState<string>('');
  const [eventSearchTerm, setEventSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'sync' | 'reconciliation'>('sync');

  // Fetch calendar integrations
  const { data: integrations, refetch: refetchIntegrations } = useQuery({
    queryKey: ['calendar-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch all events for testing
  const { data: allEvents } = useQuery({
    queryKey: ['all-events-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_date, event_type')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Filter events based on search term
  const filteredEvents = useMemo(() => {
    if (!allEvents) return [];
    if (!eventSearchTerm.trim()) return allEvents;
    
    const searchLower = eventSearchTerm.toLowerCase();
    return allEvents.filter(event => 
      event.title?.toLowerCase().includes(searchLower) ||
      event.event_type?.toLowerCase().includes(searchLower) ||
      event.event_date?.includes(eventSearchTerm)
    );
  }, [allEvents, eventSearchTerm]);

  const handleGoogleConnect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'authorize' }
      });

      if (error) {
        toast.error(`Connection error: ${error.message}`);
        return;
      }

      if (data?.authUrl) {
        window.open(data.authUrl, '_blank');
        toast.info('Please complete authorization in the new window');
      } else {
        toast.error('No authorization URL received');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .update({ is_active: false })
        .eq('id', integrationId);

      if (error) throw error;

      toast.success('Calendar disconnected successfully');
      refetchIntegrations();
    } catch (error: any) {
      toast.error(`Error disconnecting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshConnection = async (integrationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { 
          action: 'refresh',
          integration_id: integrationId 
        }
      });

      if (error) {
        toast.error(`Refresh error: ${error.message}`);
        return;
      }

      toast.success('Connection refreshed successfully');
      refetchIntegrations();
    } catch (error: any) {
      toast.error(`Error refreshing: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatus = (integration: any) => {
    if (!integration.token_expires_at) {
      return { status: 'active', label: 'Connected', color: 'bg-green-100 text-green-800' };
    }

    const expiryDate = new Date(integration.token_expires_at);
    const now = new Date();

    if (expiryDate > now) {
      return { status: 'active', label: 'Connected', color: 'bg-green-100 text-green-800' };
    } else {
      return { status: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('sync')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'sync'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Calendar Sync
        </button>
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'reconciliation'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Calendar Fix
        </button>
      </div>

      {activeTab === 'reconciliation' ? (
        <CalendarReconciliation />
      ) : (
        <div className="space-y-6">
      {/* Google Calendar Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar to automatically sync events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations && integrations.length > 0 ? (
            <div className="space-y-4">
              {integrations.map((integration: any) => {
                const connectionStatus = getConnectionStatus(integration);
                
                return (
                  <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <h4 className="font-medium">{integration.calendar_name || 'Google Calendar'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {integration.provider} • Last synced: {
                              integration.last_sync_at ? 
                                new Date(integration.last_sync_at).toLocaleDateString() : 
                                'Never'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={connectionStatus.color}>
                        {connectionStatus.label}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefreshConnection(integration.id)}
                          disabled={loading}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(integration.id)}
                          disabled={loading}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Calendar Connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Google Calendar to automatically sync your events
              </p>
              <Button onClick={handleGoogleConnect} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect Google Calendar
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar Preview</CardTitle>
          <CardDescription>
            See how your events will appear when synced to your calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-event">Select Event to Preview</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search events by title, type, or date..."
                    value={eventSearchTerm}
                    onChange={(e) => setEventSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={testEventId} onValueChange={setTestEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event to preview" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEvents?.length > 0 ? (
                      filteredEvents.map((event: any) => (
                        <SelectItem key={event.id} value={event.id}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">{event.title}</span>
                            <span className="text-sm text-muted-foreground">
                              {event.event_type} • {new Date(event.event_date).toLocaleDateString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-events" disabled>
                        {eventSearchTerm ? 'No events match your search' : 'No events available'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <CalendarPreview eventId={testEventId} />
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>Configure how events are synced to your calendar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sync events when they are created or updated
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Form Data</Label>
                <p className="text-sm text-muted-foreground">
                  Include form responses in the calendar event description
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sync Event Status Changes</Label>
                <p className="text-sm text-muted-foreground">
                  Update calendar events when event status changes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sync-frequency">Sync Frequency (minutes)</Label>
            <Input
              id="sync-frequency"
              type="number"
              min="5"
              max="120"
              defaultValue="15"
              className="w-32"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description-template">Custom Description Template</Label>
            <Textarea
              id="description-template"
              placeholder="Customize how event information appears in calendar descriptions..."
              className="min-h-20"
            />
            <p className="text-sm text-muted-foreground">
              Leave empty to use the default format shown in the preview above
            </p>
          </div>
        </CardContent>
      </Card>
        </div>
      )}
    </div>
  );
};