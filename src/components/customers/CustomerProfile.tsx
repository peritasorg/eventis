import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, MapPin, User, Calendar, PoundSterling, Plus, Clock } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export const CustomerProfile: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useAuth();

  // Fetch customer data
  const { data: customer, isLoading: customerLoading } = useSupabaseQuery(
    ['customer', customerId],
    async () => {
      if (!customerId || !currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error) throw error;
      return data;
    }
  );

  // Fetch customer events
  const { data: events, isLoading: eventsLoading } = useSupabaseQuery(
    ['customer-events', customerId],
    async () => {
      if (!customerId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('customer_id', customerId)
        .eq('tenant_id', currentTenant.id)
        .order('event_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  );

  if (customerLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading customer profile...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-lg text-muted-foreground">Customer not found</div>
        <Button onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  // Group events by date for timeline
  const eventsByDate = events?.reduce((groups, event) => {
    const date = event.event_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, any[]>) || {};

  // Calculate stats
  const totalValue = events?.reduce((sum, event) => sum + (event.form_total_gbp || 0) + (event.total_guest_price_gbp || 0), 0) || 0;
  const upcomingEvents = events?.filter(event => new Date(event.event_date) >= new Date()) || [];
  const completedEvents = events?.filter(event => event.status === 'completed') || [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/customers')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {customer.name}
            </h1>
            <p className="text-muted-foreground">Customer Profile</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/customers/${customerId}/edit`)}>
            Edit Customer
          </Button>
          <Button onClick={() => navigate(`/events/new?customer=${customerId}`)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{events?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{upcomingEvents.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Badge className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedEvents.length}</p>
                <p className="text-sm text-muted-foreground">Completed Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <PoundSterling className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">£{totalValue.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.email}</span>
              </div>
            )}
            
            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.phone}</span>
              </div>
            )}
            
            {(customer.address_line1 || customer.postal_code) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  {customer.address_line1 && <div>{customer.address_line1}</div>}
                  {customer.address_line2 && <div>{customer.address_line2}</div>}
                  {customer.city && <div>{customer.city}</div>}
                  {customer.postal_code && <div>{customer.postal_code}</div>}
                </div>
              </div>
            )}
            
            {customer.notes && (
              <div className="pt-2 border-t">
                <p className="font-medium text-sm mb-2">Notes</p>
                <p className="text-sm text-muted-foreground">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading events...
              </div>
            ) : events?.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <div className="text-muted-foreground">No events found for this customer</div>
                <Button onClick={() => navigate(`/events/new?customer=${customerId}`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Event
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(eventsByDate)
                  .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                  .map(([date, dayEvents]) => (
                    <div key={date} className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground">
                        {format(new Date(date), 'EEEE, MMMM do, yyyy')}
                      </h3>
                      <div className="space-y-2">
                        {(dayEvents as any[]).map((event: any) => (
                          <div
                            key={event.id}
                            className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/events/${event.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium">{event.title}</h4>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {event.status || 'draft'}
                                  </Badge>
                                  {event.start_time && (
                                    <span>{event.start_time.slice(0, 5)}</span>
                                  )}
                                  {event.venue_location && (
                                    <span>{event.venue_location}</span>
                                  )}
                                </div>
                              </div>
                              {((event.form_total_gbp || 0) + (event.total_guest_price_gbp || 0)) > 0 && (
                                <div className="text-right">
                                  <p className="font-medium">£{((event.form_total_gbp || 0) + (event.total_guest_price_gbp || 0)).toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};