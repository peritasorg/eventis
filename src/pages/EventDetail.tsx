import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Receipt, Trash2, Calendar, Users, DollarSign, Clock, Phone, Mail, User, Building, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventBusinessFlow } from '@/components/events/EventBusinessFlow';
import { CommunicationTimeline } from '@/components/events/CommunicationTimeline';
import { FinanceTimeline } from '@/components/events/FinanceTimeline';
import { useManualEventSync } from '@/hooks/useCalendarSync';
import { toast } from 'sonner';
import { generateQuotePDF, generateInvoicePDF } from '@/utils/pdfGenerator';
import { InlineInput } from '@/components/events/InlineInput';
import { InlineSelect } from '@/components/events/InlineSelect';
import { InlineTextarea } from '@/components/events/InlineTextarea';
import { InlineNumber } from '@/components/events/InlineNumber';
import { InlineDate } from '@/components/events/InlineDate';
import { useEventAutoSync } from '@/hooks/useEventAutoSync';

export const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { syncEvent } = useManualEventSync();
  const [isEditing, setIsEditing] = useState(false);
  
  // Enable auto-sync when editing and navigating away
  useEventAutoSync(eventId || '', isEditing);

  const { data: event, isLoading } = useSupabaseQuery(
    ['event', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          customers (
            id,
            name,
            email,
            phone,
            company
          )
        `)
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error) {
        console.error('Event detail error:', error);
        return null;
      }
      
      return data;
    }
  );

  // Query to get all customers for the dropdown
  const { data: customers } = useSupabaseQuery(
    ['customers'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, company')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');
      
      if (error) {
        console.error('Customers error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  // Query to get finance timeline payments for balance calculation
  const { data: payments } = useSupabaseQuery(
    ['finance-timeline', event?.id],
    async () => {
      if (!event?.id || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('finance_timeline')
        .select('amount')
        .eq('event_id', event.id)
        .eq('tenant_id', currentTenant.id);
      
      if (error) {
        console.error('Finance timeline error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  // Fetch tenant details for PDF generation
  const { data: tenantDetails } = useSupabaseQuery(
    ['tenant-details', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', currentTenant.id)
        .single();
      
      if (error) {
        console.error('Tenant details error:', error);
        return null;
      }
      
      return data;
    }
  );

  const updateEventMutation = useSupabaseMutation(
    async (updates: any) => {
      if (!event?.id) throw new Error('Event not found');
      
      // If not multiple days, set end date to start date
      if (!updates.event_multiple_days && updates.event_start_date) {
        updates.event_end_date = updates.event_start_date;
      }
      
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', event.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Event updated successfully!',
      invalidateQueries: [['event', event?.id]]
    }
  );

  const deleteEventMutation = useSupabaseMutation(
    async () => {
      if (!eventId || !currentTenant?.id) throw new Error('Missing event ID or tenant');
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Event deleted successfully');
        navigate('/events');
      },
      onError: (error) => {
        toast.error('Failed to delete event: ' + error.message);
      }
    }
  );

  const handleUpdateField = (field: string, value: any) => {
    if (!event?.id) return;
    setIsEditing(true);
    updateEventMutation.mutate({ [field]: value });
    // Reset editing state after a delay
    setTimeout(() => setIsEditing(false), 1000);
  };

  const handleDeleteEvent = () => {
    deleteEventMutation.mutate({});
  };

  const handleGenerateQuote = () => {
    if (!event || !tenantDetails) {
      toast.error('Missing event or tenant information');
      return;
    }

    try {
      generateQuotePDF(event, tenantDetails);
      toast.success('Quote PDF generated successfully');
    } catch (error) {
      console.error('Error generating quote PDF:', error);
      toast.error('Failed to generate quote PDF');
    }
  };

  const handleGenerateInvoice = () => {
    if (!event || !tenantDetails) {
      toast.error('Missing event or tenant information');
      return;
    }

    try {
      generateInvoicePDF(event, tenantDetails);
      toast.success('Invoice PDF generated successfully');
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      toast.error('Failed to generate invoice PDF');
    }
  };

  const handleSyncToCalendar = async () => {
    if (!eventId) {
      toast.error('Event ID is required');
      return;
    }

    toast.loading('Syncing to calendar...', { id: 'calendar-sync' });
    
    try {
      const results = await syncEvent(eventId, 'create');
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => r.error).length;
      
      if (successful > 0) {
        toast.success(`Event synced to ${successful} calendar(s) successfully!`, { id: 'calendar-sync' });
      } else if (failed > 0) {
        toast.error('Failed to sync to any calendars', { id: 'calendar-sync' });
      } else {
        toast.info('No calendar integrations available to sync to', { id: 'calendar-sync' });
      }
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      toast.error('Failed to sync to calendar', { id: 'calendar-sync' });
    }
  };

  const calculateDaysDue = () => {
    if (!event?.event_start_date) return 0;
    const eventDate = new Date(event.event_start_date);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate financial totals
  const totalGuestPrice = event?.total_guest_price || 0;
  const formTotal = event?.form_total || 0;
  const depositAmount = event?.deposit_amount || 0;
  const totalEventPrice = totalGuestPrice + formTotal;
  
  // Calculate total paid from finance timeline
  const totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
  
  // Calculate balance due: Total Event Price - Deposit - Finance Timeline Payments
  const balanceDue = totalEventPrice - depositAmount - totalPaid;

  const daysDue = calculateDaysDue();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Event not found</h2>
          <Button onClick={() => navigate('/events')} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'inquiry': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'confirmed': return 'bg-green-50 text-green-700 border-green-200';
      case 'completed': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const customerOptions = customers?.map(c => ({ value: c.id, label: `${c.name}${c.company ? ` - ${c.company}` : ''}` })) || [];
  const customerSelectOptions = [{ value: 'none', label: 'No customer assigned' }, ...customerOptions];

  return (
    <div className="min-h-screen bg-background">
      {/* Elegant Header */}
      <div className="sticky top-0 z-10 header-elegant">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/events')}
                className="h-9 w-9 p-0 hover:bg-accent rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground tracking-tight">{event.event_name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-muted-foreground">{event.event_type}</span>
                  <Badge variant="outline" className={`text-xs font-medium border-0 ${getStatusColor(event.status)}`}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/events/${eventId}/form`)}
                className="h-9 border-border/60 hover:bg-accent"
              >
                <FileText className="h-4 w-4 mr-2" />
                Form
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSyncToCalendar}
                className="h-9 border-border/60 hover:bg-accent"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Sync to Calendar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGenerateQuote}
                className="h-9 border-border/60 hover:bg-accent"
              >
                <FileText className="h-4 w-4 mr-2" />
                Quote
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGenerateInvoice}
                className="h-9 border-border/60 hover:bg-accent"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Invoice
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="card-elegant">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{event.event_name}"? This action cannot be undone and will permanently remove all event data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteEvent}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      disabled={deleteEventMutation.isPending}
                    >
                      {deleteEventMutation.isPending ? 'Deleting...' : 'Delete Event'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Business Flow */}
        <div className="mb-8">
          <div className="card-elegant p-6">
            <EventBusinessFlow 
              depositPaid={event.deposit_paid}
              balanceCleared={event.balance_cleared}
              eventFinalized={event.event_finalized}
              eventId={event.id}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Details */}
            <div className="card-elegant">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
                  <Calendar className="h-5 w-5 text-primary" />
                  Event Details
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Customer</label>
                    <InlineSelect
                      value={event.customer_id || 'none'}
                      options={customerSelectOptions}
                      onSave={(value) => handleUpdateField('customer_id', value === 'none' ? null : value)}
                      placeholder="Select customer"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Event Type</label>
                    <div className="text-sm text-foreground py-2 px-3 bg-muted/30 rounded-md">{event.event_type || 'Not specified'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Start Date</label>
                    <InlineDate
                      value={event.event_start_date}
                      onSave={(value) => handleUpdateField('event_start_date', value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">End Date</label>
                    <InlineDate
                      value={event.event_end_date}
                      onSave={(value) => handleUpdateField('event_end_date', value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Start Time</label>
                    <InlineInput
                      value={event.start_time || ''}
                      onSave={(value) => handleUpdateField('start_time', value)}
                      placeholder="e.g., 18:00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">End Time</label>
                    <InlineInput
                      value={event.end_time || ''}
                      onSave={(value) => handleUpdateField('end_time', value)}
                      placeholder="e.g., 23:00"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Ethnicity</label>
                  <InlineInput
                    value={event.ethnicity || ''}
                    onSave={(value) => handleUpdateField('ethnicity', value)}
                    placeholder="e.g., Somali, Pakistani, etc."
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="card-elegant">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
                  <Phone className="h-5 w-5 text-primary" />
                  Contact Information
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Primary Contact Name</label>
                    <InlineInput
                      value={event.primary_contact_name || ''}
                      onSave={(value) => handleUpdateField('primary_contact_name', value)}
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Primary Contact Phone</label>
                    <InlineInput
                      value={event.primary_contact_phone || ''}
                      onSave={(value) => handleUpdateField('primary_contact_phone', value)}
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Secondary Contact Name</label>
                    <InlineInput
                      value={event.secondary_contact_name || ''}
                      onSave={(value) => handleUpdateField('secondary_contact_name', value)}
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Secondary Contact Phone</label>
                    <InlineInput
                      value={event.secondary_contact_phone || ''}
                      onSave={(value) => handleUpdateField('secondary_contact_phone', value)}
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Relationship to Main Contact</label>
                  <InlineInput
                    value={event.secondary_contact_relationship || ''}
                    onSave={(value) => handleUpdateField('secondary_contact_relationship', value)}
                    placeholder="e.g., Spouse, Parent, etc."
                  />
                </div>
              </div>
            </div>

            {/* Guest Information */}
            <div className="card-elegant">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
                  <Users className="h-5 w-5 text-primary" />
                  Guest Information
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Men Count</label>
                    <InlineNumber
                      value={event.men_count || 0}
                      onSave={(value) => handleUpdateField('men_count', value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Ladies Count</label>
                    <InlineNumber
                      value={event.ladies_count || 0}
                      onSave={(value) => handleUpdateField('ladies_count', value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Total Guests</label>
                    <InlineNumber
                      value={event.total_guests || 0}
                      onSave={(value) => handleUpdateField('total_guests', value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Event Mix Type</label>
                  <InlineSelect
                    value={event.event_mix_type || 'none'}
                    options={[
                      { value: 'none', label: 'Select mix type' },
                      { value: 'men_only', label: 'Men Only' },
                      { value: 'ladies_only', label: 'Ladies Only' },
                      { value: 'mixed', label: 'Mixed' },
                      { value: 'family', label: 'Family' }
                    ]}
                    onSave={(value) => handleUpdateField('event_mix_type', value === 'none' ? null : value)}
                    placeholder="Select event mix type"
                  />
                </div>
              </div>
            </div>

            {/* Communication Timeline */}
            <div className="card-elegant">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground tracking-tight">Communication Timeline</h2>
              </div>
              <div className="p-6">
                <CommunicationTimeline eventId={event.id} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Financial Summary */}
            <div className="card-elegant">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Financial Summary
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Guest Price (£)</label>
                  <InlineNumber
                    value={totalGuestPrice}
                    onSave={(value) => handleUpdateField('total_guest_price', value)}
                    step={0.01}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Form Total</label>
                  <div className="text-sm font-medium text-foreground py-2 px-3 bg-muted/30 rounded-md">£{formTotal.toFixed(2)}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Deposit Amount (£)</label>
                  <InlineNumber
                    value={depositAmount}
                    onSave={(value) => handleUpdateField('deposit_amount', value)}
                    step={0.01}
                  />
                </div>

                <div className="pt-4 border-t border-border/50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-base font-semibold text-foreground">Total Event Price</span>
                    <span className="text-xl font-bold text-foreground">£{totalEventPrice.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Total Paid</span>
                    <span className="text-sm font-medium text-green-600">£{totalPaid.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Balance Due</span>
                    <span className={`text-sm font-semibold ${
                      balanceDue > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      £{balanceDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Countdown */}
            <div className="card-elegant">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
                  <Clock className="h-5 w-5 text-primary" />
                  Event Countdown
                </h2>
              </div>
              <div className="p-6 text-center">
                <div className={`text-2xl font-bold mb-2 ${
                  daysDue < 0 ? 'text-red-600' : daysDue < 7 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {daysDue < 0 ? `${Math.abs(daysDue)} days overdue` : 
                   daysDue === 0 ? 'Today' : 
                   `${daysDue} days to go`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(event.event_start_date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>

            {/* Finance Timeline */}
            <div className="card-elegant">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground tracking-tight">Finance Timeline</h2>
              </div>
              <div className="p-6">
                <FinanceTimeline eventId={event.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};