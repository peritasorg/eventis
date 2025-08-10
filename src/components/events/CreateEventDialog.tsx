import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
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
    title: '',
    event_date: '',
    event_end_date: '',
    event_type: '',
    is_multi_day: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const { currentTenant } = useAuth();
  const navigate = useNavigate();

  // Fetch event types for dropdown
  const { data: eventTypes } = useSupabaseQuery(
    ['event_type_configs', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_type_configs')
        .select('event_type, display_name')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  );

  // Update event date when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setEventData(prev => ({ 
        ...prev, 
        event_date: selectedDate,
        event_end_date: selectedDate 
      }));
    }
  }, [selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id) return;

    setIsLoading(true);
    try {
      const eventPayload = {
        title: eventData.title,
        event_date: eventData.event_date,
        tenant_id: currentTenant.id,
        ...(eventData.event_type && { event_type: eventData.event_type }),
        ...(eventData.is_multi_day && eventData.event_end_date && {
          event_end_date: eventData.event_end_date
        })
      };

      const { data, error } = await supabase
        .from('events')
        .insert([eventPayload])
        .select()
        .single();

      if (error) throw error;

      toast.success('Event created successfully');
      onClose();
      onSuccess?.();
      
      // Reset form
      setEventData({ title: '', event_date: '', event_end_date: '', event_type: '', is_multi_day: false });
      
      navigate(`/events/${data.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiDayChange = (checked: boolean) => {
    setEventData(prev => ({ 
      ...prev, 
      is_multi_day: checked,
      event_end_date: checked ? prev.event_end_date : prev.event_date
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                name="title"
                value={eventData.title}
                onChange={handleChange}
                placeholder="Enter event title"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="event_type">Event Type</Label>
              <Select value={eventData.event_type} onValueChange={(value) => setEventData(prev => ({ ...prev, event_type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes?.map((type) => (
                    <SelectItem key={type.event_type} value={type.event_type}>
                      {type.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="event_date">Start Date</Label>
              <Input
                id="event_date"
                name="event_date"
                type="date"
                value={eventData.event_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="multi_day"
                checked={eventData.is_multi_day}
                onCheckedChange={handleMultiDayChange}
              />
              <Label htmlFor="multi_day">Multi-day event</Label>
            </div>

            {eventData.is_multi_day && (
              <div>
                <Label htmlFor="event_end_date">End Date</Label>
                <Input
                  id="event_end_date"
                  name="event_end_date"
                  type="date"
                  value={eventData.event_end_date}
                  onChange={handleChange}
                  min={eventData.event_date}
                  required
                />
              </div>
            )}
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