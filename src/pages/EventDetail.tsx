import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Receipt, Trash2, Calendar, Users, DollarSign, Clock, Phone, Mail, User, Building, MapPin,
  Sparkles, PartyPopper, Heart, Star, Crown, Gift, Briefcase, Home, MapPin as Location, Globe,
  CreditCard, TrendingUp, AlertCircle, CheckCircle2, Timer, Zap, Target, Award
} from 'lucide-react';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'inquiry': return AlertCircle;
      case 'confirmed': return CheckCircle2;
      case 'completed': return Award;
      case 'cancelled': return Target;
      default: return Timer;
    }
  };

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'inquiry': return 'from-sky-400 to-blue-600';
      case 'confirmed': return 'from-emerald-400 to-green-600';
      case 'completed': return 'from-violet-400 to-purple-600';
      case 'cancelled': return 'from-rose-400 to-red-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const StatusIcon = getStatusIcon(event.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header with Gradient */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/events')}
                className="h-10 w-10 p-0 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all duration-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl bg-gradient-to-r ${getStatusGradient(event.status)} shadow-lg`}>
                  <PartyPopper className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{event.event_name}</h1>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm font-medium text-gray-600">{event.event_type}</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getStatusGradient(event.status)} shadow-md`}>
                      <StatusIcon className="h-4 w-4 text-white" />
                      <span className="text-sm font-semibold text-white capitalize">
                        {event.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/events/${eventId}/form`)}
                className="h-10 border-blue-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all duration-300"
              >
                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                <span className="font-medium">Form</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSyncToCalendar}
                className="h-10 border-emerald-200 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:border-emerald-300 transition-all duration-300"
              >
                <Calendar className="h-4 w-4 mr-2 text-emerald-600" />
                <span className="font-medium">Sync</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGenerateQuote}
                className="h-10 border-violet-200 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 hover:border-violet-300 transition-all duration-300"
              >
                <FileText className="h-4 w-4 mr-2 text-violet-600" />
                <span className="font-medium">Quote</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGenerateInvoice}
                className="h-10 border-amber-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:border-amber-300 transition-all duration-300"
              >
                <Receipt className="h-4 w-4 mr-2 text-amber-600" />
                <span className="font-medium">Invoice</span>
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white shadow-xl border-0 rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold text-gray-900">Delete Event</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-600">
                      Are you sure you want to delete "{event.event_name}"? This action cannot be undone and will permanently remove all event data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteEvent}
                      className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Business Flow */}
        <div className="mb-8">
          <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-3xl shadow-lg p-8">
            <EventBusinessFlow 
              depositPaid={event.deposit_paid}
              balanceCleared={event.balance_cleared}
              eventFinalized={event.event_finalized}
              eventId={event.id}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content - Takes 3 columns */}
          <div className="xl:col-span-3 space-y-8">
            {/* Event Details Card */}
            <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  Event Details
                </h2>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500 rounded-xl">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <label className="text-sm font-semibold text-blue-900">Customer</label>
                      </div>
                      <InlineSelect
                        value={event.customer_id || 'none'}
                        options={customerSelectOptions}
                        onSave={(value) => handleUpdateField('customer_id', value === 'none' ? null : value)}
                        placeholder="Select customer"
                      />
                    </div>
                    
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500 rounded-xl">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <label className="text-sm font-semibold text-emerald-900">Event Type</label>
                      </div>
                      <div className="text-sm font-medium text-emerald-800 py-3 px-4 bg-white/50 rounded-xl border border-emerald-200">
                        {event.event_type || 'Not specified'}
                      </div>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-violet-500 rounded-xl">
                          <Globe className="h-5 w-5 text-white" />
                        </div>
                        <label className="text-sm font-semibold text-violet-900">Ethnicity</label>
                      </div>
                      <InlineInput
                        value={event.ethnicity || ''}
                        onSave={(value) => handleUpdateField('ethnicity', value)}
                        placeholder="e.g., Somali, Pakistani, etc."
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="p-6 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-100">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-rose-500 rounded-xl">
                            <Calendar className="h-5 w-5 text-white" />
                          </div>
                          <label className="text-sm font-semibold text-rose-900">Start Date</label>
                        </div>
                        <InlineDate
                          value={event.event_start_date}
                          onSave={(value) => handleUpdateField('event_start_date', value)}
                        />
                      </div>
                      
                      <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-amber-500 rounded-xl">
                            <Calendar className="h-5 w-5 text-white" />
                          </div>
                          <label className="text-sm font-semibold text-amber-900">End Date</label>
                        </div>
                        <InlineDate
                          value={event.event_end_date}
                          onSave={(value) => handleUpdateField('event_end_date', value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border border-cyan-100">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-1.5 bg-cyan-500 rounded-lg">
                            <Clock className="h-4 w-4 text-white" />
                          </div>
                          <label className="text-xs font-semibold text-cyan-900">Start Time</label>
                        </div>
                        <InlineInput
                          value={event.start_time || ''}
                          onSave={(value) => handleUpdateField('start_time', value)}
                          placeholder="18:00"
                        />
                      </div>
                      
                      <div className="p-6 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-100">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-1.5 bg-teal-500 rounded-lg">
                            <Clock className="h-4 w-4 text-white" />
                          </div>
                          <label className="text-xs font-semibold text-teal-900">End Time</label>
                        </div>
                        <InlineInput
                          value={event.end_time || ''}
                          onSave={(value) => handleUpdateField('end_time', value)}
                          placeholder="23:00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Card */}
            <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-8 py-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  Contact Information
                </h2>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500 rounded-xl">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <label className="text-sm font-semibold text-blue-900">Primary Contact</label>
                      </div>
                      <InlineInput
                        value={event.primary_contact_name || ''}
                        onSave={(value) => handleUpdateField('primary_contact_name', value)}
                        placeholder="Contact name"
                      />
                    </div>
                    
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500 rounded-xl">
                          <Phone className="h-5 w-5 text-white" />
                        </div>
                        <label className="text-sm font-semibold text-emerald-900">Primary Phone</label>
                      </div>
                      <InlineInput
                        value={event.primary_contact_phone || ''}
                        onSave={(value) => handleUpdateField('primary_contact_phone', value)}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-violet-500 rounded-xl">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <label className="text-sm font-semibold text-violet-900">Secondary Contact</label>
                      </div>
                      <InlineInput
                        value={event.secondary_contact_name || ''}
                        onSave={(value) => handleUpdateField('secondary_contact_name', value)}
                        placeholder="Contact name"
                      />
                    </div>
                    
                    <div className="p-6 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-rose-500 rounded-xl">
                          <Phone className="h-5 w-5 text-white" />
                        </div>
                        <label className="text-sm font-semibold text-rose-900">Secondary Phone</label>
                      </div>
                      <InlineInput
                        value={event.secondary_contact_phone || ''}
                        onSave={(value) => handleUpdateField('secondary_contact_phone', value)}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500 rounded-xl">
                      <Heart className="h-5 w-5 text-white" />
                    </div>
                    <label className="text-sm font-semibold text-amber-900">Relationship to Main Contact</label>
                  </div>
                  <InlineInput
                    value={event.secondary_contact_relationship || ''}
                    onSave={(value) => handleUpdateField('secondary_contact_relationship', value)}
                    placeholder="e.g., Spouse, Parent, etc."
                  />
                </div>
              </div>
            </div>

            {/* Guest Information Card */}
            <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-8 py-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  Guest Information
                </h2>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-500 rounded-xl">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <label className="text-sm font-semibold text-blue-900">Men Count</label>
                    </div>
                    <InlineNumber
                      value={event.men_count || 0}
                      onSave={(value) => handleUpdateField('men_count', value)}
                    />
                  </div>
                  
                  <div className="p-6 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-rose-500 rounded-xl">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <label className="text-sm font-semibold text-rose-900">Ladies Count</label>
                    </div>
                    <InlineNumber
                      value={event.ladies_count || 0}
                      onSave={(value) => handleUpdateField('ladies_count', value)}
                    />
                  </div>
                  
                  <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-500 rounded-xl">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <label className="text-sm font-semibold text-emerald-900">Total Guests</label>
                    </div>
                    <InlineNumber
                      value={event.total_guests || 0}
                      onSave={(value) => handleUpdateField('total_guests', value)}
                    />
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500 rounded-xl">
                      <Crown className="h-5 w-5 text-white" />
                    </div>
                    <label className="text-sm font-semibold text-amber-900">Event Mix Type</label>
                  </div>
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
            <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  Communication Timeline
                </h2>
              </div>
              <div className="p-8">
                <CommunicationTimeline eventId={event.id} />
              </div>
            </div>
          </div>

          {/* Sidebar - Takes 1 column */}
          <div className="xl:col-span-1 space-y-8">
            {/* Financial Summary */}
            <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  Financial Summary
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-emerald-500 rounded-lg">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    <label className="text-sm font-semibold text-emerald-900">Guest Price (£)</label>
                  </div>
                  <InlineNumber
                    value={totalGuestPrice}
                    onSave={(value) => handleUpdateField('total_guest_price', value)}
                    step={0.01}
                  />
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <label className="text-sm font-semibold text-blue-900">Form Total</label>
                  </div>
                  <div className="text-lg font-bold text-blue-800 py-2 px-3 bg-white/50 rounded-xl">
                    £{formTotal.toFixed(2)}
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-amber-500 rounded-lg">
                      <Gift className="h-4 w-4 text-white" />
                    </div>
                    <label className="text-sm font-semibold text-amber-900">Deposit (£)</label>
                  </div>
                  <InlineNumber
                    value={depositAmount}
                    onSave={(value) => handleUpdateField('deposit_amount', value)}
                    step={0.01}
                  />
                </div>

                <div className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-slate-200">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total Price</span>
                      <span className="text-2xl font-bold text-gray-900">£{totalEventPrice.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Total Paid</span>
                      <span className="font-semibold text-green-600">£{totalPaid.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Balance Due</span>
                      <span className={`font-bold ${
                        balanceDue > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        £{balanceDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Countdown */}
            <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Timer className="h-5 w-5 text-white" />
                  </div>
                  Event Countdown
                </h2>
              </div>
              <div className="p-6 text-center">
                <div className={`text-3xl font-bold mb-3 ${
                  daysDue < 0 ? 'text-red-600' : daysDue < 7 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {daysDue < 0 ? `${Math.abs(daysDue)} days overdue` : 
                   daysDue === 0 ? 'Today' : 
                   `${daysDue} days to go`}
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 rounded-xl py-2 px-3">
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
            <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  Finance Timeline
                </h2>
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