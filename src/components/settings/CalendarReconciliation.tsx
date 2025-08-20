import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Trash2, 
  RefreshCw,
  Eye,
  Play,
  BarChart3
} from 'lucide-react';

interface ReconciliationAnalysis {
  totalGoogleEvents: number;
  eventsToDelete: any[];
  appEventsToSync: any[];
  matchedEvents: any[];
  duplicateRisk: number;
}

interface ReconciliationStats {
  total_events: number;
  events_with_external_id: number;
  events_without_external_id: number;
  percentage_synced: number;
}

export const CalendarReconciliation = () => {
  const [analysis, setAnalysis] = useState<ReconciliationAnalysis | null>(null);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'analyze' | 'cleanup' | 'sync' | 'complete'>('analyze');
  const [progress, setProgress] = useState(0);

  const targetDate = '2025-08-01T00:00:00Z';

  const runAnalysis = async () => {
    setLoading(true);
    try {
      toast.info('Analyzing your Google Calendar and app events...');
      
      const { data, error } = await supabase.functions.invoke('calendar-reconciliation', {
        body: { 
          action: 'analyze',
          targetDate 
        }
      });

      if (error) throw error;

      setAnalysis(data.data);
      setStep('cleanup');
      toast.success(`Analysis complete! Found ${data.data.totalGoogleEvents} Google Calendar events`);
      
    } catch (error: any) {
      toast.error(`Analysis failed: ${error.message}`);
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const performCleanup = async (dryRun: boolean = false) => {
    if (!analysis) return;
    
    setLoading(true);
    try {
      const actionText = dryRun ? 'Previewing cleanup' : 'Cleaning up Google Calendar';
      toast.info(`${actionText} - ${analysis.eventsToDelete.length} events...`);
      
      const { data, error } = await supabase.functions.invoke('calendar-reconciliation', {
        body: { 
          action: 'cleanup',
          eventsToDelete: analysis.eventsToDelete,
          dryRun 
        }
      });

      if (error) throw error;

      if (dryRun) {
        toast.success(`Cleanup preview complete! Would delete ${data.data.deletedCount} events`);
      } else {
        toast.success(`Cleanup complete! Deleted ${data.data.deletedCount} events`);
        setStep('sync');
        setProgress(50);
      }
      
    } catch (error: any) {
      toast.error(`Cleanup failed: ${error.message}`);
      console.error('Cleanup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const performBulkSync = async (dryRun: boolean = false) => {
    if (!analysis) return;
    
    setLoading(true);
    try {
      const actionText = dryRun ? 'Previewing sync' : 'Syncing events to Google Calendar';
      toast.info(`${actionText} - ${analysis.appEventsToSync.length} events...`);
      
      const { data, error } = await supabase.functions.invoke('calendar-reconciliation', {
        body: { 
          action: 'bulk-sync',
          appEventsToSync: analysis.appEventsToSync,
          dryRun 
        }
      });

      if (error) throw error;

      if (dryRun) {
        toast.success(`Sync preview complete! Would sync ${data.data.syncedCount} events`);
      } else {
        toast.success(`Bulk sync complete! Synced ${data.data.syncedCount} events`);
        setStep('complete');
        setProgress(100);
        await loadStats(); // Refresh stats
      }
      
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
      console.error('Sync error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_reconciliation_stats');
      if (error) throw error;
      setStats(data[0] || null);
    } catch (error: any) {
      console.error('Stats error:', error);
    }
  };

  const resetReconciliation = () => {
    setAnalysis(null);
    setStats(null);
    setStep('analyze');
    setProgress(0);
  };

  React.useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Calendar Sync Status
          </CardTitle>
          <CardDescription>
            Current state of your calendar synchronization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.total_events}</div>
                <div className="text-sm text-muted-foreground">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.events_with_external_id}</div>
                <div className="text-sm text-muted-foreground">Synced</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.events_without_external_id}</div>
                <div className="text-sm text-muted-foreground">Unsynced</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.percentage_synced}%</div>
                <div className="text-sm text-muted-foreground">Sync Rate</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading statistics...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconciliation Process */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Calendar Reconciliation
          </CardTitle>
          <CardDescription>
            Clean up your Google Calendar and establish perfect sync with your app events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This process will delete Google Calendar events from August 2025 onwards and recreate them from your app. 
              <strong> Always run in preview mode first!</strong>
            </AlertDescription>
          </Alert>

          {/* Progress Bar */}
          {progress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Reconciliation Progress</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Step 1: Analysis */}
          {step === 'analyze' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">1</span>
                </div>
                <div>
                  <h3 className="font-medium">Analyze Calendar State</h3>
                  <p className="text-sm text-muted-foreground">
                    Analyze your Google Calendar and app events to plan the reconciliation
                  </p>
                </div>
              </div>
              
              <Button onClick={runAnalysis} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Start Analysis
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Cleanup Preview/Execute */}
          {step === 'cleanup' && analysis && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-orange-600">2</span>
                </div>
                <div>
                  <h3 className="font-medium">Clean Up Google Calendar</h3>
                  <p className="text-sm text-muted-foreground">
                    Remove {analysis.eventsToDelete.length} events that don't match your app events
                  </p>
                </div>
              </div>

              {/* Analysis Results */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-lg font-semibold">{analysis.totalGoogleEvents}</div>
                    <div className="text-sm text-muted-foreground">Google Calendar Events</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{analysis.appEventsToSync.length}</div>
                    <div className="text-sm text-muted-foreground">App Events to Sync</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{analysis.eventsToDelete.length}</div>
                    <div className="text-sm text-muted-foreground">Events to Delete</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{analysis.matchedEvents.length}</div>
                    <div className="text-sm text-muted-foreground">Potential Matches</div>
                  </div>
                </div>
                
                {analysis.duplicateRisk > 20 && (
                  <Badge variant="destructive" className="text-xs">
                    High duplicate risk: {analysis.duplicateRisk}%
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => performCleanup(true)}
                  disabled={loading}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Cleanup
                </Button>
                <Button 
                  onClick={() => performCleanup(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Execute Cleanup
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Bulk Sync */}
          {step === 'sync' && analysis && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-green-600">3</span>
                </div>
                <div>
                  <h3 className="font-medium">Sync App Events</h3>
                  <p className="text-sm text-muted-foreground">
                    Create {analysis.appEventsToSync.length} events in Google Calendar and link them
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => performBulkSync(true)}
                  disabled={loading}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Sync
                </Button>
                <Button 
                  onClick={() => performBulkSync(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Execute Sync
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-green-600">Reconciliation Complete!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your calendar is now perfectly synced. All future updates will propagate automatically.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={loadStats} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Stats
                </Button>
                <Button variant="outline" onClick={resetReconciliation} className="flex-1">
                  Reset Process
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};