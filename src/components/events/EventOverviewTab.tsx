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
import { EventBusinessFlow } from '@/components/events/EventBusinessFlow';
import { InlineInput } from './InlineInput';
import { InlineSelect } from './InlineSelect';
import { InlineDate } from './InlineDate';
import { InlineNumber } from './InlineNumber';
import { InlineTextarea } from './InlineTextarea';
import { useSupabaseMutation, useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { formatCurrency } from '@/lib/utils';

interface EventOverviewTabProps {
  event: any;
}

export const EventOverviewTab: React.FC<EventOverviewTabProps> = ({ event }) => {
  const { currentTenant } = useAuth();
  const { data: eventTypeConfigs } = useEventTypeConfigs();

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
      invalidateQueries: [['event', event.id]]
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
  
  // Calculate total paid: Deposit + Finance Timeline Payments
  const financeTimelinePayments = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
  const totalPaid = depositAmount + financeTimelinePayments;
  
  // Calculate balance due: Total Event Price - Total Paid
  const balanceDue = totalEventPrice - totalPaid;

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
                <InlineInput
                  value={event.event_name}
                  onSave={(value) => updateEventMutation.mutate({ event_name: value })}
                  placeholder="Event name"
                  className="text-sm font-medium"
                />
              </div>
              
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Event Type</Label>
                <InlineSelect
                  value={event.event_type || ''}
                  options={[
                    ...(eventTypeConfigs?.map(config => ({
                      value: config.event_type,
                      label: config.display_name
                    })) || []),
                    { value: 'other', label: 'Other' }
                  ]}
                  onSave={(value) => updateEventMutation.mutate({ event_type: value })}
                  placeholder="Select event type"
                  className="text-sm capitalize"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Event Date(s)</Label>
                <div>
                  <InlineDate
                    value={event.event_start_date}
                    onSave={(value) => updateEventMutation.mutate({ event_start_date: value })}
                    className="text-sm font-medium"
                  />
                  {event.event_multiple_days && event.event_end_date && event.event_end_date !== event.event_start_date && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Until: <InlineDate
                        value={event.event_end_date}
                        onSave={(value) => updateEventMutation.mutate({ event_end_date: value })}
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
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
              <CardTitle className="flex items-center gap-2 text-base">
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Customer</Label>
                <InlineSelect
                  value={event.customer_id || 'none'}
                  options={[
                    { value: 'none', label: 'No customer assigned' },
                    ...(customers?.map(customer => ({
                      value: customer.id,
                      label: `${customer.name}${customer.company ? ` - ${customer.company}` : ''}`
                    })) || [])
                  ]}
                  onSave={(value) => updateEventMutation.mutate({ customer_id: value === 'none' ? null : value })}
                  placeholder="Select a customer..."
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Ethnicity</Label>
                <InlineInput
                  value={event.ethnicity || ''}
                  onSave={(value) => updateEventMutation.mutate({ ethnicity: value })}
                  placeholder="e.g., Somali, Pakistani, etc."
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Primary Contact</Label>
                  <InlineInput
                    value={event.primary_contact_name || ''}
                    onSave={(value) => updateEventMutation.mutate({ primary_contact_name: value })}
                    placeholder="Contact name"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                  <InlineInput
                    value={event.primary_contact_phone || ''}
                    onSave={(value) => updateEventMutation.mutate({ primary_contact_phone: value })}
                    placeholder="Phone number"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Secondary Contact</Label>
                  <InlineInput
                    value={event.secondary_contact_name || ''}
                    onSave={(value) => updateEventMutation.mutate({ secondary_contact_name: value })}
                    placeholder="Contact name"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                  <InlineInput
                    value={event.secondary_contact_phone || ''}
                    onSave={(value) => updateEventMutation.mutate({ secondary_contact_phone: value })}
                    placeholder="Phone number"
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Relationship to Main Contact</Label>
                <InlineInput
                  value={event.secondary_contact_relationship || ''}
                  onSave={(value) => updateEventMutation.mutate({ secondary_contact_relationship: value })}
                  placeholder="e.g., Spouse, Parent, etc."
                  className="text-sm"
                />
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
              {event.event_type === 'all_day' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-700 font-medium">All Day Event</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Guest information is managed individually in each form tab. Each form represents a separate session with its own guest details.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Men Count</Label>
                      <InlineNumber
                        value={event.men_count || 0}
                        onSave={(value) => updateEventMutation.mutate({ men_count: value })}
                        min={0}
                        className="text-lg font-medium"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Ladies Count</Label>
                      <InlineNumber
                        value={event.ladies_count || 0}
                        onSave={(value) => updateEventMutation.mutate({ ladies_count: value })}
                        min={0}
                        className="text-lg font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Event Mix Type</Label>
                    <InlineSelect
                      value={event.event_mix_type || 'mixed'}
                      options={[
                        { value: 'mixed', label: 'Mixed' },
                        { value: 'men_only', label: 'Men Only' },
                        { value: 'ladies_only', label: 'Ladies Only' },
                        { value: 'separate_sections', label: 'Separate Sections' }
                      ]}
                      onSave={(value) => updateEventMutation.mutate({ event_mix_type: value })}
                      className="text-sm capitalize"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Total Guest Count</Label>
                    <InlineNumber
                      value={event.total_guests || (event.men_count || 0) + (event.ladies_count || 0)}
                      onSave={(value) => updateEventMutation.mutate({ total_guests: value })}
                      min={0}
                      className="text-lg font-medium"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Total Guest Price</Label>
                    <InlineNumber
                      value={event.total_guest_price || 0}
                      onSave={(value) => updateEventMutation.mutate({ total_guest_price: value })}
                      step={0.01}
                      min={0}
                      className="text-lg font-medium"
                    />
                  </div>
                </>
              )}

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Deposit Amount</Label>
                <InlineNumber
                  value={event.deposit_amount || 0}
                  onSave={(value) => updateEventMutation.mutate({ deposit_amount: value })}
                  step={0.01}
                  min={0}
                  className="text-lg font-medium"
                />
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
                <div className="text-lg font-bold text-blue-900">
                  £{formatCurrency(totalGuestPrice)}
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded-md">
                <Label className="text-xs text-green-700">Form Total</Label>
                <div className="text-lg font-bold text-green-900">
                  £{formatCurrency(formTotal)}
                </div>
              </div>
              
              <div className="p-3 bg-purple-50 rounded-md">
                <Label className="text-xs text-purple-700">Total Event Price</Label>
                <div className="text-lg font-bold text-purple-900">
                  £{formatCurrency(totalEventPrice)}
                </div>
              </div>
              
              <div className="p-3 bg-orange-50 rounded-md">
                <Label className="text-xs text-orange-700">Deposit</Label>
                <div className="text-lg font-bold text-orange-900">
                  £{formatCurrency(depositAmount)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-100 rounded-md">
                <Label className="text-xs text-green-700">Total Paid</Label>
                <div className="text-lg font-bold text-green-900">
                  £{formatCurrency(totalPaid)}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Deposit (£{formatCurrency(depositAmount)}) + Finance Timeline (£{formatCurrency(financeTimelinePayments)})
                </div>
              </div>
              
              <div className={`p-3 rounded-md ${balanceDue > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <Label className={`text-xs ${balanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  Balance Due
                </Label>
                <div className={`text-lg font-bold ${balanceDue > 0 ? 'text-red-900' : 'text-green-900'}`}>
                  £{formatCurrency(balanceDue)}
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
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <h3 className="text-base font-medium">Communication Timeline</h3>
          </div>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <CommunicationTimeline eventId={event.id} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <h3 className="text-base font-medium">Finance Timeline</h3>
          </div>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <FinanceTimeline eventId={event.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
