import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar, DollarSign, Users, MessageSquare, Receipt, Clock } from 'lucide-react';
import { CommunicationTimeline } from '@/components/events/CommunicationTimeline';
import { FinanceTimeline } from '@/components/events/FinanceTimeline';
import { useSupabaseMutation, useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EventOverviewTabProps {
  event: any;
}

export const EventOverviewTab: React.FC<EventOverviewTabProps> = ({ event }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { currentTenant } = useAuth();

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
    ['finance-timeline', event.id],
    async () => {
      if (!event.id || !currentTenant?.id) return [];
      
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

  const updateEventMutation = useSupabaseMutation(
    async (updates: any) => {
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
      invalidateQueries: [['event', event.id]],
      onSuccess: () => setIsEditing(false)
    }
  );

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const customerIdValue = formData.get('customer_id') as string;
    const isMultipleDays = formData.get('event_multiple_days') === 'on';
    
    const updates = {
      customer_id: customerIdValue === 'none' ? null : customerIdValue,
      event_multiple_days: isMultipleDays,
      event_start_date: formData.get('event_start_date') as string,
      event_end_date: isMultipleDays ? (formData.get('event_end_date') as string) : (formData.get('event_start_date') as string),
      ethnicity: formData.get('ethnicity') as string,
      primary_contact_name: formData.get('primary_contact_name') as string,
      primary_contact_phone: formData.get('primary_contact_phone') as string,
      secondary_contact_name: formData.get('secondary_contact_name') as string,
      secondary_contact_relationship: formData.get('secondary_contact_relationship') as string,
      secondary_contact_phone: formData.get('secondary_contact_phone') as string,
      men_count: parseInt(formData.get('men_count') as string) || 0,
      ladies_count: parseInt(formData.get('ladies_count') as string) || 0,
      total_guests: parseInt(formData.get('total_guests') as string) || 0,
      event_mix_type: formData.get('event_mix_type') as string,
      total_guest_price: parseFloat(formData.get('total_guest_price') as string) || 0,
      deposit_amount: parseFloat(formData.get('deposit_amount') as string) || 0,
    };

    updateEventMutation.mutate(updates);
  };

  const calculateDaysDue = () => {
    const eventDate = new Date(event.event_start_date);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate financial totals
  const totalGuestPrice = event.total_guest_price || 0;
  const formTotal = event.form_total || 0;
  const depositAmount = event.deposit_amount || 0;
  const totalEventPrice = totalGuestPrice + formTotal;
  
  // Calculate total paid from finance timeline
  const totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
  
  // Calculate balance due: Total Event Price - Deposit - Finance Timeline Payments
  const balanceDue = totalEventPrice - depositAmount - totalPaid;

  const daysDue = calculateDaysDue();

  return (
    <div className="space-y-4">
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Event Information */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Event Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
               <div>
                <Label className="text-xs font-medium text-muted-foreground">Event Title</Label>
                <div className="text-sm font-medium break-words">{event.event_name}</div>
              </div>
              
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Event Type</Label>
                <div className="text-sm capitalize">{event.event_type || 'Not specified'}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Event Date(s)</Label>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        name="event_multiple_days"
                        defaultChecked={event.event_multiple_days}
                      />
                      <Label>Multiple day event</Label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="event_start_date">Start Date</Label>
                        <Input
                          id="event_start_date"
                          name="event_start_date"
                          type="date"
                          defaultValue={event.event_start_date}
                        />
                      </div>
                      {event.event_multiple_days && (
                        <div>
                          <Label htmlFor="event_end_date">End Date</Label>
                          <Input
                            id="event_end_date"
                            name="event_end_date"
                            type="date"
                            defaultValue={event.event_end_date}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-medium">
                      {new Date(event.event_start_date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    {event.event_multiple_days && event.event_end_date && event.event_end_date !== event.event_start_date && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Until: {new Date(event.event_end_date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Event Time</Label>
                <div className="text-sm">
                  {event.start_time && event.end_time ? (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{event.start_time} - {event.end_time}</span>
                    </div>
                  ) : (
                    'Time not specified'
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Countdown</Label>
                <div className={`text-sm font-medium ${
                  daysDue < 0 ? 'text-destructive' : daysDue < 7 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {daysDue < 0 ? `${Math.abs(daysDue)} days overdue` : 
                   daysDue === 0 ? 'Today' : 
                   `${daysDue} days until event`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                Basic Information
                {!isEditing ? (
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-7 px-2 text-xs"
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      className="h-7 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      size="sm"
                      disabled={updateEventMutation.isPending}
                      className="h-7 px-2 text-xs"
                    >
                      Save
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Label htmlFor="customer_id" className="text-xs font-medium text-muted-foreground">Customer</Label>
                {isEditing ? (
                  <Select name="customer_id" defaultValue={event.customer_id || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No customer assigned</SelectItem>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="truncate">
                            {customer.name}
                            {customer.company && (
                              <span className="text-gray-500 ml-2">- {customer.company}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="break-words">
                    <div className="font-medium">{event.customers?.name || 'No customer assigned'}</div>
                    {event.customers?.company && (
                      <div className="text-sm text-gray-600 break-words">{event.customers.company}</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="ethnicity">Ethnicity</Label>
                {isEditing ? (
                  <Input
                    id="ethnicity"
                    name="ethnicity"
                    defaultValue={event.ethnicity || ''}
                    placeholder="e.g., Somali, Pakistani, etc."
                  />
                ) : (
                  <div className="text-sm break-words">{event.ethnicity || 'Not specified'}</div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_contact_name">Primary Contact</Label>
                  {isEditing ? (
                    <Input
                      id="primary_contact_name"
                      name="primary_contact_name"
                      defaultValue={event.primary_contact_name || ''}
                      placeholder="Contact name"
                    />
                  ) : (
                    <div className="text-sm break-words">{event.primary_contact_name || 'Not specified'}</div>
                  )}
                </div>
                <div>
                  <Label htmlFor="primary_contact_phone">Phone</Label>
                  {isEditing ? (
                    <Input
                      id="primary_contact_phone"
                      name="primary_contact_phone"
                      defaultValue={event.primary_contact_phone || ''}
                      placeholder="Phone number"
                    />
                  ) : (
                    <div className="text-sm break-words">{event.primary_contact_phone || 'Not specified'}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="secondary_contact_name">Secondary Contact</Label>
                  {isEditing ? (
                    <Input
                      id="secondary_contact_name"
                      name="secondary_contact_name"
                      defaultValue={event.secondary_contact_name || ''}
                      placeholder="Contact name"
                    />
                  ) : (
                    <div className="text-sm break-words">{event.secondary_contact_name || 'Not specified'}</div>
                  )}
                </div>
                <div>
                  <Label htmlFor="secondary_contact_phone">Phone</Label>
                  {isEditing ? (
                    <Input
                      id="secondary_contact_phone"
                      name="secondary_contact_phone"
                      defaultValue={event.secondary_contact_phone || ''}
                      placeholder="Phone number"
                    />
                  ) : (
                    <div className="text-sm break-words">{event.secondary_contact_phone || 'Not specified'}</div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="secondary_contact_relationship">Relationship to Main Contact</Label>
                {isEditing ? (
                  <Input
                    id="secondary_contact_relationship"
                    name="secondary_contact_relationship"
                    defaultValue={event.secondary_contact_relationship || ''}
                    placeholder="e.g., Spouse, Parent, etc."
                  />
                ) : (
                  <div className="text-sm break-words">{event.secondary_contact_relationship || 'Not specified'}</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Guest Information */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="men_count">Men Count</Label>
                  {isEditing ? (
                    <Input
                      id="men_count"
                      name="men_count"
                      type="number"
                      defaultValue={event.men_count || 0}
                    />
                  ) : (
                    <div className="text-lg font-medium">{event.men_count || 0}</div>
                  )}
                </div>
                <div>
                  <Label htmlFor="ladies_count">Ladies Count</Label>
                  {isEditing ? (
                    <Input
                      id="ladies_count"
                      name="ladies_count"
                      type="number"
                      defaultValue={event.ladies_count || 0}
                    />
                  ) : (
                    <div className="text-lg font-medium">{event.ladies_count || 0}</div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="event_mix_type">Event Mix Type</Label>
                {isEditing ? (
                  <Select name="event_mix_type" defaultValue={event.event_mix_type || 'mixed'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="men_only">Men Only</SelectItem>
                      <SelectItem value="ladies_only">Ladies Only</SelectItem>
                      <SelectItem value="separate_sections">Separate Sections</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm capitalize break-words">{event.event_mix_type || 'Mixed'}</div>
                )}
              </div>

              <div>
                <Label htmlFor="total_guests">Total Guest Count</Label>
                {isEditing ? (
                  <Input
                    id="total_guests"
                    name="total_guests"
                    type="number"
                    defaultValue={event.total_guests || (event.men_count || 0) + (event.ladies_count || 0)}
                  />
                ) : (
                  <div className="text-lg font-medium">
                    {event.total_guests || (event.men_count || 0) + (event.ladies_count || 0)} guests
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="total_guest_price">Total Guest Price</Label>
                {isEditing ? (
                  <Input
                    id="total_guest_price"
                    name="total_guest_price"
                    type="number"
                    step="0.01"
                    defaultValue={event.total_guest_price || 0}
                  />
                ) : (
                  <div className="text-lg font-medium">£{(event.total_guest_price || 0).toLocaleString()}</div>
                )}
              </div>
            </CardContent>
          </Card>

        {/* Financial Information */}
        <Card className="lg:col-span-2 xl:col-span-3 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-blue-50 rounded-md">
                <Label className="text-xs text-blue-700">Guest Price</Label>
                {isEditing ? (
                  <Input
                    name="total_guest_price"
                    type="number"
                    step="0.01"
                    defaultValue={event.total_guest_price || 0}
                    className="mt-1 h-8 text-sm"
                  />
                ) : (
                  <div className="text-lg font-bold text-blue-900">
                    £{totalGuestPrice.toFixed(2)}
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-green-50 rounded-md">
                <Label className="text-xs text-green-700">Form Total</Label>
                <div className="text-lg font-bold text-green-900">
                  £{formTotal.toFixed(2)}
                </div>
              </div>
              
              <div className="p-3 bg-purple-50 rounded-md">
                <Label className="text-xs text-purple-700">Total Event Price</Label>
                <div className="text-lg font-bold text-purple-900">
                  £{totalEventPrice.toFixed(2)}
                </div>
              </div>
              
              <div className="p-3 bg-orange-50 rounded-md">
                <Label className="text-xs text-orange-700">Deposit</Label>
                {isEditing ? (
                  <Input
                    name="deposit_amount"
                    type="number"
                    step="0.01"
                    defaultValue={event.deposit_amount || 0}
                    className="mt-1 h-8 text-sm"
                  />
                ) : (
                  <div className="text-lg font-bold text-orange-900">
                    £{depositAmount.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-100 rounded-md">
                <Label className="text-xs text-green-700">Total Paid</Label>
                <div className="text-lg font-bold text-green-900">
                  £{totalPaid.toFixed(2)}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Deposit + Finance Timeline
                </div>
              </div>
              
              <div className={`p-3 rounded-md ${balanceDue > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <Label className={`text-xs ${balanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  Balance Due
                </Label>
                <div className={`text-lg font-bold ${balanceDue > 0 ? 'text-red-900' : 'text-green-900'}`}>
                  £{balanceDue.toFixed(2)}
                </div>
                <div className={`text-xs mt-1 ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {balanceDue > 0 ? 'Outstanding amount' : 'Fully paid'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </form>

      {/* Communication & Finance Timelines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Communication Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CommunicationTimeline eventId={event.id} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" />
              Finance Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceTimeline eventId={event.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
