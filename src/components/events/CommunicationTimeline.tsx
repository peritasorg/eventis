import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, MessageSquare, Phone, Mail, Calendar, Edit2, History } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
interface CommunicationTimelineProps {
  eventId: string;
}
export const CommunicationTimeline: React.FC<CommunicationTimelineProps> = ({
  eventId
}) => {
  const {
    currentTenant
  } = useAuth();
  const [isAddingCommunication, setIsAddingCommunication] = useState(false);
  const [editingCommunication, setEditingCommunication] = useState<any>(null);
  const [editReason, setEditReason] = useState('');
  const {
    data: communications,
    refetch
  } = useSupabaseQuery(['communications', eventId], async () => {
    if (!eventId || !currentTenant?.id) return [];
    const {
      data,
      error
    } = await supabase.from('event_communications').select('*').eq('event_id', eventId).eq('tenant_id', currentTenant.id).order('created_at', {
      ascending: false
    });
    if (error) {
      console.error('Communications error:', error);
      return [];
    }
    return data || [];
  });
  const addCommunicationMutation = useSupabaseMutation(async (communicationData: any) => {
    const {
      data,
      error
    } = await supabase.from('event_communications').insert([{
      ...communicationData,
      tenant_id: currentTenant?.id,
      event_id: eventId
    }]).select().single();
    if (error) throw error;
    return data;
  }, {
    successMessage: 'Communication logged successfully!',
    invalidateQueries: [['communications', eventId]],
    onSuccess: () => {
      setIsAddingCommunication(false);
    }
  });

  const editCommunicationMutation = useSupabaseMutation(async (editData: any) => {
    const { id, note, edit_reason } = editData;
    
    // Get the original communication and current user ID
    const { data: original, error: fetchError } = await supabase
      .from('event_communications')
      .select('note')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { data: userData } = await supabase.auth.getUser();
    
    const {
      data,
      error
    } = await supabase.from('event_communications').update({
      original_note: original.note,
      note: note,
      edited_at: new Date().toISOString(),
      edited_by: userData.user?.id,
      edit_reason: edit_reason
    }).eq('id', id).select().single();
    
    if (error) throw error;
    return data;
  }, {
    successMessage: 'Communication updated successfully!',
    invalidateQueries: [['communications', eventId]],
    onSuccess: () => {
      setEditingCommunication(null);
      setEditReason('');
    }
  });
  const handleAddCommunication = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const communicationData = {
      communication_type: formData.get('communication_type') as string,
      note: formData.get('note') as string,
      communication_date: formData.get('communication_date') as string || new Date().toISOString().split('T')[0]
    };
    addCommunicationMutation.mutate(communicationData);
  };

  const handleEditCommunication = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    editCommunicationMutation.mutate({
      id: editingCommunication.id,
      note: formData.get('note') as string,
      edit_reason: formData.get('edit_reason') as string
    });
  };
  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return Phone;
      case 'email':
        return Mail;
      case 'meeting':
        return MessageSquare;
      default:
        return MessageSquare;
    }
  };
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          
          <Dialog open={isAddingCommunication} onOpenChange={setIsAddingCommunication}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Communication
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Communication</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCommunication} className="space-y-4">
                <div>
                  <Label htmlFor="communication_type">Communication Type</Label>
                  <Select name="communication_type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">In-Person Meeting</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="note">Note</Label>
                  <Textarea id="note" name="note" placeholder="What was discussed..." required />
                </div>

                <div>
                  <Label htmlFor="communication_date">Date</Label>
                  <Input id="communication_date" name="communication_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddingCommunication(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addCommunicationMutation.isPending}>
                    {addCommunicationMutation.isPending ? 'Saving...' : 'Save Communication'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editingCommunication} onOpenChange={() => setEditingCommunication(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Communication</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditCommunication} className="space-y-4">
                <div>
                  <Label htmlFor="edit_reason">Reason for Edit (Required)</Label>
                  <Input 
                    id="edit_reason" 
                    name="edit_reason" 
                    placeholder="Why are you editing this communication?" 
                    required 
                  />
                </div>

                <div>
                  <Label htmlFor="edit_note">Note</Label>
                  <Textarea 
                    id="edit_note" 
                    name="note" 
                    defaultValue={editingCommunication?.note || ''} 
                    placeholder="What was discussed..." 
                    required 
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setEditingCommunication(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editCommunicationMutation.isPending}>
                    {editCommunicationMutation.isPending ? 'Updating...' : 'Update Communication'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {communications && communications.length > 0 ? <div className="space-y-4">
            {communications.map(comm => {
          const Icon = getCommunicationIcon(comm.communication_type);
          return <div key={comm.id} className="border-l-2 border-blue-200 pl-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Icon className="h-4 w-4 text-blue-600" />
                    </div>
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium capitalize">{comm.communication_type?.replace('_', ' ') || 'Note'}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {new Date(comm.communication_date || comm.created_at).toLocaleDateString('en-GB')}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingCommunication(comm)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{comm.note}</p>
                        {comm.edited_at && (
                          <div className="flex items-center gap-1 text-xs text-amber-600 mb-1">
                            <History className="h-3 w-3" />
                            Edited {new Date(comm.edited_at).toLocaleDateString('en-GB')}
                            {comm.edit_reason && ` - ${comm.edit_reason}`}
                            {comm.original_note && (
                              <span className="ml-2 text-gray-500">
                                (was: "{comm.original_note.substring(0, 50)}{comm.original_note.length > 50 ? '...' : ''}")
                              </span>
                            )}
                          </div>
                        )}
                     </div>
                  </div>
                </div>;
        })}
          </div> : <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No communications logged yet</p>
          </div>}
      </CardContent>
    </Card>;
};