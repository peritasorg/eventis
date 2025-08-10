import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, MapPin, Users, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { EventFormTab } from './EventFormTab';
import { CommunicationTimeline } from './CommunicationTimeline';
import { FinanceTimeline } from './FinanceTimeline';

export const EventDetailWithTabs: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId || !currentTenant?.id) return;

      try {
        // Fetch event data
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .eq('tenant_id', currentTenant.id)
          .single();

        if (eventError) {
          console.error('Error fetching event:', eventError);
          return;
        }

        setEvent(eventData);

        // Fetch customer data if available
        if (eventData.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', eventData.customer_id)
            .eq('tenant_id', currentTenant.id)
            .single();

          if (!customerError) {
            setCustomer(customerData);
          }
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [eventId, currentTenant?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'inquiry': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading event details...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Event not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/events')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{event.event_name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className={getStatusColor(event.status)}>
                {event.status}
              </Badge>
              <span className="text-muted-foreground">
                {event.event_type}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(event.total_amount)}
          </div>
          <div className="text-sm text-muted-foreground">
            Total Amount
          </div>
        </div>
      </div>

      {/* Event Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-medium">
                  {formatDate(event.event_start_date)}
                </div>
                <div className="text-sm text-muted-foreground">Event Date</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-500" />
              <div>
                <div className="font-medium">
                  {formatTime(event.start_time)} - {formatTime(event.end_time)}
                </div>
                <div className="text-sm text-muted-foreground">Time</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <div className="font-medium">{event.estimated_guests}</div>
                <div className="text-sm text-muted-foreground">Guests</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-yellow-500" />
              <div>
                <div className="font-medium">
                  {formatCurrency(event.balance_due)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Balance Due
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Information */}
      {customer && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-muted-foreground">Name</div>
              </div>
              <div>
                <div className="font-medium">{customer.email}</div>
                <div className="text-sm text-muted-foreground">Email</div>
              </div>
              <div>
                <div className="font-medium">{customer.phone}</div>
                <div className="text-sm text-muted-foreground">Phone</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="font-medium">Venue Area</div>
                  <div className="text-muted-foreground">
                    {event.venue_area || 'Not specified'}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Setup Time</div>
                  <div className="text-muted-foreground">
                    {event.setup_time ? formatTime(event.setup_time) : 'Not specified'}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Cleanup Time</div>
                  <div className="text-muted-foreground">
                    {event.cleanup_time ? formatTime(event.cleanup_time) : 'Not specified'}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Room Layout</div>
                  <div className="text-muted-foreground">
                    {event.room_layout || 'Not specified'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="font-medium">Dietary Requirements</div>
                  <div className="text-muted-foreground">
                    {event.dietary_requirements || 'None specified'}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Accessibility Requirements</div>
                  <div className="text-muted-foreground">
                    {event.accessibility_requirements || 'None specified'}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Special Requests</div>
                  <div className="text-muted-foreground">
                    {event.special_requests || 'None specified'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.catering_required && (
                    <Badge variant="secondary">Catering Required</Badge>
                  )}
                  {event.av_equipment_required && (
                    <Badge variant="secondary">AV Equipment</Badge>
                  )}
                  {event.decoration_required && (
                    <Badge variant="secondary">Decorations</Badge>
                  )}
                  {event.parking_required && (
                    <Badge variant="secondary">Parking</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="font-medium text-lg">
                    {formatCurrency(event.deposit_amount)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Deposit Amount
                  </div>
                  <Badge 
                    variant={event.deposit_paid ? "default" : "destructive"}
                    className="mt-1"
                  >
                    {event.deposit_paid ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>
                <div>
                  <div className="font-medium text-lg">
                    {formatCurrency(event.total_amount)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Amount
                  </div>
                </div>
                <div>
                  <div className="font-medium text-lg">
                    {formatCurrency(event.balance_due)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Balance Due
                  </div>
                </div>
                <div>
                  <Badge 
                    variant={event.balance_cleared ? "default" : "destructive"}
                    className="text-sm"
                  >
                    {event.balance_cleared ? 'Balance Cleared' : 'Balance Outstanding'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms">
          <EventFormTab eventId={eventId!} />
        </TabsContent>

        <TabsContent value="communication">
          <CommunicationTimeline eventId={eventId!} />
        </TabsContent>

        <TabsContent value="finance">
          <FinanceTimeline eventId={eventId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};