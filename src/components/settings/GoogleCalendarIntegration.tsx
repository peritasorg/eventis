import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CheckCircle, AlertTriangle, ExternalLink, Loader2, Unlink, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CalendarIntegration {
  id: string;
  provider: string;
  calendar_id: string;
  calendar_name: string;
  is_active: boolean;
  last_sync_at: string;
  created_at: string;
}

interface GoogleCalendar {
  id: string;
  name: string;
  primary: boolean;
  accessRole: string;
  backgroundColor?: string;
}

export const GoogleCalendarIntegration = () => {
  const { currentTenant } = useAuth();
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null);
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [isUpdatingCalendar, setIsUpdatingCalendar] = useState(false);

  useEffect(() => {
    if (currentTenant?.id) {
      fetchIntegration();
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    if (integration) {
      fetchAvailableCalendars();
    }
  }, [integration]);

  const fetchIntegration = async () => {
    if (!currentTenant?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setIntegration(data);
    } catch (error) {
      console.error('Error fetching calendar integration:', error);
      toast.error('Failed to load calendar integration status');
    } finally {
      setIsLoading(false);
    }
  };

  const connectGoogleCalendar = async () => {
    setIsConnecting(true);
    try {
      // Call the google-oauth edge function to initiate OAuth flow
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'authorize', tenant_id: currentTenant?.id }
      });

      if (error) throw error;

      if (data.authUrl) {
        // Open OAuth URL in new window
        window.open(data.authUrl, 'google-oauth', 'width=500,height=600');
        
        // Poll for completion (in a real app, you'd use window messaging)
        const pollForConnection = setInterval(async () => {
          try {
            await fetchIntegration();
            // Check if we have an integration now
            const { data: newIntegration } = await supabase
              .from('calendar_integrations')
              .select('*')
              .eq('tenant_id', currentTenant?.id)
              .eq('provider', 'google')
              .eq('is_active', true)
              .maybeSingle();

            if (newIntegration) {
              clearInterval(pollForConnection);
              setIntegration(newIntegration);
              toast.success('Google Calendar connected successfully!');
              setIsConnecting(false);
            }
          } catch (error) {
            // Continue polling
          }
        }, 2000);

        // Stop polling after 2 minutes
        setTimeout(() => {
          clearInterval(pollForConnection);
          setIsConnecting(false);
        }, 120000);
      }
    } catch (error: any) {
      console.error('Error connecting to Google Calendar:', error);
      toast.error('Failed to connect to Google Calendar');
      setIsConnecting(false);
    }
  };

  const fetchAvailableCalendars = async () => {
    if (!currentTenant?.id) return;
    
    setIsLoadingCalendars(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'list-calendars' }
      });

      if (error) throw error;

      if (data.calendars) {
        setAvailableCalendars(data.calendars);
      }
    } catch (error: any) {
      console.error('Error fetching available calendars:', error);
      toast.error('Failed to load available calendars');
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  const handleCalendarChange = async (calendarId: string) => {
    if (!integration) return;
    
    const selectedCalendar = availableCalendars.find(cal => cal.id === calendarId);
    if (!selectedCalendar) return;

    setIsUpdatingCalendar(true);
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .update({ 
          calendar_id: selectedCalendar.id,
          calendar_name: selectedCalendar.name 
        })
        .eq('id', integration.id);

      if (error) throw error;

      // Update local state
      setIntegration({
        ...integration,
        calendar_id: selectedCalendar.id,
        calendar_name: selectedCalendar.name
      });

      toast.success('Calendar selection updated successfully');
    } catch (error: any) {
      console.error('Error updating calendar selection:', error);
      toast.error('Failed to update calendar selection');
    } finally {
      setIsUpdatingCalendar(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!integration) return;
    
    setIsDisconnecting(true);
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .update({ is_active: false })
        .eq('id', integration.id);

      if (error) throw error;

      setIntegration(null);
      setAvailableCalendars([]);
      toast.success('Google Calendar disconnected successfully');
    } catch (error: any) {
      console.error('Error disconnecting Google Calendar:', error);
      toast.error('Failed to disconnect Google Calendar');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading calendar integration...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar to automatically sync events and enable advanced calendar features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {integration ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">Connected to Google Calendar</div>
                    <div className="text-sm text-muted-foreground">
                      Calendar: {integration.calendar_name || integration.calendar_id}
                    </div>
                    {integration.last_sync_at && (
                      <div className="text-xs text-muted-foreground">
                        Last synced: {new Date(integration.last_sync_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  Active
                </Badge>
              </div>

              {/* Calendar Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Select Calendar</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchAvailableCalendars}
                    disabled={isLoadingCalendars}
                    className="h-8 px-2"
                  >
                    {isLoadingCalendars ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                
                <Select
                  value={integration.calendar_id}
                  onValueChange={handleCalendarChange}
                  disabled={isUpdatingCalendar || isLoadingCalendars}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a calendar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCalendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border"
                            style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                          />
                          <span>{calendar.name}</span>
                          {calendar.primary && (
                            <Badge variant="outline" className="text-xs">Primary</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {isUpdatingCalendar && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating calendar selection...
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={disconnectGoogleCalendar}
                  disabled={isDisconnecting}
                  className="flex items-center gap-2"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4" />
                  )}
                  Disconnect
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.open('https://calendar.google.com', '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Google Calendar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No Google Calendar connection found. Connect your Google Calendar to enable automatic event synchronization.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <h4 className="font-medium mb-2">Benefits of connecting Google Calendar:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Automatic event synchronization</li>
                    <li>Real-time calendar updates</li>
                    <li>Custom event descriptions with form data</li>
                    <li>Conflict detection and management</li>
                  </ul>
                </div>

                <Button 
                  onClick={connectGoogleCalendar}
                  disabled={isConnecting}
                  className="flex items-center gap-2"
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                  {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
                </Button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Privacy & Security</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• We only access your calendar to sync events you create in this application</p>
              <p>• Your calendar credentials are securely encrypted and stored</p>
              <p>• You can disconnect at any time without losing your existing events</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};