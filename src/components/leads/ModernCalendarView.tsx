import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, User, Phone, Mail, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-GB': enGB },
});

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'new' | 'in_progress' | 'converted';
  event_type: string;
  created_at: string;
  appointment_date: string;
  date_of_contact: string;
  men_count: number;
  ladies_count: number;
  guest_mixture: string;
  date_of_interest: string;
  estimated_budget: number;
  notes: string;
  lead_score: number;
  conversion_date?: string;
  event_date?: string;
}

interface EventTypeConfig {
  id: string;
  event_type: string;
  display_name: string;
  color: string;
  text_color: string;
}

interface ModernCalendarViewProps {
  leads: Lead[];
  eventTypeConfigs: EventTypeConfig[];
  onLeadClick: (lead: Lead) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Lead;
  style: {
    backgroundColor: string;
    borderColor: string;
    color: string;
  };
}

export const ModernCalendarView: React.FC<ModernCalendarViewProps> = ({
  leads,
  eventTypeConfigs,
  onLeadClick
}) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Convert leads to calendar events
  const events: CalendarEvent[] = leads
    .filter(lead => lead.appointment_date || lead.event_date)
    .map(lead => {
      const eventConfig = eventTypeConfigs.find(config => config.event_type === lead.event_type);
      const eventDate = lead.appointment_date || lead.event_date;
      const startDate = new Date(eventDate);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

      return {
        id: lead.id,
        title: `${lead.name}${eventConfig ? ` - ${eventConfig.display_name}` : ''}`,
        start: startDate,
        end: endDate,
        resource: lead,
        style: {
          backgroundColor: eventConfig?.color || '#3B82F6',
          borderColor: eventConfig?.color || '#3B82F6',
          color: eventConfig?.text_color || '#FFFFFF'
        }
      };
    });

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleEventClick = (lead: Lead) => {
    onLeadClick(lead);
    setSelectedEvent(null);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        ...event.style,
        borderRadius: '6px',
        border: `2px solid ${event.style.borderColor}`,
        fontSize: '12px',
        fontWeight: '500',
        padding: '2px 6px',
      }
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'secondary';
      case 'in_progress': return 'default';
      case 'converted': return 'default';
      default: return 'secondary';
    }
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const lead = event.resource;
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="w-full h-full cursor-pointer">
            <div className="text-xs font-medium truncate">{lead.name}</div>
            <div className="text-xs opacity-75 truncate">
              {eventTypeConfigs.find(c => c.event_type === lead.event_type)?.display_name}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80" side="top">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{lead.name}</h3>
              <Badge variant={getStatusColor(lead.status)}>
                {lead.status === 'in_progress' ? 'In Progress' : 
                 lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.email}</span>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{lead.men_count + lead.ladies_count} guests ({lead.guest_mixture})</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {lead.appointment_date 
                    ? format(new Date(lead.appointment_date), 'EEEE, dd MMMM yyyy')
                    : format(new Date(lead.event_date!), 'EEEE, dd MMMM yyyy')
                  }
                </span>
              </div>
              {lead.estimated_budget && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">£{lead.estimated_budget.toLocaleString()}</span>
                </div>
              )}
            </div>
            
            {lead.notes && (
              <div className="pt-2 border-t">
                <h4 className="font-medium text-sm mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground">{lead.notes}</p>
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => handleEventClick(lead)}
                className="flex-1"
                size="sm"
              >
                Edit Lead
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Appointments Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: '700px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              components={{
                event: CustomEvent,
              }}
              views={['month', 'week', 'day', 'agenda']}
              defaultView="month"
              popup={false}
              className="modern-calendar"
              formats={{
                monthHeaderFormat: (date) => format(date, 'MMMM yyyy'),
                dayHeaderFormat: (date) => format(date, 'EEEE dd/MM'),
                dayRangeHeaderFormat: ({ start, end }) => 
                  `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`,
                agendaDateFormat: (date) => format(date, 'dd/MM/yyyy'),
                agendaTimeRangeFormat: ({ start, end }) => 
                  `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
              }}
              step={60}
              timeslots={1}
              min={new Date(2024, 0, 1, 8, 0, 0)}
              max={new Date(2024, 0, 1, 22, 0, 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Appointments Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events
              .filter(event => event.start >= new Date())
              .sort((a, b) => a.start.getTime() - b.start.getTime())
              .slice(0, 5)
              .map(event => {
                const lead = event.resource;
                const eventConfig = eventTypeConfigs.find(config => config.event_type === lead.event_type);
                return (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {format(event.start, 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {eventConfig && (
                          <Badge 
                            variant="outline" 
                            style={{ 
                              backgroundColor: eventConfig.color + '20',
                              borderColor: eventConfig.color,
                              color: eventConfig.text_color 
                            }}
                          >
                            {eventConfig.display_name}
                          </Badge>
                        )}
                        <Badge variant={getStatusColor(lead.status)}>
                          {lead.status === 'in_progress' ? 'In Progress' : 
                           lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onLeadClick(lead)}
                    >
                      Edit Lead
                    </Button>
                  </div>
                );
              })}
            
            {events.filter(event => event.start >= new Date()).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming appointments scheduled
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};