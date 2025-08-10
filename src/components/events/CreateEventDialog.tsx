import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { currentTenant } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('new_events')
        .insert({
          title: eventData.title,
          description: eventData.description,
          event_date: eventData.start_date,
          tenant_id: currentTenant.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Event created successfully');
      onClose();
      onSuccess?.();
      navigate(`/events/${data.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              value={eventData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter event title"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={eventData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter event description"
            />
          </div>
          <div>
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={eventData.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={eventData.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};