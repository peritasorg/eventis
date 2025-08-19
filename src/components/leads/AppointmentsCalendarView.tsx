import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Clock, User, Phone, Mail } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-GB': enGB },
});

interface AppointmentsCalendarViewProps {
  leads: any[];
  eventTypeConfigs: any[];
}

export const AppointmentsCalendarView: React.FC<AppointmentsCalendarViewProps> = ({
  leads,
  eventTypeConfigs
}) => {
  const navigate = useNavigate();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filter leads that have appointment dates and convert to calendar events
  const appointments = leads
    .filter(lead => lead.appointment_date)
    .map(lead => {
      const eventConfig = eventTypeConfigs.find(config => config.event_type === lead.event_type);
      return {
        id: lead.id,
        title: `${lead.name} - ${eventConfig?.display_name || lead.event_type}`,
        start: new Date(lead.appointment_date),
        end: new Date(new Date(lead.appointment_date).getTime() + 60 * 60 * 1000), // 1 hour duration
        resource: lead,
        style: {
          backgroundColor: eventConfig?.color || '#3B82F6',
          borderColor: eventConfig?.color || '#3B82F6',
          color: eventConfig?.text_color || '#FFFFFF'
        }
      };
    });

  const handleSelectEvent = (event: any) => {
    setSelectedAppointment(event.resource);
    setIsDetailOpen(true);
  };

  const eventStyleGetter = (event: any) => {
    return {
      style: event.style
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'secondary';
      case 'contacted': return 'default';
      case 'qualified': return 'outline';
      case 'quoted': return 'outline';
      case 'won': return 'default';
      case 'lost': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appointment Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={appointments}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              views={['month', 'week', 'day']}
              defaultView="month"
              popup
              className="bg-background"
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
            {appointments
              .filter(apt => apt.start >= new Date())
              .sort((a, b) => a.start.getTime() - b.start.getTime())
              .slice(0, 5)
              .map(appointment => {
                const lead = appointment.resource;
                const eventConfig = eventTypeConfigs.find(config => config.event_type === lead.event_type);
                return (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {format(appointment.start, 'dd/MM/yyyy HH:mm')}
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
                          {lead.status}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      View Lead
                    </Button>
                  </div>
                );
              })}
            
            {appointments.filter(apt => apt.start >= new Date()).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming appointments scheduled
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appointment Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">{selectedAppointment.name}</h3>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {format(new Date(selectedAppointment.appointment_date), 'EEEE, dd MMMM yyyy')}
                </div>
              </div>
              
              <div className="space-y-2">
                {selectedAppointment.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3 w-3" />
                    {selectedAppointment.email}
                  </div>
                )}
                {selectedAppointment.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3" />
                    {selectedAppointment.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3 w-3" />
                  {selectedAppointment.men_count + selectedAppointment.ladies_count} guests 
                  ({selectedAppointment.guest_mixture})
                </div>
              </div>

              <div className="flex gap-2">
                <Badge variant={getStatusColor(selectedAppointment.status)}>
                  {selectedAppointment.status}
                </Badge>
                {eventTypeConfigs.find(config => config.event_type === selectedAppointment.event_type) && (
                  <Badge variant="outline">
                    {eventTypeConfigs.find(config => config.event_type === selectedAppointment.event_type)?.display_name}
                  </Badge>
                )}
              </div>

              {selectedAppointment.notes && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => navigate(`/leads/${selectedAppointment.id}`)}
                  className="flex-1"
                >
                  View Full Lead
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/leads/${selectedAppointment.id}/edit`)}
                  className="flex-1"
                >
                  Edit Lead
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};