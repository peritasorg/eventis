import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PriceInput } from '@/components/ui/price-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarIcon, X, Users, Phone, PoundSterling, MessageSquare, CreditCard, User, Trash2, Search, FileText, Receipt, Calendar as CalendarSyncIcon, History, Plus, Eye } from 'lucide-react';
import { CommunicationsTimeline } from './CommunicationsTimeline';
import { PaymentTimeline } from './PaymentTimeline';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { useEventFormTotals } from '@/hooks/useEventFormTotals';
import { useEventForms } from '@/hooks/useEventForms';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateQuotePDF, generateInvoicePDF } from '@/utils/pdfGenerator';
import { QuoteInvoicePreview } from './QuoteInvoicePreview';
import { TimeDisplay } from './TimeDisplay';
import { useCalendarAutoSync } from '@/hooks/useCalendarAutoSync';
import { prepareCalendarEventData } from '@/utils/calendarEventData';
import { CalendarSyncPreview } from './CalendarSyncPreview';
import { QuickCreateCustomerDialog } from '../customers/QuickCreateCustomerDialog';
import { QuickViewCustomerDialog } from '../customers/QuickViewCustomerDialog';

interface EventData {
  id: string;
  tenant_id: string;
  title: string;
  event_type: string | null;
  event_date: string | null;
  original_event_date?: string | null;
  date_changed_at?: string | null;
  event_end_date?: string | null;
  start_time: string | null;
  end_time: string | null;
  customer_id: string | null;
  ethnicity: string[] | null;
  primary_contact_name: string | null;
  primary_contact_number: string | null;
  secondary_contact_name: string | null;
  secondary_contact_number: string | null;
  status?: string;
  men_count: number;
   ladies_count: number;
   total_guest_price_gbp: number;
   form_total_gbp: number;
   deposit_amount_gbp: number; // Legacy field, keep for backward compatibility
   refundable_deposit_gbp: number;
   deductible_deposit_gbp: number;
   external_calendar_id?: string;
  created_at: string;
  updated_at: string;
}

