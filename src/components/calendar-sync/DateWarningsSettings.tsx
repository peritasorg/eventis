import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const DateWarningsSettings = () => {
  const { currentTenant } = useAuth();

  const { data: settings } = useSupabaseQuery(
    ['tenant-settings'],
    async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  );

  const updateSettingsMutation = useSupabaseMutation(
    async (updates: any) => {
      if (!currentTenant?.id) throw new Error('No tenant');
      
      const { data, error } = await supabase
        .from('tenant_settings')
        .upsert({
          tenant_id: currentTenant.id,
          ...updates
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Settings updated successfully!',
      invalidateQueries: [['tenant-settings']]
    }
  );

  const handleSave = async (formData: FormData) => {
    const urgentDaysThreshold = parseInt(formData.get('urgent_days_threshold') as string);
    const autoSendQuotes = formData.get('auto_send_quotes') === 'on';
    const slackWebhookUrl = formData.get('slack_webhook_url') as string;

    await updateSettingsMutation.mutateAsync({
      urgent_days_threshold: urgentDaysThreshold,
      auto_send_quotes: autoSendQuotes,
      slack_webhook_url: slackWebhookUrl || null
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Date Warning Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSave(new FormData(e.currentTarget));
          }} className="space-y-4">
            <div>
              <Label htmlFor="urgent_days_threshold">Urgent Event Threshold (Days)</Label>
              <Input
                id="urgent_days_threshold"
                name="urgent_days_threshold"
                type="number"
                min="1"
                max="30"
                defaultValue={settings?.urgent_days_threshold || 7}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Events within this many days will be highlighted as urgent
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto_send_quotes"
                name="auto_send_quotes"
                defaultChecked={settings?.auto_send_quotes}
              />
              <Label htmlFor="auto_send_quotes">Auto-send quotes for new inquiries</Label>
            </div>

            <div>
              <Label htmlFor="slack_webhook_url">Slack Webhook URL (Optional)</Label>
              <Input
                id="slack_webhook_url"
                name="slack_webhook_url"
                type="url"
                defaultValue={settings?.slack_webhook_url || ''}
                placeholder="https://hooks.slack.com/services/..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                Receive notifications for urgent events in Slack
              </p>
            </div>

            <Button type="submit">Save Settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};