
import React, { useState } from 'react';
import { Plus, Calendar, List, Filter, Search, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventCalendarView } from '@/components/events/EventCalendarView';
import { EventListView } from '@/components/events/EventListView';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { useNavigate } from 'react-router-dom';
import { AppControls } from '@/components/AppControls';

export const Events = () => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

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
        .order('event_start_date', { ascending: true });
      
      if (error) {
        console.error('Events error:', error);
        return [];
      }
      
      console.log('Fetched events:', data);
      return data || [];
    }
  );

  const handleEventClick = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setIsCreateEventOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Events</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your event bookings and enquiries</p>
            </div>
            <div className="flex items-center gap-3">
              <AppControls />
              <Button
                onClick={() => setIsCreateEventOpen(true)}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-background border border-border rounded-md">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`rounded-r-none border-r ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className={`rounded-l-none ${viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  className="pl-10 w-64 h-9"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {viewMode === 'list' ? (
          <EventListView 
            events={events || []}
            onEventClick={handleEventClick}
          />
        ) : (
          <div className="p-6">
            <EventCalendarView 
              events={events || []}
              onEventClick={handleEventClick}
              onDateClick={handleDateClick}
            />
          </div>
        )}
      </div>

      <CreateEventDialog
        open={isCreateEventOpen}
        onOpenChange={setIsCreateEventOpen}
        selectedDate={selectedDate}
        onSuccess={() => {
          refetch();
          setIsCreateEventOpen(false);
        }}
      />
    </div>
  );
};
