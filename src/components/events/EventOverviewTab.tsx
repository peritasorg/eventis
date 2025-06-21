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
    <div className="space-y-6">
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Event Title</Label>
                <div className="text-lg font-medium break-words">{event.event_name}</div>
              </div>
              
              <div>
                <Label>Event Type</Label>
                <div className="text-sm capitalize">{event.event_type || 'Not specified'}</div>
              </div>

              <div className="space-y-2">
                <Label>Event Date(s)</Label>
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
                    <div className="text-lg font-medium">
                      {new Date(event.event_start_date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    {event.event_multiple_days && event.event_end_date && event.event_end_date !== event.event_start_date && (
                      <div className="text-sm text-gray-600 mt-1">
                        Until: {new Date(event.event_end_date).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label>Event Time</Label>
                <div className="text-sm">
                  {event.start_time && event.end_time ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{event.start_time} - {event.end_time}</span>
                    </div>
                  ) : (
                    'Time not specified'
                  )}
                </div>
              </div>

              <div>
                <Label>Countdown</Label>
                <div className={`text-sm font-medium ${
                  daysDue < 0 ? 'text-red-600' : daysDue < 7 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {daysDue < 0 ? `${Math.abs(daysDue)} days overdue` : 
                   daysDue === 0 ? 'Today' : 
                   `${daysDue} days until event`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Basic Information
                {!isEditing ? (
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      size="sm"
                      disabled={updateEventMutation.isPending}
                    >
                      Save
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer_id">Customer</Label>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Total Event Price</Label>
                <div className="text-lg font-medium text-blue-600">£{totalEventPrice.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Guest Price + Form Total</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Guest Price</Label>
                  <div className="text-sm font-medium">£{totalGuestPrice.toLocaleString()}</div>
                </div>
                <div>
                  <Label>Form Total</Label>
                  <div className="text-sm font-medium">£{formTotal.toLocaleString()}</div>
                </div>
              </div>

              <div>
                <Label htmlFor="deposit_amount">Deposit Amount</Label>
                {isEditing ? (
                  <Input
                    id="deposit_amount"
                    name="deposit_amount"
                    type="number"
                    step="0.01"
                    defaultValue={event.deposit_amount || 0}
                  />
                ) : (
                  <div className="text-lg font-medium">£{depositAmount.toLocaleString()}</div>
                )}
              </div>

              <div>
                <Label>Total Paid</Label>
                <div className="text-lg font-medium text-green-600">£{(depositAmount + totalPaid).toLocaleString()}</div>
                <div className="text-xs text-gray-500">Deposit + Finance Timeline Payments</div>
              </div>

              <div>
                <Label>Balance Due</Label>
                <div className={`text-lg font-medium ${
                  balanceDue > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  £{balanceDue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {balanceDue <= 0 ? 'Fully paid' : 'Amount remaining to be paid'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Communication Timeline */}
      <CommunicationTimeline eventId={event.id} />

      {/* Finance Timeline */}
      <FinanceTimeline eventId={event.id} />
    </div>
  );
};
