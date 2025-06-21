
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupabaseMutation, useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: string;
  onSuccess: () => void;
}

export const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  open,
  onOpenChange,
  selectedDate,
  onSuccess
}) => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const [isMultipleDays, setIsMultipleDays] = useState(false);

  const { data: customers } = useSupabaseQuery(
    ['customers'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);
      
      if (error) {
        console.error('Customers error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const createEventMutation = useSupabaseMutation(
    async (eventData: any) => {
      const { data, error } = await supabase
        .from('events')
        .insert([{
          ...eventData,
          tenant_id: currentTenant?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Event created successfully!',
      onSuccess: (data) => {
        onSuccess();
        // Navigate to the new event's detail page
        navigate(`/events/${data.id}`);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const startDate = formData.get('event_start_date') as string;
    const endDate = isMultipleDays ? (formData.get('event_end_date') as string) : startDate;
    
    const eventData = {
      event_name: formData.get('event_name') as string,
      event_type: formData.get('event_type') as string,
      event_start_date: startDate,
      event_end_date: endDate,
      event_multiple_days: isMultipleDays,
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      estimated_guests: parseInt(formData.get('estimated_guests') as string) || 0,
      customer_id: formData.get('customer_id') as string || null,
      status: 'inquiry',
      internal_notes: formData.get('internal_notes') as string,
    };

    createEventMutation.mutate(eventData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_name">Event Name *</Label>
              <Input id="event_name" name="event_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type *</Label>
              <Select name="event_type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="corporate">Corporate Event</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="anniversary">Anniversary</SelectItem>
                  <SelectItem value="religious">Religious Event</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="event_multiple_days"
                checked={isMultipleDays}
                onCheckedChange={(checked) => setIsMultipleDays(checked as boolean)}
              />
              <Label htmlFor="event_multiple_days">Multiple day event</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_start_date">Event Start Date *</Label>
                <Input 
                  id="event_start_date" 
                  name="event_start_date" 
                  type="date" 
                  defaultValue={selectedDate}
                  required 
                />
              </div>
              {isMultipleDays && (
                <div className="space-y-2">
                  <Label htmlFor="event_end_date">Event End Date *</Label>
                  <Input 
                    id="event_end_date" 
                    name="event_end_date" 
                    type="date" 
                    required 
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input id="start_time" name="start_time" type="time" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input id="end_time" name="end_time" type="time" required />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_guests">Estimated Guests</Label>
              <Input id="estimated_guests" name="estimated_guests" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer</Label>
              <Select name="customer_id">
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="internal_notes">Internal Notes</Label>
            <Textarea id="internal_notes" name="internal_notes" placeholder="Any internal notes..." />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? 'Creating...' : 'Create & Open Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
