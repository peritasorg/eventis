import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CalendarReconciliation() {
  const [isLoading, setIsLoading] = useState(false);
  const [targetDate, setTargetDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const handleDeleteAllGoogleEvents = async () => {
    if (!confirm(`Are you sure you want to delete ALL Google Calendar events from ${targetDate} onwards? This cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendar-reconciliation', {
        body: {
          action: 'delete-all',
          targetDate: `${targetDate}T00:00:00Z`
        }
      });

      if (error) throw error;

      toast.success(`Deleted ${data.data.deletedCount} Google Calendar events`);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Delete failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncAllEvents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendar-reconciliation', {
        body: {
          action: 'sync-all',
          targetDate: `${targetDate}T00:00:00Z`
        }
      });

      if (error) throw error;

      toast.success(`Synced ${data.data.syncedCount} events to Google Calendar`);
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Management
        </CardTitle>
        <CardDescription>
          Simple calendar synchronization - delete all Google Calendar events from a date, then sync all your app events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="target-date">Start Date</Label>
            <Input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Operations will affect events from this date onwards
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Recommended Process</h4>
              <ol className="mt-2 text-sm text-yellow-700 list-decimal list-inside space-y-1">
                <li>First, delete all Google Calendar events from your selected date</li>
                <li>Then, sync all your app events to Google Calendar</li>
                <li>This ensures a clean sync with proper external ID tracking</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Button
            onClick={handleDeleteAllGoogleEvents}
            disabled={isLoading}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : null}
            Delete All Google Events
          </Button>
          
          <Button
            onClick={handleSyncAllEvents}
            disabled={isLoading}
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : null}
            Sync All App Events
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}