import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface FormField {
  id: string;
  name: string;
  field_type: 'text' | 'price_fixed' | 'price_per_person' | 'counter';
  has_notes: boolean;
  has_pricing: boolean;
  pricing_type?: 'fixed' | 'per_person';
  default_price_gbp?: number;
  placeholder_text?: string;
}

interface Form {
  id: string;
  name: string;
  sections: Array<{
    id: string;
    title: string;
    order: number;
    field_ids: string[];
  }>;
}

interface FormResponse {
  field_id: string;
  value?: string;
  quantity?: number;
  unit_price_gbp?: number;
  total_amount_gbp?: number;
  notes?: string;
}

export const NewEventForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentTenant } = useAuth();
  const preselectedCustomerId = searchParams.get('customer');
  
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    venue_location: '',
    customer_id: preselectedCustomerId || '',
    form_id: '',
    status: 'draft' as const
  });

  const [formResponses, setFormResponses] = useState<Record<string, FormResponse>>({});
  const [totalAmount, setTotalAmount] = useState(0);

  // Fetch customers
  const { data: customers = [] } = useSupabaseQuery(
    ['new-customers', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('new_customers')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', currentTenant.id)
        .order('last_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  );

  // Fetch forms
  const { data: forms = [] } = useSupabaseQuery(
    ['new-forms', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('new_forms')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  );

  // Fetch form fields
  const { data: formFields = [] } = useSupabaseQuery(
    ['new-form-fields', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('new_form_fields')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    }
  );

  const selectedForm = forms.find(f => f.id === eventData.form_id);

  // Calculate total when form responses change
  useEffect(() => {
    const total = Object.values(formResponses).reduce((sum, response) => {
      return sum + (response.total_amount_gbp || 0);
    }, 0);
    setTotalAmount(total);
  }, [formResponses]);

  // Create event mutation
  const createEventMutation = useSupabaseMutation(
    async () => {
      const { data: event, error: eventError } = await supabase
        .from('new_events')
        .insert({
          ...eventData,
          tenant_id: currentTenant?.id,
          total_amount_gbp: totalAmount
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create form responses
      const responsePromises = Object.entries(formResponses).map(([fieldId, response]) => {
        const field = formFields.find(f => f.id === fieldId);
        if (!field) return null;

        return supabase
          .from('new_form_responses')
          .insert({
            event_id: event.id,
            field_id: fieldId,
            field_name: field.name,
            field_type: field.field_type,
            ...response
          });
      }).filter(Boolean);

      await Promise.all(responsePromises);
      return event;
    },
    {
      onSuccess: (event) => {
        toast.success('Event created successfully');
        navigate(`/events/${event.id}`);
      },
      onError: (error) => {
        toast.error('Failed to create event: ' + error.message);
      }
    }
  );

  const updateFormResponse = (fieldId: string, updates: Partial<FormResponse>) => {
    const field = formFields.find(f => f.id === fieldId);
    if (!field) return;

    const currentResponse = formResponses[fieldId] || { field_id: fieldId };
    const updatedResponse = { ...currentResponse, ...updates };

    // Calculate total for pricing fields
    if (field.has_pricing) {
      const quantity = updatedResponse.quantity || 1;
      const unitPrice = updatedResponse.unit_price_gbp || field.default_price_gbp || 0;
      
      if (field.pricing_type === 'per_person') {
        updatedResponse.total_amount_gbp = quantity * unitPrice;
      } else {
        updatedResponse.total_amount_gbp = unitPrice;
      }
    }

    setFormResponses(prev => ({
      ...prev,
      [fieldId]: updatedResponse
    }));
  };

  const renderFormField = (field: FormField) => {
    const response = formResponses[field.id] || {};

    return (
      <div key={field.id} className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium">{field.name}</h4>
            {field.placeholder_text && (
              <p className="text-sm text-muted-foreground">{field.placeholder_text}</p>
            )}
          </div>
          {field.has_pricing && (
            <div className="text-right">
              <p className="font-semibold">
                £{(response.total_amount_gbp || 0).toFixed(2)}
              </p>
              {field.pricing_type === 'per_person' && (
                <p className="text-sm text-muted-foreground">
                  £{field.default_price_gbp || 0} per person
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field.field_type === 'counter' ? (
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                value={response.quantity || ''}
                onChange={(e) => updateFormResponse(field.id, {
                  quantity: parseInt(e.target.value) || 0
                })}
                placeholder="0"
                min="0"
              />
            </div>
          ) : field.field_type === 'text' ? (
            <div>
              <label className="text-sm font-medium">Value</label>
              <Input
                value={response.value || ''}
                onChange={(e) => updateFormResponse(field.id, {
                  value: e.target.value
                })}
                placeholder={field.placeholder_text}
              />
            </div>
          ) : null}

          {field.has_pricing && (
            <div>
              <label className="text-sm font-medium">Price (£)</label>
              <Input
                type="number"
                step="0.01"
                value={response.unit_price_gbp || field.default_price_gbp || ''}
                onChange={(e) => updateFormResponse(field.id, {
                  unit_price_gbp: parseFloat(e.target.value) || 0
                })}
                placeholder="0.00"
                min="0"
              />
            </div>
          )}
        </div>

        {field.has_notes && (
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={response.notes || ''}
              onChange={(e) => updateFormResponse(field.id, {
                notes: e.target.value
              })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Create New Event</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/events')}>
              Cancel
            </Button>
            <Button 
              onClick={() => createEventMutation.mutate()}
              disabled={!eventData.title || !eventData.customer_id || createEventMutation.isPending}
            >
              {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Event Title *</label>
                <Input
                  value={eventData.title}
                  onChange={(e) => setEventData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Smith Wedding Reception"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Customer *</label>
                <Select
                  value={eventData.customer_id}
                  onValueChange={(value) => setEventData(prev => ({ ...prev, customer_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name}
                        {customer.email && ` (${customer.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Event Date</label>
                <Input
                  type="date"
                  value={eventData.event_date}
                  onChange={(e) => setEventData(prev => ({ ...prev, event_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Venue Location</label>
                <Input
                  value={eventData.venue_location}
                  onChange={(e) => setEventData(prev => ({ ...prev, venue_location: e.target.value }))}
                  placeholder="e.g., Main Hall"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={eventData.start_time}
                  onChange={(e) => setEventData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="time"
                  value={eventData.end_time}
                  onChange={(e) => setEventData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={eventData.description}
                onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description..."
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Form Template</label>
              <Select
                value={eventData.form_id}
                onValueChange={(value) => setEventData(prev => ({ ...prev, form_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select form template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Form Section */}
        {selectedForm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedForm.name}</CardTitle>
                <div className="text-right">
                  <p className="text-2xl font-bold">£{totalAmount.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedForm.sections.map((section) => (
                <div key={section.id}>
                  <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
                  <div className="space-y-4">
                    {section.field_ids.map((fieldId) => {
                      const field = formFields.find(f => f.id === fieldId);
                      return field ? renderFormField(field) : null;
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};