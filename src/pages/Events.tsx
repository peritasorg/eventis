
import React, { useState } from 'react';
import { Plus, Calendar, Clock, Users, MapPin, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const Events = () => {
  const { currentTenant } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentDate] = useState(new Date());

  const { data: events, refetch } = useSupabaseQuery(
    ['events'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          customers (
            name,
            email,
            phone
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .order('event_date', { ascending: true });
      
      if (error) {
        console.error('Events error:', error);
        return [];
      }
      
      return data || [];
    }
  );

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
      invalidateQueries: [['events']],
      onSuccess: () => {
        setIsCreateEventOpen(false);
      }
    }
  );

  const updateEventMutation = useSupabaseMutation(
    async (eventData: any) => {
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', selectedEvent.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Event updated successfully!',
      invalidateQueries: [['events']],
      onSuccess: () => {
        setSelectedEvent(null);
      }
    }
  );

  const handleCreateEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const eventData = {
      event_name: formData.get('event_name') as string,
      event_type: formData.get('event_type') as string,
      event_date: formData.get('event_date') as string,
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      estimated_guests: parseInt(formData.get('estimated_guests') as string) || 0,
      customer_id: formData.get('customer_id') as string || null,
      status: 'inquiry',
      internal_notes: formData.get('internal_notes') as string,
    };

    createEventMutation.mutate(eventData);
  };

  const handleUpdateEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const eventData = {
      event_name: formData.get('event_name') as string,
      event_type: formData.get('event_type') as string,
      event_date: formData.get('event_date') as string,
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      estimated_guests: parseInt(formData.get('estimated_guests') as string) || 0,
      customer_id: formData.get('customer_id') as string || null,
      status: formData.get('status') as string,
      internal_notes: formData.get('internal_notes') as string,
    };

    updateEventMutation.mutate(eventData);
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setIsCreateEventOpen(true);
  };

  const generateCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return events?.filter(event => event.event_date === dateString) || [];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'inquiry': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calendarDays = generateCalendar();
  const today = new Date().toDateString();

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Events</h1>
          <p className="text-gray-600">Manage your events and bookings</p>
        </div>
        
        <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4">
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
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_date">Event Date *</Label>
                  <Input 
                    id="event_date" 
                    name="event_date" 
                    type="date" 
                    defaultValue={selectedDate}
                    required 
                  />
                </div>
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
                <Button type="button" variant="outline" onClick={() => setIsCreateEventOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date, index) => {
              const isToday = date.toDateString() === today;
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const dayEvents = getEventsForDate(date);
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[100px] p-2 border border-gray-200 rounded-lg cursor-pointer transition-colors
                    ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'}
                    ${!isCurrentMonth ? 'opacity-50' : ''}
                  `}
                  onClick={() => handleDateClick(date.toISOString().split('T')[0])}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs p-1 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        title={`${event.event_name} - ${event.start_time}`}
                      >
                        {event.event_name}
                      </div>
                    ))}
                    
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_event_name">Event Name *</Label>
                  <Input 
                    id="edit_event_name" 
                    name="event_name" 
                    defaultValue={selectedEvent.event_name}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_status">Status</Label>
                  <Select name="status" defaultValue={selectedEvent.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inquiry">Inquiry</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_event_type">Event Type</Label>
                  <Select name="event_type" defaultValue={selectedEvent.event_type}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="corporate">Corporate Event</SelectItem>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="anniversary">Anniversary</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_estimated_guests">Estimated Guests</Label>
                  <Input 
                    id="edit_estimated_guests" 
                    name="estimated_guests" 
                    type="number"
                    defaultValue={selectedEvent.estimated_guests}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_event_date">Event Date</Label>
                  <Input 
                    id="edit_event_date" 
                    name="event_date" 
                    type="date"
                    defaultValue={selectedEvent.event_date}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_start_time">Start Time</Label>
                  <Input 
                    id="edit_start_time" 
                    name="start_time" 
                    type="time"
                    defaultValue={selectedEvent.start_time}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_end_time">End Time</Label>
                  <Input 
                    id="edit_end_time" 
                    name="end_time" 
                    type="time"
                    defaultValue={selectedEvent.end_time}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_customer_id">Customer</Label>
                <Select name="customer_id" defaultValue={selectedEvent.customer_id}>
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
              
              {selectedEvent.customers && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {selectedEvent.customers.name}
                    </div>
                    {selectedEvent.customers.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {selectedEvent.customers.email}
                      </div>
                    )}
                    {selectedEvent.customers.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {selectedEvent.customers.phone}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="edit_internal_notes">Internal Notes</Label>
                <Textarea 
                  id="edit_internal_notes" 
                  name="internal_notes"
                  defaultValue={selectedEvent.internal_notes}
                  placeholder="Any internal notes..." 
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setSelectedEvent(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateEventMutation.isPending}>
                  {updateEventMutation.isPending ? 'Updating...' : 'Update Event'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
