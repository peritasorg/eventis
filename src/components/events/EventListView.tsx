import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Mail, Phone, Eye, CalendarPlus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useManualEventSync } from '@/hooks/useCalendarSync';
import { calendarSyncService } from '@/services/calendarSync';
import { toast } from 'sonner';

interface Event {
  id: string;
  event_name: string;
  event_type: string;
  event_date: string;
  event_start_date?: string;
  start_time: string;
  end_time: string;
  estimated_guests: number;
  status: string;
  total_amount?: number;
  customers?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface EventListViewProps {
  events: Event[];
  onEventClick: (eventId: string) => void;
}

export const EventListView: React.FC<EventListViewProps> = ({
  events,
  onEventClick
}) => {
  const [showSyncButtons, setShowSyncButtons] = useState(false);
  const { syncEvent } = useManualEventSync();

  // Check if manual sync buttons should be shown
  useEffect(() => {
    const checkSyncPreferences = async () => {
      try {
        const integrations = await calendarSyncService.getIntegrations();
        for (const integration of integrations) {
          const preferences = await calendarSyncService.getPreferences(integration.id);
          if (preferences && !preferences.auto_sync) {
            setShowSyncButtons(true);
            return;
          }
        }
        setShowSyncButtons(false);
      } catch (error) {
        console.error('Failed to check sync preferences:', error);
      }
    };
    
    checkSyncPreferences();
  }, []);

  const handleSyncToCalendar = async (eventId: string, eventName: string) => {
    try {
      toast.loading('Syncing event to calendar...', { id: eventId });
      const results = await syncEvent(eventId, 'create');
      
      // Check if any integration was successful
      const successful = results.some(result => result.success);
      
      if (successful) {
        toast.success(`"${eventName}" synced to calendar!`, { id: eventId });
      } else {
        toast.error('Failed to sync event to calendar', { id: eventId });
      }
    } catch (error) {
      console.error('Error syncing event:', error);
      toast.error('Failed to sync event to calendar', { id: eventId });
    }
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
    try {
      // Handle time strings that might be in different formats
      if (timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const min = parseInt(minutes);
        if (isNaN(hour) || isNaN(min)) return timeString;
        
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${period}`;
      }
      return timeString;
    } catch (error) {
      console.error('Time formatting error:', error);
      return timeString;
    }
  };

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600 text-center">Create your first event to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Event Details</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} className="hover:bg-gray-50">
                <TableCell>
                  <div>
                    <div className="font-medium text-sm">{event.event_name}</div>
                    <div className="text-xs text-gray-600">{event.event_type}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {event.customers ? (
                    <div>
                      <div className="font-medium text-sm">{event.customers.name}</div>
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {event.customers.email}
                      </div>
                      {event.customers.phone && (
                        <div className="text-xs text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {event.customers.phone}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">No customer assigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(event.event_start_date || event.event_date)}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(event.start_time)} - {formatTime(event.end_time)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {event.estimated_guests}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(event.status)}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {event.total_amount ? (
                    <div className="text-sm font-medium text-green-600">
                      £{event.total_amount.toLocaleString()}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">TBD</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEventClick(event.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    {showSyncButtons && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSyncToCalendar(event.id, event.event_name)}
                        className="h-7 w-7 p-0"
                        title="Sync to Calendar"
                      >
                        <CalendarPlus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
