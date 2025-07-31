import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Mail, Phone, Eye, CalendarPlus, FileText, MoreHorizontal } from 'lucide-react';
import { useManualEventSync } from '@/hooks/useCalendarSync';
import { calendarSyncService } from '@/services/calendarSync';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'inquiry': 
        return <Badge className="bg-status-discovery text-status-discovery-foreground text-xs">Discovery</Badge>;
      case 'confirmed': 
        return <Badge className="bg-status-proposal text-status-proposal-foreground text-xs">Proposal</Badge>;
      case 'completed': 
        return <Badge className="bg-status-won text-status-won-foreground text-xs">Won</Badge>;
      case 'cancelled': 
        return <Badge className="bg-status-closed text-status-closed-foreground text-xs">Closed</Badge>;
      default: 
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
    try {
      if (timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const min = parseInt(minutes);
        if (isNaN(hour) || isNaN(min)) return timeString;
        
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
      }
      return timeString;
    } catch (error) {
      return timeString;
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-card">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No events found</h3>
        <p className="text-muted-foreground text-center">Create your first event to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-card">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <div className="col-span-3">Event</div>
        <div className="col-span-2">Customer</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1">Guests</div>
        <div className="col-span-2">Value</div>
        <div className="col-span-1">Actions</div>
      </div>

      {/* Event Rows */}
      <div className="divide-y divide-border">
        {events.map((event) => (
          <div 
            key={event.id} 
            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer group"
            onClick={() => onEventClick(event.id)}
          >
            {/* Event Details */}
            <div className="col-span-3">
              <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                {event.event_name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{event.event_type}</div>
            </div>

            {/* Customer */}
            <div className="col-span-2">
              {event.customers ? (
                <div>
                  <div className="font-medium text-sm text-foreground">{event.customers.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />
                    {event.customers.email}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">No customer assigned</span>
              )}
            </div>

            {/* Date & Time */}
            <div className="col-span-2">
              <div className="text-sm font-medium text-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(event.event_start_date || event.event_date)}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {formatTime(event.start_time)} - {formatTime(event.end_time)}
              </div>
            </div>

            {/* Status */}
            <div className="col-span-1 flex items-center">
              {getStatusBadge(event.status)}
            </div>

            {/* Guests */}
            <div className="col-span-1 flex items-center">
              <div className="text-sm flex items-center gap-1 text-foreground">
                <Users className="h-3 w-3" />
                {event.estimated_guests}
              </div>
            </div>

            {/* Value */}
            <div className="col-span-2 flex items-center">
              {event.total_amount ? (
                <div className="text-sm font-medium text-success">
                  £{event.total_amount.toLocaleString()}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">TBD</span>
              )}
            </div>

            {/* Actions */}
            <div className="col-span-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEventClick(event.id)}
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="View Event"
              >
                <Eye className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/events/${event.id}/form`)}
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Event Form"
              >
                <FileText className="h-4 w-4" />
              </Button>

              {showSyncButtons && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSyncToCalendar(event.id, event.event_name)}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Sync to Calendar"
                >
                  <CalendarPlus className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="More Options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};