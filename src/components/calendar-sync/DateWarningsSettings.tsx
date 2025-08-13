import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Settings } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const DateWarningsSettings = () => {
  const { currentTenant } = useAuth();
  
  // Calendar Warning Settings
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [warningDaysThreshold, setWarningDaysThreshold] = useState('7');
  const [warningMessage, setWarningMessage] = useState('Event approaching with unpaid balance');
  const [warningColor, setWarningColor] = useState('#F59E0B');

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

  return (
    <div className="space-y-6">
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
                    <Label htmlFor="warning_days_threshold">Warning Days Threshold</Label>
                    <Input
                      id="warning_days_threshold"
                      type="number"
                      min="1"
                      max="30"
                      value={warningDaysThreshold}
                      onChange={(e) => setWarningDaysThreshold(e.target.value)}
                      placeholder="7"
                    />
                    <p className="text-xs text-muted-foreground">
                      Show warnings when events are within this many days and have unpaid balances
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
                    <div className="flex gap-2">
                      <Input
                        id="warning_color"
                        type="color"
                        value={warningColor}
                        onChange={(e) => setWarningColor(e.target.value)}
                        className="w-20 h-10 p-1 border rounded"
                      />
                      <Input
                        value={warningColor}
                        onChange={(e) => setWarningColor(e.target.value)}
                        placeholder="#F59E0B"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => saveCalendarWarningMutation.mutate({})}
                    disabled={saveCalendarWarningMutation.isPending}
                    className="w-full"
                  >
                    {saveCalendarWarningMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <h4 className="font-medium">Current Settings</h4>
                <div className="text-sm text-muted-foreground space-y-1 mt-2">
                  <p>• Warning threshold: {calendarWarningSettings?.warning_days_threshold || 7} days</p>
                  <p>• Message: "{calendarWarningSettings?.warning_message || 'Event approaching with unpaid balance'}"</p>
                  <div className="flex items-center gap-2">
                    <span>• Warning color:</span>
                    <div 
                      className="w-4 h-4 rounded border" 
                      style={{ backgroundColor: calendarWarningSettings?.warning_color || '#F59E0B' }}
                    />
                    <span className="text-xs font-mono">
                      {calendarWarningSettings?.warning_color || '#F59E0B'}
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant={calendarWarningSettings?.is_active === true ? "default" : "secondary"}>
                {calendarWarningSettings?.is_active === true ? "Active" : "Inactive"}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">How it works:</p>
              <ul className="space-y-1 ml-4">
                <li>• Events with unpaid balances will show warning indicators when approaching their date</li>
                <li>• Warnings appear in calendar view and event tooltips</li>
                <li>• Only events with remaining balance due will trigger warnings</li>
                <li>• Customize the warning threshold, message, and color to match your workflow</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};