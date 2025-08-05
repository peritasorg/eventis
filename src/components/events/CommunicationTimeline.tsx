import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, MessageSquare, Phone, Mail, Calendar } from 'lucide-react';
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
  const {
    data: communications,
    refetch
  } = useSupabaseQuery(['communications', eventId], async () => {
    if (!eventId || !currentTenant?.id) return [];
    const {
      data,
      error
    } = await supabase.from('communication_timeline').select('*').eq('event_id', eventId).eq('tenant_id', currentTenant.id).order('created_at', {
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
    } = await supabase.from('communication_timeline').insert([{
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
  const handleAddCommunication = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const communicationData = {
      communication_type: formData.get('communication_type') as string,
      summary: formData.get('summary') as string,
      follow_up_required: formData.get('follow_up_required') === 'on',
      follow_up_date: formData.get('follow_up_date') as string || null
    };
    addCommunicationMutation.mutate(communicationData);
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
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea id="summary" name="summary" placeholder="What was discussed..." required />
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="follow_up_required" name="follow_up_required" className="rounded" />
                  <Label htmlFor="follow_up_required">Follow-up required</Label>
                </div>

                <div>
                  <Label htmlFor="follow_up_date">Follow-up Date</Label>
                  <Input id="follow_up_date" name="follow_up_date" type="date" />
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
                        <span className="font-medium capitalize">{comm.communication_type.replace('_', ' ')}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(comm.created_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{comm.summary}</p>
                      {comm.follow_up_required && <div className="flex items-center gap-2 text-xs text-orange-600">
                          <Calendar className="h-3 w-3" />
                          Follow-up: {comm.follow_up_date ? new Date(comm.follow_up_date).toLocaleDateString('en-GB') : 'TBD'}
                        </div>}
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