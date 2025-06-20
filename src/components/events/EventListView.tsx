
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Mail, Phone, Eye } from 'lucide-react';

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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600 text-center">Create your first event to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <Card key={event.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {event.event_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{event.event_type}</p>
                    <Badge className={getStatusColor(event.status)}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEventClick(event.id)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {formatDate(event.event_date)}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {event.start_time} - {event.end_time}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    {event.estimated_guests} guests
                  </div>

                  {event.customers && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        {event.customers.name}
                      </div>
                      
                      {event.customers.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          {event.customers.email}
                        </div>
                      )}
                      
                      {event.customers.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          {event.customers.phone}
                        </div>
                      )}
                    </>
                  )}

                  {event.total_amount && (
                    <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                      £{event.total_amount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
