import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedDate?: string;
}

export const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedDate
}) => {
  const [eventData, setEventData] = useState({
    event_name: '',
    event_start_date: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { currentTenant } = useAuth();
  const navigate = useNavigate();

  // Update event date when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setEventData(prev => ({ ...prev, event_start_date: selectedDate }));
    }
  }, [selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: eventData.event_name,
          event_date: eventData.event_start_date,
          tenant_id: currentTenant.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Event created successfully');
      onClose();
      onSuccess?.();
      
      // Reset form
      setEventData({ event_name: '', event_start_date: '' });
      
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
            <Label htmlFor="event_name">Event Title</Label>
            <Input
              id="event_name"
              value={eventData.event_name}
              onChange={(e) => handleChange('event_name', e.target.value)}
              placeholder="Enter event title"
              required
            />
          </div>
          <div>
            <Label htmlFor="event_start_date">Event Date</Label>
            <Input
              id="event_start_date"
              type="date"
              value={eventData.event_start_date}
              onChange={(e) => handleChange('event_start_date', e.target.value)}
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