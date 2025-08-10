import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, MapPin, Plus, Calendar, DollarSign } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export const CustomerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useAuth();

  // Fetch customer data
  const { data: customer, isLoading: customerLoading } = useSupabaseQuery(
    ['new-customer', id],
    async () => {
      if (!id || !currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('new_customers')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error) throw error;
      return data;
    }
  );

  // Fetch customer events
  const { data: events = [], isLoading: eventsLoading } = useSupabaseQuery(
    ['customer-events', id],
    async () => {
      if (!id || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('new_events')
        .select('*')
        .eq('customer_id', id)
        .eq('tenant_id', currentTenant.id)
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  );

  if (customerLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading customer...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Customer not found</h2>
          <p className="text-muted-foreground mb-4">The customer you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const dateKey = event.event_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, typeof events>);

  const totalValue = (events as any[]).reduce((sum, event) => sum + (event.total_amount_gbp || 0), 0);
  const upcomingEvents = (events as any[]).filter(event => new Date(event.event_date) >= new Date());
  const completedEvents = (events as any[]).filter(event => event.status === 'completed');

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/customers')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {customer.first_name} {customer.last_name}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-muted-foreground">
                {customer.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{customer.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/customers/${id}/edit`)}>
              Edit Customer
            </Button>
            <Button onClick={() => navigate(`/events/new?customer=${id}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{events.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-bold">{upcomingEvents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedEvents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">£{totalValue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p>{customer.address}</p>
                    {customer.postcode && <p>{customer.postcode}</p>}
                  </div>
                </div>
              )}
              {customer.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Events Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Events ({events.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {(events as any[]).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No events found for this customer</p>
                  <Button onClick={() => navigate(`/events/new?customer=${id}`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Event
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(eventsByDate as Record<string, any[]>)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .map(([date, dateEvents]) => (
                      <div key={date}>
                        <h4 className="font-semibold text-lg mb-3">
                          {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                          {dateEvents.length > 1 && (
                            <span className="ml-2 text-sm text-muted-foreground">
                              ({dateEvents.length} events)
                            </span>
                          )}
                        </h4>
                        <div className="space-y-3">
                          {dateEvents.map((event) => (
                            <div
                              key={event.id}
                              className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => navigate(`/events/${event.id}`)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-medium">{event.title}</h5>
                                    <Badge variant={
                                      event.status === 'confirmed' ? 'default' :
                                      event.status === 'completed' ? 'secondary' :
                                      event.status === 'cancelled' ? 'destructive' :
                                      'outline'
                                    }>
                                      {event.status}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {event.start_time && event.end_time && (
                                      <span>{event.start_time} - {event.end_time}</span>
                                    )}
                                    {event.venue_location && (
                                      <span className="ml-2">• {event.venue_location}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">£{event.total_amount_gbp?.toLocaleString() || '0'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {dateEvents.length > 1 && (
                          <div className="mt-2 pt-2 border-t text-right text-sm font-medium">
                            Day Total: £{dateEvents.reduce((sum, e) => sum + (e.total_amount_gbp || 0), 0).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};