
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Mail, Phone, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Event {
  id: string;
  event_name: string;
  event_type: string;
  event_date: string;
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
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
                      {formatDate(event.event_date)}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {event.start_time} - {event.end_time}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEventClick(event.id)}
                    className="h-7 w-7 p-0"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
