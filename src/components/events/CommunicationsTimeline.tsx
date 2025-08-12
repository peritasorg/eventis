import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { toast } from 'sonner';

interface CommunicationsTimelineProps {
  eventId: string;
}

export const CommunicationsTimeline: React.FC<CommunicationsTimelineProps> = ({ eventId }) => {
  const { currentTenant } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [communicationDate, setCommunicationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');

  // Fetch communications
  const { data: communications, refetch } = useSupabaseQuery(
    ['event_communications', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_communications')
        .select('*')
        .eq('event_id', eventId)
        .order('communication_date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  );

  // Add communication mutation
  const addCommunicationMutation = useSupabaseMutation(
    async () => {
      if (!eventId || !currentTenant?.id || !note.trim()) {
        throw new Error('Missing required data');
      }
      
      const { error } = await supabase
        .from('event_communications')
        .insert({
          event_id: eventId,
          tenant_id: currentTenant.id,
          communication_date: communicationDate,
          communication_type: 'note',
          note: note.trim()
        });
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Communication added successfully');
        setNote('');
        setCommunicationDate(format(new Date(), 'yyyy-MM-dd'));
        setIsDialogOpen(false);
        refetch();
      },
      onError: (error) => {
        toast.error('Failed to add communication: ' + error.message);
      }
    }
  );

  // Delete communication mutation
  const deleteCommunicationMutation = useSupabaseMutation(
    async (communicationId: string) => {
      if (!currentTenant?.id) throw new Error('Missing tenant ID');
      
      const { error } = await supabase
        .from('event_communications')
        .delete()
        .eq('id', communicationId)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Communication deleted successfully');
        refetch();
      },
      onError: (error) => {
        toast.error('Failed to delete communication: ' + error.message);
      }
    }
  );

  const handleAddCommunication = () => {
    addCommunicationMutation.mutate({});
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communications Timeline
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Communication
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Communication</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="communication_date">Date</Label>
                  <Input
                    id="communication_date"
                    type="date"
                    value={communicationDate}
                    onChange={(e) => setCommunicationDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Enter communication details..."
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleAddCommunication}
                  disabled={!note.trim() || addCommunicationMutation.isPending}
                  className="w-full"
                >
                  {addCommunicationMutation.isPending ? 'Adding...' : 'Add Note'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {communications && communications.length > 0 ? (
          <div className="space-y-3">
            {communications.map((comm) => (
              <div key={comm.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-shrink-0">
                  <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {format(new Date(comm.communication_date), 'dd/MM/yyyy')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comm.created_at), 'HH:mm')}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Communication</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this communication? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteCommunicationMutation.mutate(comm.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleteCommunicationMutation.isPending ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{comm.note}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No communications yet. Add your first note to track interactions.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};