export const EventRecord: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCalendarPreview, setShowCalendarPreview] = useState(false);
  const [showQuickCreateCustomer, setShowQuickCreateCustomer] = useState(false);
  const [showQuickViewCustomer, setShowQuickViewCustomer] = useState(false);
  const [selectedCustomerForView, setSelectedCustomerForView] = useState<any>(null);

   // Get event type configs
   const { data: eventTypeConfigs } = useEventTypeConfigs();
   
  // Calendar auto-sync hook
  const { autoSyncEvent, syncEventToCalendar, deleteEventFromCalendar } = useCalendarAutoSync();

  // Fetch event data
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
            phone
          )
        `)
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error) throw error;
      return data;
    }
  );


  // Fetch ethnicity options
  const { data: ethnicityOptions } = useSupabaseQuery(
    ['event_ethnicity_options', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_ethnicity_options')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('ethnicity_name');
      
      if (error) throw error;
      return data || [];
    }
  );

  // Fetch customers for lookup - include both new_customers and converted leads
  const { data: customers, refetch: refetchCustomers } = useSupabaseQuery(
    ['all-customers', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      // Fetch from new_customers table
      const { data: newCustomers, error: newError } = await supabase
        .from('new_customers')
        .select('id, first_name, last_name, email, phone')
        .eq('tenant_id', currentTenant.id);
      
      if (newError) throw newError;
      
      // Fetch from customers table (converted leads)
      const { data: convertedCustomers, error: convertedError } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);
      
      if (convertedError) throw convertedError;
      
      // Combine and normalize the data
      const allCustomers = [
        ...(newCustomers || []).map(c => ({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email,
          phone: c.phone,
          full_name: `${c.first_name} ${c.last_name}`,
          source: 'new_customers'
        })),
        ...(convertedCustomers || []).map(c => ({
          id: c.id,
          first_name: c.name?.split(' ')[0] || '',
          last_name: c.name?.split(' ').slice(1).join(' ') || '',
          email: c.email,
          phone: c.phone,
          full_name: c.name || '',
          source: 'customers'
        }))
      ];
      
      // Sort by full name
      return allCustomers.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
  );

  // Filter customers based on search query
  const filteredCustomers = customers?.filter(customer => {
    if (!customerSearchQuery) return false; // Only show results when searching
    const query = customerSearchQuery.toLowerCase().trim();
    const fullName = (customer.full_name || '').toLowerCase();
    const email = (customer.email || '').toLowerCase();
    const phone = (customer.phone || '').toLowerCase();
    return fullName.includes(query) || email.includes(query) || phone.includes(query);
  }) || [];

  // Get live form totals and individual form data
  const { liveFormTotal, formTotals, isLoading: formTotalsLoading } = useEventFormTotals(eventId);
  const { eventForms } = useEventForms(eventId);

  // Fetch payment timeline for remaining balance calculation
  const { data: payments } = useSupabaseQuery(
    ['event_payments', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_payments')
        .select('amount_gbp')
        .eq('event_id', eventId)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
      return data || [];
    }
  );

  // Auto-save mutation
  const saveEventMutation = useSupabaseMutation(
    async (data: Partial<EventData>) => {
      if (!eventId || !currentTenant?.id) throw new Error('Missing event or tenant ID');
      
      const { error } = await supabase
        .from('events')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
      return data;
    },
     {
       onSuccess: async (savedData) => {
         setLastSaved(new Date());
         setIsDirty(false);
         
          // Auto-sync to calendar if core event data changed
          if (eventData && (savedData.event_date || savedData.start_time || savedData.end_time || savedData.title || 
                           savedData.primary_contact_name || savedData.primary_contact_number ||
                           savedData.secondary_contact_name || savedData.secondary_contact_number ||
                           savedData.ethnicity)) {
            const currentEventData = { ...eventData, ...savedData };
            
            // Use centralized calendar event data preparation with tenant and event type
            const calendarEventData = await prepareCalendarEventData(
              currentEventData,
              eventForms,
              selectedCustomer || null,
              currentTenant.id,
              currentEventData.event_type // Pass event type for config lookup
            );
            
             // Auto-sync with user feedback for important changes
             try {
               await autoSyncEvent(calendarEventData, true);
             } catch (syncError) {
               console.error('Auto calendar sync failed:', syncError);
             }
          }
       },
      onError: (error) => {
        toast.error('Failed to save changes: ' + error.message);
      }
    }
  );

  // Delete event mutation
  const deleteEventMutation = useSupabaseMutation(
    async () => {
      if (!eventId || !currentTenant?.id) throw new Error('Missing event or tenant ID');
      
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

  // Cancel event mutation
  const cancelEventMutation = useSupabaseMutation(
    async () => {
      if (!eventId || !currentTenant?.id || !eventData) throw new Error('Missing event or tenant ID');
      
      // Delete from Google Calendar if it exists there
      if (eventData.external_calendar_id) {
        const calendarEventData = await prepareCalendarEventData(
          eventData,
          eventForms,
          selectedCustomer || null,
          currentTenant.id,
          eventData.event_type
        );
        
        try {
          await deleteEventFromCalendar(calendarEventData, false);
        } catch (error) {
          console.error('Failed to delete from calendar:', error);
        }
      }
      
      const { error } = await supabase
        .from('events')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Event cancelled successfully');
        // Update local state
        if (eventData) {
          setEventData({ ...eventData, status: 'cancelled' });
        }
      },
      onError: (error) => {
        toast.error('Failed to cancel event: ' + error.message);
      }
    }
  );

  // Uncancel (reactivate) event mutation
  const uncancelEventMutation = useSupabaseMutation(
    async () => {
      if (!eventId || !currentTenant?.id) throw new Error('Missing event or tenant ID');
      
      const { error } = await supabase
        .from('events')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Event reactivated successfully');
        // Update local state
        if (eventData) {
          setEventData({ ...eventData, status: 'active' });
        }
      },
      onError: (error) => {
        toast.error('Failed to reactivate event: ' + error.message);
      }
    }
  );

  // Initialize event data
  useEffect(() => {
    if (event) {
      // Handle ethnicity migration from string to array
      let processedEvent = { ...event };
      if (typeof event.ethnicity === 'string' && event.ethnicity) {
        processedEvent.ethnicity = [event.ethnicity];
      } else if (!event.ethnicity) {
        processedEvent.ethnicity = [];
      }
      setEventData(processedEvent);
    }
  }, [event]);

  // Smart auto-save with different delays based on field type
  const debouncedSave = useCallback((data: Partial<EventData>, fieldType: 'text' | 'toggle' | 'number' = 'text') => {
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
    }
    
    let delay = 500; // default
    if (fieldType === 'text') delay = 2000; // typing fields
    if (fieldType === 'number') delay = 1000; // price/quantity fields
    if (fieldType === 'toggle') delay = 0; // immediate for toggles/selects
    
    const timeoutId = setTimeout(() => {
      saveEventMutation.mutate(data);
    }, delay);
    
    setSaveTimeoutId(timeoutId);
  }, [saveTimeoutId, saveEventMutation]);

  // Handle field changes with smart auto-save
  const handleFieldChange = useCallback((field: keyof EventData, value: any, fieldType: 'text' | 'toggle' | 'number' = 'text') => {
    if (!eventData) return;
    
    // Track date changes
    if (field === 'event_date' && eventData.event_date !== value) {
      const updates: Partial<EventData> = {
        [field]: value,
        date_changed_at: new Date().toISOString()
      };
      
      // Set original_event_date only on first change
      if (!eventData.original_event_date) {
        updates.original_event_date = eventData.event_date;
      }
      
      const updatedData = { ...eventData, ...updates };
      setEventData(updatedData);
      setIsDirty(true);
      
      // Save both fields for date changes (immediate for dates)
      debouncedSave(updates, 'toggle');
    } else {
      const updatedData = { ...eventData, [field]: value };
      setEventData(updatedData);
      setIsDirty(true);
      
      // Trigger smart auto-save based on field type
      debouncedSave({ [field]: value }, fieldType);
    }
  }, [eventData, debouncedSave]);

  // Calculate derived values
  const totalGuests = (eventData?.men_count || 0) + (eventData?.ladies_count || 0);
  
  // CRITICAL FIX: Only include event-level guest pricing when there are NO forms (to prevent double-counting)
  const hasMultipleForms = (formTotals?.length || 0) > 0;
  const totalGuestPrice = hasMultipleForms ? 0 : (eventData?.total_guest_price_gbp || 0);
  const totalEventValue = totalGuestPrice + liveFormTotal;
   const refundableDeposit = eventData?.refundable_deposit_gbp || 0;
   const deductibleDeposit = eventData?.deductible_deposit_gbp || 0;
   const totalPaid = deductibleDeposit + (payments?.reduce((sum, payment) => sum + (payment.amount_gbp || 0), 0) || 0);
   const remainingBalanceGbp = totalEventValue - totalPaid; // Refundable deposit doesn't reduce balance
  
  const daysLeft = eventData?.event_date 
    ? Math.floor((new Date(eventData.event_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  const selectedCustomer = customers?.find(c => c.id === eventData?.customer_id);
  
  const handleCustomerClick = () => {
    if (selectedCustomer) {
      setSelectedCustomerForView(selectedCustomer);
      setShowQuickViewCustomer(true);
    }
  };

  const handleCustomerCreated = (newCustomer: any) => {
    // Update the event with the new customer
    if (eventData) {
      handleFieldChange('customer_id', newCustomer.id, 'toggle');
    }
    // Refresh the customers list
    refetchCustomers();
  };

  // PDF Generation functions
  const generateQuote = async () => {
    if (!eventData || !currentTenant) return;
    
    try {
      setIsGeneratingPDF(true);
      
      const pdfEventData = {
        id: eventData.id,
        event_name: eventData.title,
        event_type: eventData.event_type || 'Event',
        event_start_date: eventData.event_date || new Date().toISOString(),
        start_time: eventData.start_time || '00:00',
        end_time: eventData.end_time || '23:59',
        estimated_guests: totalGuests,
        total_guests: totalGuests,
        total_amount: totalEventValue,
         deposit_amount: deductibleDeposit,
        form_responses: {},
        form_total: liveFormTotal,
                        customers: selectedCustomer ? {
                          name: selectedCustomer.full_name,
          email: selectedCustomer.email || '',
          phone: selectedCustomer.phone || '',
        } : null
      };

      const tenantData = {
        business_name: currentTenant.business_name || 'Business Name',
        address_line1: currentTenant.address_line1 || 'Address Line 1',
        address_line2: currentTenant.address_line2,
        city: currentTenant.city || 'City',
        postal_code: currentTenant.postal_code || 'Postal Code',
        country: currentTenant.country || 'GB',
        contact_email: currentTenant.contact_email || 'contact@business.com',
        contact_phone: currentTenant.contact_phone || 'Phone Number'
      };

      generateQuotePDF(pdfEventData, tenantData);
      toast.success('Quote PDF generated successfully');
    } catch (error) {
      console.error('Error generating quote:', error);
      toast.error('Failed to generate quote PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateInvoice = async () => {
    if (!eventData || !currentTenant) return;
    
    try {
      setIsGeneratingPDF(true);
      
      const pdfEventData = {
        id: eventData.id,
        event_name: eventData.title,
        event_type: eventData.event_type || 'Event',
        event_start_date: eventData.event_date || new Date().toISOString(),
        start_time: eventData.start_time || '00:00',
        end_time: eventData.end_time || '23:59',
        estimated_guests: totalGuests,
        total_guests: totalGuests,
        total_amount: totalEventValue,
        deposit_amount: deductibleDeposit,
        form_responses: {},
        form_total: liveFormTotal,
                        customers: selectedCustomer ? {
                          name: selectedCustomer.full_name,
          email: selectedCustomer.email || '',
          phone: selectedCustomer.phone || '',
        } : null
      };

      const tenantData = {
        business_name: currentTenant.business_name || 'Business Name',
        address_line1: currentTenant.address_line1 || 'Address Line 1',
        address_line2: currentTenant.address_line2,
        city: currentTenant.city || 'City',
        postal_code: currentTenant.postal_code || 'Postal Code',
        country: currentTenant.country || 'GB',
        contact_email: currentTenant.contact_email || 'contact@business.com',
        contact_phone: currentTenant.contact_phone || 'Phone Number'
      };

      generateInvoicePDF(pdfEventData, tenantData);
      toast.success('Invoice PDF generated successfully');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Calendar sync function - now shows preview first
  const showCalendarSyncPreview = async () => {
    if (!eventData || !currentTenant) return;
    
    try {
      setIsSyncing(true);
      
      // Refresh event data from database to get latest external_calendar_id
      const { data: freshEventData, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventData.id)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (fetchError) throw fetchError;

      // Enhanced validation for multi-session events
      let startTime = freshEventData.start_time;
      let endTime = freshEventData.end_time;
      let eventEndDate = freshEventData.event_end_date || freshEventData.event_date;

      // Check for "All Day" multi-session events that lack start/end times
      if (!startTime || !endTime) {
        console.log('Detecting multi-session event, extracting times from activeForms...');
        
        // Use the eventForms data that's already loaded
        if (!eventForms?.length) {
          toast.error('Event must have a name, date, and time to sync to calendar');
          return;
        }

        // Extract times directly from event_forms start_time and end_time columns
        const formsWithTimes = eventForms.filter(form => form.start_time && form.end_time);
        
        if (formsWithTimes.length === 0) {
          toast.error('Unable to determine event timing from forms. Please set start and end times.');
          return;
        }

        // Use earliest start and latest end from all forms
        const startTimes = formsWithTimes.map(form => form.start_time).sort();
        const endTimes = formsWithTimes.map(form => form.end_time).sort();
        startTime = startTimes[0];
        endTime = endTimes[endTimes.length - 1];
        
        console.log('Extracted times from forms:', { startTime, endTime, formsCount: formsWithTimes.length });
      }

      if (!freshEventData.event_date || !startTime || !freshEventData.title) {
        toast.error('Event must have a name, date, and time to sync to calendar');
        return;
      }

      // Update eventData with fresh data for preview
      setEventData(prev => {
        if (!prev) return prev;
        return { 
          ...prev, 
          title: freshEventData.title,
          event_date: freshEventData.event_date,
          event_end_date: freshEventData.event_end_date,
          start_time: freshEventData.start_time,
          end_time: freshEventData.end_time,
          event_type: freshEventData.event_type,
          primary_contact_name: freshEventData.primary_contact_name,
          primary_contact_number: freshEventData.primary_contact_number,
          secondary_contact_name: freshEventData.secondary_contact_name,
          secondary_contact_number: freshEventData.secondary_contact_number,
          ethnicity: Array.isArray(freshEventData.ethnicity) ? (freshEventData.ethnicity as string[]) : freshEventData.ethnicity ? [(freshEventData.ethnicity as string)] : [],
          men_count: freshEventData.men_count,
          ladies_count: freshEventData.ladies_count,
          external_calendar_id: freshEventData.external_calendar_id
        };
      });

      // Show the preview dialog
      setShowCalendarPreview(true);
    } catch (error) {
      console.error('Error preparing calendar preview:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to prepare calendar preview');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle actual sync from preview dialog
  const handleCalendarSync = async (editedData: {
    title: string;
    startDateTime: string;
    endDateTime: string;
    description: string;
    action: 'create' | 'update';
  }) => {
    if (!eventData || !currentTenant) return;
    
    try {
      // Parse edited datetime strings
      const startDate = editedData.startDateTime.split('T')[0];
      const startTime = editedData.startDateTime.split('T')[1];
      const endDate = editedData.endDateTime.split('T')[0];
      const endTime = editedData.endDateTime.split('T')[1];

      // Create calendar event data using the edited information
      const calendarEventData = {
        id: eventData.id,
        event_name: editedData.title,
        event_start_date: startDate,
        event_date: startDate,
        event_end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        event_type: eventData.event_type || '',
        primary_contact_name: eventData.primary_contact_name || '',
        primary_contact_number: eventData.primary_contact_number || '',
        secondary_contact_name: eventData.secondary_contact_name || '',
        secondary_contact_number: eventData.secondary_contact_number || '',
        men_count: eventData.men_count || 0,
        ladies_count: eventData.ladies_count || 0,
        estimated_guests: (eventData.men_count || 0) + (eventData.ladies_count || 0),
        ethnicity: Array.isArray(eventData.ethnicity) ? eventData.ethnicity : eventData.ethnicity ? [eventData.ethnicity] : [],
        external_calendar_id: eventData.external_calendar_id,
        // Override description with edited version
        description: editedData.description,
        tenant_id: currentTenant.id
      };

      // Use the calendar auto-sync hook for consistency
      const result = await syncEventToCalendar(calendarEventData, editedData.action);

      if (!result.success) {
        throw new Error(result.reason || 'Calendar sync failed');
      }

      // Update local state with external ID if returned
      setEventData(prev => {
        if (!prev) return prev;
        return { 
          ...prev, 
          external_calendar_id: result.externalId || prev.external_calendar_id 
        };
      });
      
      toast.success(`Event ${editedData.action === 'create' ? 'created in' : 'updated in'} calendar successfully`);
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync to calendar');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading event record...</div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-muted-foreground">Event not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header with Date Information */}
      <div className="space-y-4 border-b pb-4">
        {/* Current Event Date Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Event Date:</span>
                <Badge variant="secondary" className="text-base">
                  {eventData.event_date ? format(new Date(eventData.event_date), 'PPP') : 'Not set'}
                </Badge>
                {eventData.event_date && daysLeft !== null && (
                  <Badge variant={daysLeft <= 7 ? "destructive" : "outline"} className="text-sm">
                    {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Today' : `${Math.abs(daysLeft)} days ago`}
                  </Badge>
                )}
                {eventData.status === 'cancelled' && (
                  <Badge variant="destructive" className="text-sm">
                    CANCELLED
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Date Change Warning */}
        {eventData.original_event_date && eventData.date_changed_at && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <History className="h-5 w-5 text-yellow-600" />
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-yellow-800 dark:text-yellow-200">Date Changed:</span>
              <span className="text-yellow-700 dark:text-yellow-300">
                was {format(new Date(eventData.original_event_date), 'PPP')} → now {eventData.event_date ? format(new Date(eventData.event_date), 'PPP') : 'Not set'}
              </span>
              <span className="text-yellow-600 dark:text-yellow-400">
                on {format(new Date(eventData.date_changed_at), 'PPp')}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Event Record</h1>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <Badge variant="secondary" className="text-xs">
              Auto-saved {Math.floor((new Date().getTime() - lastSaved.getTime()) / 1000)}s ago
            </Badge>
          )}
          {isDirty && (
            <Badge variant="outline" className="text-xs">
              Saving...
            </Badge>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Preview Quote/Invoice
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={showCalendarSyncPreview}
              disabled={isSyncing || eventData.status === 'cancelled'}
            >
              <CalendarSyncIcon className="h-4 w-4 mr-2" />
              {isSyncing ? 'Syncing...' : 'Sync to Calendar'}
            </Button>

            {/* Cancel/Uncancel Button */}
            {eventData.status === 'cancelled' ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">
                    Reactivate Event
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reactivate Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to reactivate this event? It will appear in the calendar view again and can be synced to your calendar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => uncancelEventMutation.mutate({})}>
                      Reactivate Event
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-amber-600 border-amber-600 hover:bg-amber-50">
                    Cancel Event
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this event? This will remove it from your calendar view and delete it from Google Calendar. You can reactivate it later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => cancelEventMutation.mutate({})}>
                      Cancel Event
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this event? This action cannot be undone and will remove all associated data including forms, payments, and communications.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteEventMutation.mutate({})}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteEventMutation.isPending ? 'Deleting...' : 'Delete Event'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
            <Button variant="ghost" size="sm" onClick={() => navigate('/events')}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* General Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📋</span> General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={eventData.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="Event title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Event Date</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !eventData.event_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {eventData.event_date ? format(new Date(eventData.event_date), "dd/MM/yyyy") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={eventData.event_date ? new Date(eventData.event_date + 'T00:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                handleFieldChange('event_date', `${year}-${month}-${day}`);
                              } else {
                                handleFieldChange('event_date', null);
                              }
                            }}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      {eventData.original_event_date && eventData.original_event_date !== eventData.event_date && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="absolute -top-1 -right-1">
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  <History className="h-3 w-3 mr-1" />
                                  Changed
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Original date: {format(new Date(eventData.original_event_date), 'dd/MM/yyyy')}</p>
                              {eventData.date_changed_at && (
                                <p>Changed on: {format(new Date(eventData.date_changed_at), 'dd/MM/yyyy')}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {daysLeft !== null && (
                      <Badge variant={daysLeft < 7 ? "destructive" : "secondary"}>
                        {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Today' : `${Math.abs(daysLeft)} days ago`}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TimeDisplay 
                  eventData={eventData}
                  eventForms={eventForms}
                  onTimeChange={handleFieldChange}
                  formatTime={formatTime}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select
                    value={eventData.event_type || ''}
                    onValueChange={(value) => handleFieldChange('event_type', value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypeConfigs?.map((config) => (
                        <SelectItem key={config.id} value={config.event_type}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: config.color }}
                            />
                            {config.display_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {selectedCustomer.full_name}
                          </div>
                          {selectedCustomer.email && (
                            <div className="text-sm text-muted-foreground truncate">
                              {selectedCustomer.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCustomerClick}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleFieldChange('customer_id', null);
                            setCustomerSearchQuery('');
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search customers..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          className="pl-10 pr-10"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowQuickCreateCustomer(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {customerSearchQuery && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto border rounded-md bg-background shadow-lg">
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((customer) => (
                              <div
                                key={customer.id}
                                className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0 bg-background"
                                onClick={() => {
                                  handleFieldChange('customer_id', customer.id);
                                  setCustomerSearchQuery('');
                                }}
                              >
                                <div className="font-medium">
                                  {customer.full_name}
                                </div>
                                {customer.email && (
                                  <div className="text-sm text-muted-foreground">
                                    {customer.email}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-sm text-muted-foreground bg-background">
                              No customers found matching "{customerSearchQuery}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Ethnicity</Label>
                  <MultiSelect
                    options={ethnicityOptions?.map(option => ({
                      value: option.ethnicity_name,
                      label: option.ethnicity_name
                    })) || []}
                    value={Array.isArray(eventData.ethnicity) ? eventData.ethnicity : eventData.ethnicity ? [eventData.ethnicity] : []}
                    onValueChange={(value) => handleFieldChange('ethnicity', value)}
                    placeholder="Select ethnicities..."
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" /> Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_contact_name">Primary Contact</Label>
                  <Input
                    id="primary_contact_name"
                    value={eventData.primary_contact_name || ''}
                    onChange={(e) => handleFieldChange('primary_contact_name', e.target.value || null)}
                    placeholder="Primary contact name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="primary_contact_number">Primary Number</Label>
                  <Input
                    id="primary_contact_number"
                    value={eventData.primary_contact_number || ''}
                    onChange={(e) => handleFieldChange('primary_contact_number', e.target.value || null)}
                    placeholder="Primary contact number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="secondary_contact_name">Secondary Contact</Label>
                  <Input
                    id="secondary_contact_name"
                    value={eventData.secondary_contact_name || ''}
                    onChange={(e) => handleFieldChange('secondary_contact_name', e.target.value || null)}
                    placeholder="Secondary contact name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secondary_contact_number">Secondary Number</Label>
                  <Input
                    id="secondary_contact_number"
                    value={eventData.secondary_contact_number || ''}
                    onChange={(e) => handleFieldChange('secondary_contact_number', e.target.value || null)}
                    placeholder="Secondary contact number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Guests Section - only show if there are NO forms (prevent double-counting) */}
          {!hasMultipleForms && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Guests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="men_count">Men Count</Label>
                    <Input
                      id="men_count"
                      type="number"
                      min="0"
                      value={eventData.men_count || 0}
                      onChange={(e) => handleFieldChange('men_count', parseInt(e.target.value) || 0, 'number')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ladies_count">Ladies Count</Label>
                    <Input
                      id="ladies_count"
                      type="number"
                      min="0"
                      value={eventData.ladies_count || 0}
                      onChange={(e) => handleFieldChange('ladies_count', parseInt(e.target.value) || 0, 'number')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total Guests</Label>
                    <div className="h-10 flex items-center px-3 bg-muted rounded-md text-sm font-medium">
                      {totalGuests}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Finances Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PoundSterling className="h-5 w-5" /> Finances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Only show event-level guest pricing when there are NO forms */}
                {!hasMultipleForms && (
                  <div className="space-y-2">
                    <Label htmlFor="total_guest_price_gbp">Total Guest Price</Label>
                    <PriceInput
                      value={eventData.total_guest_price_gbp || 0}
                      onChange={(value) => handleFieldChange('total_guest_price_gbp', value)}
                      placeholder="0.00"
                    />
                  </div>
                )}
                
                {hasMultipleForms && (
                  <div className="space-y-2">
                    <Label>Event-Level Guest Price</Label>
                    <div className="h-10 flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground">
                      Hidden (using form-level pricing)
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Live Form Total</Label>
                  <div className="h-10 flex items-center px-3 bg-muted rounded-md text-sm font-medium">
                    {formatCurrency(liveFormTotal)}
                    {formTotalsLoading && <span className="ml-2 text-xs text-muted-foreground">Loading...</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="refundable_deposit_gbp">
                    Refundable Deposit
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="ml-1 text-xs text-muted-foreground cursor-help">(?)</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Money held as security, does not reduce remaining balance</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <PriceInput
                    value={eventData.refundable_deposit_gbp || 0}
                    onChange={(value) => handleFieldChange('refundable_deposit_gbp', value)}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="deductible_deposit_gbp">
                    Deductible Deposit
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="ml-1 text-xs text-muted-foreground cursor-help">(?)</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Payment towards total cost, reduces remaining balance</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <PriceInput
                    value={eventData.deductible_deposit_gbp || 0}
                    onChange={(value) => handleFieldChange('deductible_deposit_gbp', value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Deposits</Label>
                  <div className="h-10 flex items-center px-3 bg-muted rounded-md text-sm font-medium">
                    {formatCurrency(refundableDeposit + deductibleDeposit)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Remaining Balance</Label>
                  <div className="h-10 flex items-center px-3 bg-muted rounded-md text-sm font-medium">
                    {formatCurrency(remainingBalanceGbp)}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t space-y-2">
                {/* Individual Form Breakdown */}
                {formTotals && formTotals.length > 0 && (
                  <div className="space-y-1 pb-2 border-b">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Form Breakdown:</div>
                    {formTotals.map((formTotal) => {
                      // Find matching eventForm for guest data
                      const eventForm = eventForms?.find(ef => ef.id === formTotal.id);
                      
                      return (
                        <div key={formTotal.id} className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-2">
                            {formTotal.form_label}
                            {eventForm?.guest_count && (
                              <Badge variant="secondary" className="text-xs">
                                {eventForm.guest_count} guests
                              </Badge>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            {eventForm?.guest_price_total && eventForm.guest_price_total > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Guest: {formatCurrency(eventForm.guest_price_total)}
                              </span>
                            )}
                            <span className="font-medium">
                              Form: {formatCurrency(formTotal.form_total)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span>Combined Form Total:</span>
                  <span className="font-medium">{formatCurrency(liveFormTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Paid:</span>
                  <span className="font-medium">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-semibold border-t pt-2">
                  <span>Event Total:</span>
                  <span>{formatCurrency(totalEventValue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communications Timeline */}
          <CommunicationsTimeline eventId={eventId} />

          {/* Payment Timeline */}
          <PaymentTimeline eventId={eventId} />
        </div>
      </div>

      {/* Quote/Invoice Preview Dialog */}
      <QuoteInvoicePreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        eventData={{
          ...eventData,
            customers: selectedCustomer ? {
              name: selectedCustomer.full_name,
            email: selectedCustomer.email || '',
            phone: selectedCustomer.phone || '',
          } : null
        }}
        tenantData={{
          business_name: currentTenant?.business_name || '',
          address_line1: currentTenant?.address_line1 || '',
          address_line2: currentTenant?.address_line2,
          city: currentTenant?.city || '',
          postal_code: currentTenant?.postal_code || '',
          country: currentTenant?.country || 'GB',
          contact_email: currentTenant?.contact_email || '',
          contact_phone: currentTenant?.contact_phone || '',
          company_logo_url: currentTenant?.company_logo_url
        }}
        tenantId={currentTenant?.id || ''}
        eventForms={eventForms || []}
      />

      {/* Calendar Sync Preview Dialog */}
      {eventData && currentTenant && (
        <CalendarSyncPreview
          isOpen={showCalendarPreview}
          onClose={() => setShowCalendarPreview(false)}
          onSync={handleCalendarSync}
          eventData={{
            id: eventData.id,
            title: eventData.title,
            event_date: eventData.event_date || '',
            event_end_date: eventData.event_end_date,
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            event_type: eventData.event_type || '',
            primary_contact_name: eventData.primary_contact_name,
            primary_contact_number: eventData.primary_contact_number,
            secondary_contact_name: eventData.secondary_contact_name,
            secondary_contact_number: eventData.secondary_contact_number,
            men_count: eventData.men_count,
            ladies_count: eventData.ladies_count,
            guest_mixture: 'Mixed', // Add default guest mixture
            external_calendar_id: eventData.external_calendar_id
          }}
          eventForms={eventForms?.map(form => ({
            id: form.id,
            form_label: form.form_label,
            start_time: form.start_time,
            end_time: form.end_time,
            men_count: form.men_count,
            ladies_count: form.ladies_count,
            form_responses: form.form_responses || {},
            form_id: form.form_id
          })) || []}
          tenantId={currentTenant.id}
        />
      )}

      {/* Quick Create Customer Dialog */}
      <QuickCreateCustomerDialog
        open={showQuickCreateCustomer}
        onOpenChange={setShowQuickCreateCustomer}
        onCustomerCreated={handleCustomerCreated}
      />

      {/* Quick View Customer Dialog */}
      <QuickViewCustomerDialog
        open={showQuickViewCustomer}
        onOpenChange={setShowQuickViewCustomer}
        customer={selectedCustomerForView}
      />
    </div>
  );
};