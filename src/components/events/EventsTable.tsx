import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Users, Calendar, Phone, Mail } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Event {
  id: string;
  title: string;
  event_date?: string;
  event_end_date?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  men_count?: number;
  ladies_count?: number;
  total_guest_price_gbp?: number;
  form_total_gbp?: number;
  deposit_amount_gbp?: number;
  event_payments?: Array<{ amount_gbp: number }>;
  customers?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  primary_contact_name?: string;
  primary_contact_number?: string;
}

interface EventsTableProps {
  events: Event[];
  onEventClick: (eventId: string) => void;
  searchQuery?: string;
}

export const EventsTable: React.FC<EventsTableProps> = ({ 
  events, 
  onEventClick,
  searchQuery = '' 
}) => {
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    
    const query = searchQuery.toLowerCase();
    return events.filter(event => 
      event.title?.toLowerCase().includes(query) ||
      event.customers?.name?.toLowerCase().includes(query) ||
      event.primary_contact_name?.toLowerCase().includes(query) ||
      event.customers?.email?.toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  const calculateFinancials = (event: Event) => {
    const subtotal = (event.total_guest_price_gbp || 0) + (event.form_total_gbp || 0);
    const totalPayments = event.event_payments?.reduce((sum, payment) => sum + (payment.amount_gbp || 0), 0) || 0;
    const remainingBalance = subtotal - (event.deposit_amount_gbp || 0) - totalPayments;
    const isFullyPaid = remainingBalance <= 0;
    return { subtotal, remainingBalance, isFullyPaid };
  };

  const getEventStatus = (event: Event) => {
    // Check if event is cancelled first
    if (event.status === 'cancelled') {
      return { label: 'Cancelled', variant: 'destructive' as const };
    }
    
    const eventDate = event.event_date ? new Date(event.event_date) : null;
    const today = new Date();
    const { isFullyPaid } = calculateFinancials(event);
    
    if (!eventDate) return { label: 'Draft', variant: 'secondary' as const };
    if (eventDate < today) return { label: 'Completed', variant: 'default' as const };
    if (isFullyPaid) return { label: 'Confirmed', variant: 'default' as const };
    return { label: 'Pending', variant: 'outline' as const };
  };

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {searchQuery ? `No events found matching "${searchQuery}"` : 'No events found'}
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Financial</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEvents.map((event) => {
            const totalGuests = (event.men_count || 0) + (event.ladies_count || 0);
            const { subtotal, remainingBalance } = calculateFinancials(event);
            const status = getEventStatus(event);
            const customerName = event.customers?.name || event.primary_contact_name || 'Unknown';
            const contactInfo = event.customers?.email || event.customers?.phone || event.primary_contact_number;
            
            const isCancelled = event.status === 'cancelled';
            
            return (
              <TableRow key={event.id} className={`hover:bg-accent/50 ${isCancelled ? 'opacity-60' : ''}`}>
                <TableCell>
                  <div>
                    <div className={`font-medium ${isCancelled ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {event.title}
                    </div>
                    {event.event_end_date && event.event_end_date !== event.event_date && (
                      <div className="text-xs text-muted-foreground">Multi-day event</div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {event.event_date ? format(new Date(event.event_date), 'MMM dd, yyyy') : 'No date'}
                    </div>
                    {event.start_time && (
                      <div className="text-xs text-muted-foreground">
                        {event.start_time.slice(0, 5)}
                        {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{customerName}</div>
                    {contactInfo && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {event.customers?.email ? (
                          <Mail className="h-3 w-3" />
                        ) : (
                          <Phone className="h-3 w-3" />
                        )}
                        <span className="truncate max-w-[120px]">{contactInfo}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  {totalGuests > 0 ? (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{totalGuests}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not set</span>
                  )}
                </TableCell>
                
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    {subtotal > 0 ? (
                      <>
                        <div className="text-sm font-medium">£{subtotal.toFixed(2)}</div>
                        {remainingBalance > 0 && (
                          <div className="text-xs text-amber-600">
                            £{remainingBalance.toFixed(2)} due
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">No pricing</span>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEventClick(event.id)}
                    className="h-8 px-2"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};