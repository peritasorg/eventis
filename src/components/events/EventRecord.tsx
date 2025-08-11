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
import { CalendarIcon, X, Users, Phone, PoundSterling, MessageSquare, CreditCard, User, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { useEventFormTotals } from '@/hooks/useEventFormTotals';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EventData {
  id: string;
  tenant_id: string;
  title: string;
  event_type: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  customer_id: string | null;
  ethnicity: string | null;
  primary_contact_name: string | null;
  primary_contact_number: string | null;
  secondary_contact_name: string | null;
  secondary_contact_number: string | null;
  men_count: number;
  ladies_count: number;
  total_guest_price_gbp: number;
  form_total_gbp: number;
  deposit_amount_gbp: number;
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

  // Get event type configs
  const { data: eventTypeConfigs } = useEventTypeConfigs();

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

  // Fetch time ranges for quick select
  const { data: timeRanges } = useSupabaseQuery(
    ['event_time_ranges', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_time_ranges')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
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

  // Fetch customers for lookup
  const { data: customers } = useSupabaseQuery(
    ['new-customers', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('new_customers')
        .select('id, first_name, last_name, email, phone')
        .eq('tenant_id', currentTenant.id)
        .order('first_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  );

  // Filter customers based on search query
  const filteredCustomers = customers?.filter(customer => {
    if (!customerSearchQuery) return true;
    const query = customerSearchQuery.toLowerCase();
    const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
    const email = customer.email?.toLowerCase() || '';
    return fullName.includes(query) || email.includes(query);
  }) || [];

  // Get live form totals
  const { liveFormTotal, isLoading: formTotalsLoading } = useEventFormTotals(eventId);

  // Fetch payment timeline for remaining balance calculation (unified with PaymentTimeline)
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
      onSuccess: () => {
        setLastSaved(new Date());
        setIsDirty(false);
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

  // Initialize event data
  useEffect(() => {
    if (event) {
      setEventData(event);
    }
  }, [event]);

  // Auto-save debounced function
  const debouncedSave = useCallback((data: Partial<EventData>) => {
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
    }
    
    const timeoutId = setTimeout(() => {
      saveEventMutation.mutate(data);
    }, 500);
    
    setSaveTimeoutId(timeoutId);
  }, [saveTimeoutId, saveEventMutation]);

  // Handle field changes with auto-save
  const handleFieldChange = useCallback((field: keyof EventData, value: any) => {
    if (!eventData) return;
    
    const updatedData = { ...eventData, [field]: value };
    setEventData(updatedData);
    setIsDirty(true);
    
    // Trigger auto-save
    debouncedSave({ [field]: value });
  }, [eventData, debouncedSave]);

  // Calculate derived values with live form totals
  const totalGuests = (eventData?.men_count || 0) + (eventData?.ladies_count || 0);
  const totalGuestPrice = eventData?.total_guest_price_gbp || 0;
  const totalEventValue = totalGuestPrice + liveFormTotal;
  const depositAmount = eventData?.deposit_amount_gbp || 0;
  const totalPaid = depositAmount + (payments?.reduce((sum, payment) => sum + (payment.amount_gbp || 0), 0) || 0);
  const remainingBalanceGbp = totalEventValue - totalPaid;
  
  const daysLeft = eventData?.event_date 
    ? Math.floor((new Date(eventData.event_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    return timeString.slice(0, 5); // Format HH:MM
  };

  const selectedCustomer = customers?.find(c => c.id === eventData?.customer_id);
  
  const handleCustomerClick = () => {
    if (selectedCustomer) {
      navigate(`/customers/${selectedCustomer.id}`);
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-semibold">Event Record</h1>
        <div className="flex items-center gap-4">
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

      <div className="grid gap-6">
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
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
                  {daysLeft !== null && (
                    <Badge variant={daysLeft < 7 ? "destructive" : "secondary"}>
                      {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Today' : `${Math.abs(daysLeft)} days ago`}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formatTime(eventData.start_time)}
                  onChange={(e) => handleFieldChange('start_time', e.target.value || null)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formatTime(eventData.end_time)}
                  onChange={(e) => handleFieldChange('end_time', e.target.value || null)}
                />
              </div>

              {timeRanges && timeRanges.length > 0 && (
                <div className="space-y-2">
                  <Label>Quick Times</Label>
                  <Select
                    onValueChange={(value) => {
                      const range = timeRanges.find(r => r.id === value);
                      if (range) {
                        handleFieldChange('start_time', range.start_time);
                        handleFieldChange('end_time', range.end_time);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeRanges.map((range) => (
                        <SelectItem key={range.id} value={range.id}>
                          {range.name} ({formatTime(range.start_time)} - {formatTime(range.end_time)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                  <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {selectedCustomer.first_name} {selectedCustomer.last_name}
                      </span>
                      {selectedCustomer.email && (
                        <span className="text-sm text-muted-foreground">
                          ({selectedCustomer.email})
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCustomerClick}
                      >
                        View Profile
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
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search customers..."
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {customerSearchQuery && (
                      <div className="max-h-48 overflow-y-auto border rounded-md bg-background">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              className="p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                handleFieldChange('customer_id', customer.id);
                                setCustomerSearchQuery('');
                              }}
                            >
                              <div className="font-medium">
                                {customer.first_name} {customer.last_name}
                              </div>
                              {customer.email && (
                                <div className="text-sm text-muted-foreground">
                                  {customer.email}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">
                            No customers found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Ethnicity</Label>
                <Select
                  value={eventData.ethnicity || ''}
                  onValueChange={(value) => handleFieldChange('ethnicity', value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ethnicity" />
                  </SelectTrigger>
                  <SelectContent>
                    {ethnicityOptions?.map((option) => (
                      <SelectItem key={option.id} value={option.ethnicity_name}>
                        {option.ethnicity_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        {/* Guests Section */}
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
                  onChange={(e) => handleFieldChange('men_count', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ladies_count">Ladies Count</Label>
                <Input
                  id="ladies_count"
                  type="number"
                  min="0"
                  value={eventData.ladies_count || 0}
                  onChange={(e) => handleFieldChange('ladies_count', parseInt(e.target.value) || 0)}
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

        {/* Finances Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PoundSterling className="h-5 w-5" /> Finances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_guest_price_gbp">Total Guest Price</Label>
                <PriceInput
                  value={eventData.total_guest_price_gbp || 0}
                  onChange={(value) => handleFieldChange('total_guest_price_gbp', value)}
                  placeholder="0.00"
                />
              </div>
              
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
                <Label htmlFor="deposit_amount_gbp">Deposit Amount</Label>
                <PriceInput
                  value={eventData.deposit_amount_gbp || 0}
                  onChange={(value) => handleFieldChange('deposit_amount_gbp', value)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Remaining Balance</Label>
                <div className="h-10 flex items-center px-3 bg-muted rounded-md text-sm font-medium">
                  {formatCurrency(remainingBalanceGbp)}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t space-y-2">
              <div className="flex justify-between items-center">
                <span>Live Form Total:</span>
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
      </div>
    </div>
  );
};