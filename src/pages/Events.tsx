
import React, { useState } from 'react';
import { Plus, Calendar, List, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventCalendarView } from '@/components/events/EventCalendarView';
import { EventListView } from '@/components/events/EventListView';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { useNavigate } from 'react-router-dom';

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
      
      console.log('Fetched events:', data); // Debug log
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
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Events</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage your events and bookings</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <Tabs value={viewMode} onValueChange={(value: 'calendar' | 'list') => setViewMode(value)}>
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="calendar" className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Calendar</span>
                <span className="sm:hidden">Cal</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2 text-sm">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button 
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            onClick={() => setIsCreateEventOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Create Event</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <EventCalendarView 
          events={events || []}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
        />
      ) : (
        <EventListView 
          events={events || []}
          onEventClick={handleEventClick}
        />
      )}

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
