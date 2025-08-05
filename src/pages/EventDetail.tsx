import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Receipt, Trash2, Calendar, Users, DollarSign, Clock, Phone, Mail, User, Building, MapPin, Sparkles, PartyPopper, Heart, Star, Crown, Gift, Briefcase, Home, MapPin as Location, Globe, CreditCard, TrendingUp, AlertCircle, CheckCircle2, Timer, Zap, Target, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
export const EventDetail = () => {
  const {
    eventId
  } = useParams<{
    eventId: string;
  }>();
  const navigate = useNavigate();
  const {
    currentTenant
  } = useAuth();
  const {
    syncEvent
  } = useManualEventSync();
  const [isEditing, setIsEditing] = useState(false);
  const { data: eventTypeConfigs } = useEventTypeConfigs();

  // Enable auto-sync when editing and navigating away
  useEventAutoSync(eventId || '', isEditing);
  const {
    data: event,
    isLoading
  } = useSupabaseQuery(['event', eventId], async () => {
    if (!eventId || !currentTenant?.id) return null;
    const {
      data,
      error
    } = await supabase.from('events').select(`
          *,
          customers (
            id,
            name,
            email,
            phone,
            company
          )
        `).eq('id', eventId).eq('tenant_id', currentTenant.id).single();
    if (error) {
      console.error('Event detail error:', error);
      return null;
    }
    return data;
  });

  // Query to get all customers for the dropdown
  const {
    data: customers
  } = useSupabaseQuery(['customers'], async () => {
    if (!currentTenant?.id) return [];
    const {
      data,
      error
    } = await supabase.from('customers').select('id, name, email, company').eq('tenant_id', currentTenant.id).eq('active', true).order('name');
    if (error) {
      console.error('Customers error:', error);
      return [];
    }
    return data || [];
  });

  // Query to get finance timeline payments for balance calculation
  const {
    data: payments
  } = useSupabaseQuery(['finance-timeline', event?.id], async () => {
    if (!event?.id || !currentTenant?.id) return [];
    const {
      data,
      error
    } = await supabase.from('finance_timeline').select('amount').eq('event_id', event.id).eq('tenant_id', currentTenant.id);
    if (error) {
      console.error('Finance timeline error:', error);
      return [];
    }
    return data || [];
  });

  // Fetch tenant details for PDF generation
  const {
    data: tenantDetails
  } = useSupabaseQuery(['tenant-details', currentTenant?.id], async () => {
    if (!currentTenant?.id) return null;
    const {
      data,
      error
    } = await supabase.from('tenants').select('*').eq('id', currentTenant.id).single();
    if (error) {
      console.error('Tenant details error:', error);
      return null;
    }
    return data;
  });
  const updateEventMutation = useSupabaseMutation(async (updates: any) => {
    if (!event?.id) throw new Error('Event not found');

    // If not multiple days, set end date to start date
    if (!updates.event_multiple_days && updates.event_start_date) {
      updates.event_end_date = updates.event_start_date;
    }
    const {
      data,
      error
    } = await supabase.from('events').update(updates).eq('id', event.id).select().single();
    if (error) throw error;
    return data;
  }, {
    successMessage: 'Event updated successfully!',
    invalidateQueries: [['event', event?.id]]
  });
  const deleteEventMutation = useSupabaseMutation(async () => {
    if (!eventId || !currentTenant?.id) throw new Error('Missing event ID or tenant');
    const {
      error
    } = await supabase.from('events').delete().eq('id', eventId).eq('tenant_id', currentTenant.id);
    if (error) throw error;
  }, {
    onSuccess: () => {
      toast.success('Event deleted successfully');
      navigate('/events');
    },
    onError: error => {
      toast.error('Failed to delete event: ' + error.message);
    }
  });
  const handleUpdateField = (field: string, value: any) => {
    if (!event?.id) return;
    setIsEditing(true);
    updateEventMutation.mutate({
      [field]: value
    });
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
    toast.loading('Syncing to calendar...', {
      id: 'calendar-sync'
    });
    try {
      const results = await syncEvent(eventId, 'create');
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => r.error).length;
      if (successful > 0) {
        toast.success(`Event synced to ${successful} calendar(s) successfully!`, {
          id: 'calendar-sync'
        });
      } else if (failed > 0) {
        toast.error('Failed to sync to any calendars', {
          id: 'calendar-sync'
        });
      } else {
        toast.info('No calendar integrations available to sync to', {
          id: 'calendar-sync'
        });
      }
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      toast.error('Failed to sync to calendar', {
        id: 'calendar-sync'
      });
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
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>;
  }
  if (!event) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Event not found</h2>
          <Button onClick={() => navigate('/events')} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>;
  }
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'inquiry':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'completed':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };
  const customerOptions = customers?.map(c => ({
    value: c.id,
    label: `${c.name}${c.company ? ` - ${c.company}` : ''}`
  })) || [];
  const customerSelectOptions = [{
    value: 'none',
    label: 'No customer assigned'
  }, ...customerOptions];
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'inquiry':
        return AlertCircle;
      case 'confirmed':
        return CheckCircle2;
      case 'completed':
        return Award;
      case 'cancelled':
        return Target;
      default:
        return Timer;
    }
  };
  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'inquiry':
        return 'from-sky-400 to-blue-600';
      case 'confirmed':
        return 'from-emerald-400 to-green-600';
      case 'completed':
        return 'from-violet-400 to-purple-600';
      case 'cancelled':
        return 'from-rose-400 to-red-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };
  const StatusIcon = getStatusIcon(event.status);
  return <div className="min-h-screen bg-background">
      {/* Clean Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/events')} className="h-9 w-9 p-0 hover:bg-accent rounded-lg">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                
                <div>
                  <InlineInput 
                    value={event.event_name} 
                    onSave={value => handleUpdateField('event_name', value)} 
                    placeholder="Event name"
                    className="text-xl font-semibold text-foreground bg-transparent border-0 p-0 h-auto"
                  />
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-muted-foreground">{event.event_type}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/events/${eventId}/form`)}>
                <FileText className="h-4 w-4 mr-2" />
                Form
              </Button>
              <Button variant="outline" size="sm" onClick={handleSyncToCalendar}>
                <Calendar className="h-4 w-4 mr-2" />
                Sync
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerateQuote}>
                <FileText className="h-4 w-4 mr-2" />
                Quote
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerateInvoice}>
                <Receipt className="h-4 w-4 mr-2" />
                Invoice
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{event.event_name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90" disabled={deleteEventMutation.isPending}>
                      {deleteEventMutation.isPending ? 'Deleting...' : 'Delete Event'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compact Business Flow */}
        <div className="mb-4">
          <div className="card-elegant p-3">
            <EventBusinessFlow depositPaid={event.deposit_paid} balanceCleared={event.balance_cleared} eventFinalized={event.event_finalized} eventId={event.id} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Event Details */}
            <div className="card-elegant">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Event Details
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        Customer
                      </label>
                      <InlineSelect value={event.customer_id || 'none'} options={customerSelectOptions} onSave={value => handleUpdateField('customer_id', value === 'none' ? null : value)} placeholder="Select customer" />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        Event Type
                      </label>
                      <InlineSelect 
                        value={event.event_type || ''} 
                        options={eventTypeConfigs?.map(config => ({
                          value: config.event_type,
                          label: config.display_name
                        })) || [{ value: 'other', label: 'Other' }]} 
                        onSave={value => handleUpdateField('event_type', value)} 
                        placeholder="Select event type" 
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                        <Globe className="h-4 w-4 text-green-500" />
                        Ethnicity
                      </label>
                      <InlineInput value={event.ethnicity || ''} onSave={value => handleUpdateField('ethnicity', value)} placeholder="e.g., Somali, Pakistani, etc." />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-rose-500" />
                          Start Date
                        </label>
                        <InlineDate value={event.event_start_date} onSave={value => handleUpdateField('event_start_date', value)} />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-amber-500" />
                          End Date
                        </label>
                        <InlineDate value={event.event_end_date} onSave={value => handleUpdateField('event_end_date', value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                          <Clock className="h-4 w-4 text-cyan-500" />
                          Start Time
                        </label>
                        <InlineInput value={event.start_time || ''} onSave={value => handleUpdateField('start_time', value)} placeholder="18:00" />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                          <Clock className="h-4 w-4 text-teal-500" />
                          End Time
                        </label>
                        <InlineInput value={event.end_time || ''} onSave={value => handleUpdateField('end_time', value)} placeholder="23:00" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="card-elegant">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Phone className="h-5 w-5 text-emerald-500" />
                  Contact Information
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        Primary Contact
                      </label>
                      <InlineInput value={event.primary_contact_name || ''} onSave={value => handleUpdateField('primary_contact_name', value)} placeholder="Contact name" />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                        <Phone className="h-4 w-4 text-emerald-500" />
                        Primary Phone
                      </label>
                      <InlineInput value={event.primary_contact_phone || ''} onSave={value => handleUpdateField('primary_contact_phone', value)} placeholder="Phone number" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                        <User className="h-4 w-4 text-purple-500" />
                        Secondary Contact
                      </label>
                      <InlineInput value={event.secondary_contact_name || ''} onSave={value => handleUpdateField('secondary_contact_name', value)} placeholder="Contact name" />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                        <Phone className="h-4 w-4 text-rose-500" />
                        Secondary Phone
                      </label>
                      <InlineInput value={event.secondary_contact_phone || ''} onSave={value => handleUpdateField('secondary_contact_phone', value)} placeholder="Phone number" />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                    <Heart className="h-4 w-4 text-amber-500" />
                    Relationship to Main Contact
                  </label>
                  <InlineInput value={event.secondary_contact_relationship || ''} onSave={value => handleUpdateField('secondary_contact_relationship', value)} placeholder="e.g., Spouse, Parent, etc." />
                </div>
              </div>
            </div>

            {/* Guest Information */}
            <div className="card-elegant">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-violet-500" />
                  Guest Information
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-500" />
                      Men Count
                    </label>
                    <InlineNumber value={event.men_count || 0} onSave={value => handleUpdateField('men_count', value)} />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                      <User className="h-4 w-4 text-rose-500" />
                      Ladies Count
                    </label>
                    <InlineNumber value={event.ladies_count || 0} onSave={value => handleUpdateField('ladies_count', value)} />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-500" />
                      Total Guests
                    </label>
                    <InlineNumber value={event.total_guests || 0} onSave={value => handleUpdateField('total_guests', value)} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    Event Mix Type
                  </label>
                  <InlineSelect value={event.event_mix_type || 'none'} options={[{
                  value: 'none',
                  label: 'Select mix type'
                }, {
                  value: 'men_only',
                  label: 'Men Only'
                }, {
                  value: 'ladies_only',
                  label: 'Ladies Only'
                }, {
                  value: 'mixed',
                  label: 'Mixed'
                }, {
                  value: 'family',
                  label: 'Family'
                }]} onSave={value => handleUpdateField('event_mix_type', value === 'none' ? null : value)} placeholder="Select event mix type" />
                </div>
              </div>
            </div>

            {/* Timelines - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CommunicationTimeline eventId={event.id} />
              <FinanceTimeline eventId={event.id} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Financial Summary */}
            <div className="card-elegant">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                  Financial Summary
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    Guest Price (£)
                  </label>
                  <InlineNumber value={totalGuestPrice} onSave={value => handleUpdateField('total_guest_price', value)} step={0.01} />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Form Total
                  </label>
                  <div className="text-lg font-semibold text-foreground py-2 px-3 bg-muted/30 rounded-md">
                    £{formTotal.toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
                    <Gift className="h-4 w-4 text-amber-500" />
                    Deposit (£)
                  </label>
                  <InlineNumber value={depositAmount} onSave={value => handleUpdateField('deposit_amount', value)} step={0.01} />
                </div>

                <div className="pt-4 border-t border-border/50">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Total Price</span>
                      <span className="text-lg font-bold text-foreground">£{totalEventPrice.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Total Paid</span>
                      <span className="font-semibold text-emerald-600">£{totalPaid.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Balance Due</span>
                      <span className={`font-bold ${balanceDue > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                        £{balanceDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Countdown */}
            <div className="card-elegant">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Timer className="h-5 w-5 text-violet-500" />
                  Event Countdown
                </h2>
              </div>
              <div className="p-6 text-center">
                <div className={`text-2xl font-bold mb-3 ${daysDue < 0 ? 'text-destructive' : daysDue < 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {daysDue < 0 ? `${Math.abs(daysDue)} days overdue` : daysDue === 0 ? 'Today' : `${daysDue} days to go`}
                </div>
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg py-2 px-3">
                  {new Date(event.event_start_date).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>;
};