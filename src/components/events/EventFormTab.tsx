import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEventForms, EventForm } from '@/hooks/useEventForms';
import { useForms } from '@/hooks/useForms';
import { toast } from 'sonner';

interface EventFormTabProps {
  eventId: string;
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ eventId }) => {
  const { eventForms, isLoading, createEventForm, updateEventForm, deleteEventForm, isCreating } = useEventForms(eventId);
  const { forms } = useForms();
  
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [formResponses, setFormResponses] = useState<Record<string, Record<string, any>>>({});

  // Get available forms that aren't already added to this event
  const availableForms = forms.filter(form => 
    !eventForms.some(eventForm => eventForm.form_id === form.id)
  );

  // Load form responses when eventForms change
  useEffect(() => {
    const responses: Record<string, Record<string, any>> = {};
    eventForms.forEach(eventForm => {
      if (eventForm.form_responses) {
        responses[eventForm.id] = eventForm.form_responses;
      }
    });
    setFormResponses(responses);
  }, [eventForms]);

  const calculateFormTotal = (eventForm: EventForm) => {
    let total = 0;
    const responses = formResponses[eventForm.id] || {};
    
    if (eventForm.forms?.sections) {
      eventForm.forms.sections.forEach((section: any) => {
        if (section.fields) {
          section.fields.forEach((field: any) => {
            const response = responses[field.id];
            if (response?.enabled && field.has_pricing && field.default_price_gbp) {
              switch (field.pricing_type) {
                case 'fixed':
                  total += parseFloat(field.default_price_gbp.toString());
                  break;
                case 'per_person':
                  const quantity = parseInt(response.quantity) || parseInt(response.guests) || 1;
                  total += parseFloat(field.default_price_gbp.toString()) * quantity;
                  break;
                case 'variable':
                  if (response.price) {
                    total += parseFloat(response.price.toString());
                  }
                  break;
              }
            }
          });
        }
      });
    }
    
    return total;
  };

  const totalEventValue = eventForms.reduce((sum, eventForm) => {
    return sum + calculateFormTotal(eventForm);
  }, 0);

  const handleResponseChange = (eventFormId: string, fieldId: string, updates: any) => {
    const newResponses = {
      ...formResponses,
      [eventFormId]: {
        ...formResponses[eventFormId],
        [fieldId]: {
          ...formResponses[eventFormId]?.[fieldId],
          ...updates
        }
      }
    };
    
    setFormResponses(newResponses);
    
    // Find the event form and calculate new total
    const eventForm = eventForms.find(ef => ef.id === eventFormId);
    if (eventForm) {
      const newTotal = calculateFormTotal({ ...eventForm, form_responses: newResponses[eventFormId] } as EventForm);
      
      // Debounced save
      setTimeout(() => {
        updateEventForm({
          id: eventFormId,
          form_responses: newResponses[eventFormId],
          form_total: newTotal
        });
      }, 500);
    }
  };

  const handleAddForm = async () => {
    if (!selectedFormId) {
      toast.error('Please select a form to add');
      return;
    }

    const selectedForm = availableForms.find(f => f.id === selectedFormId);
    if (!selectedForm) {
      toast.error('Selected form not found');
      return;
    }

    try {
      await createEventForm({
        event_id: eventId,
        form_id: selectedFormId,
        form_label: selectedForm.name,
        tab_order: eventForms.length + 1
      });

      setSelectedFormId('');
    } catch (error: any) {
      console.error('Error adding form to event:', error);
      toast.error(error.message || 'Failed to add form to event');
    }
  };

  const renderField = (field: any, eventForm: EventForm) => {
    const fieldResponse = formResponses[eventForm.id]?.[field.id] || {};
    const isEnabled = fieldResponse.enabled !== false; // Default to enabled

    switch (field.field_type) {
      case 'text':
      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id}>{field.name}</Label>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => 
                  handleResponseChange(eventForm.id, field.id, { ...fieldResponse, enabled: checked })
                }
              />
            </div>
            {isEnabled && (
              field.field_type === 'textarea' ? (
                <Textarea
                  id={field.id}
                  placeholder={field.placeholder_text || `Enter ${field.name.toLowerCase()}`}
                  value={fieldResponse.value || ''}
                  onChange={(e) => 
                    handleResponseChange(eventForm.id, field.id, { ...fieldResponse, value: e.target.value })
                  }
                />
              ) : (
                <Input
                  id={field.id}
                  placeholder={field.placeholder_text || `Enter ${field.name.toLowerCase()}`}
                  value={fieldResponse.value || ''}
                  onChange={(e) => 
                    handleResponseChange(eventForm.id, field.id, { ...fieldResponse, value: e.target.value })
                  }
                />
              )
            )}
          </div>
        );

      case 'counter':
        const quantity = parseInt(fieldResponse.quantity) || 0;
        const unitPrice = parseFloat(field.default_price_gbp) || 0;
        const lineTotal = quantity * unitPrice;

        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id}>{field.name}</Label>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => 
                  handleResponseChange(eventForm.id, field.id, { ...fieldResponse, enabled: checked })
                }
              />
            </div>
            {isEnabled && (
              <div className="space-y-2">
                <div className="flex items-center space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newQuantity = Math.max(0, quantity - 1);
                      const newTotal = newQuantity * unitPrice;
                      handleResponseChange(eventForm.id, field.id, {
                        ...fieldResponse,
                        quantity: newQuantity,
                        price: newTotal
                      });
                    }}
                  >
                    -
                  </Button>
                  <span className="w-12 text-center font-mono">{quantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newQuantity = quantity + 1;
                      const newTotal = newQuantity * unitPrice;
                      handleResponseChange(eventForm.id, field.id, {
                        ...fieldResponse,
                        quantity: newQuantity,
                        price: newTotal
                      });
                    }}
                  >
                    +
                  </Button>
                </div>
                {field.has_pricing && (
                  <div className="text-sm text-muted-foreground">
                    £{unitPrice.toFixed(2)} × {quantity} = £{lineTotal.toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'price_fixed':
        const fixedPrice = parseFloat(field.default_price_gbp) || 0;
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id}>{field.name}</Label>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => {
                  const price = checked ? fixedPrice : 0;
                  handleResponseChange(eventForm.id, field.id, { 
                    ...fieldResponse, 
                    enabled: checked, 
                    price: price 
                  });
                }}
              />
            </div>
            {isEnabled && (
              <div className="text-sm font-medium text-green-600">
                £{fixedPrice.toFixed(2)}
              </div>
            )}
          </div>
        );

      case 'price_per_person':
        const guestCount = parseInt(fieldResponse.guests) || 0;
        const perPersonPrice = parseFloat(field.default_price_gbp) || 0;
        const totalPerPersonPrice = guestCount * perPersonPrice;

        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id}>{field.name}</Label>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => 
                  handleResponseChange(eventForm.id, field.id, { ...fieldResponse, enabled: checked })
                }
              />
            </div>
            {isEnabled && (
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Number of guests"
                  value={fieldResponse.guests || ''}
                  onChange={(e) => {
                    const guests = parseInt(e.target.value) || 0;
                    const total = guests * perPersonPrice;
                    handleResponseChange(eventForm.id, field.id, {
                      ...fieldResponse,
                      guests: guests,
                      price: total
                    });
                  }}
                />
                <div className="text-sm text-muted-foreground">
                  £{perPersonPrice.toFixed(2)} × {guestCount} = £{totalPerPersonPrice.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.name}</Label>
            <Input
              id={field.id}
              placeholder={`Enter ${field.name.toLowerCase()}`}
              value={fieldResponse.value || ''}
              onChange={(e) => 
                handleResponseChange(eventForm.id, field.id, { ...fieldResponse, value: e.target.value })
              }
            />
          </div>
        );
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Loading forms...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Add Form to Event</h3>
          </div>
          
          <div className="flex gap-4">
            <Select
              value={selectedFormId}
              onValueChange={setSelectedFormId}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={
                  availableForms.length > 0 
                    ? "Select a form to add" 
                    : "No forms available to add"
                } />
              </SelectTrigger>
              <SelectContent>
                {availableForms.map((form) => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleAddForm}
              disabled={!selectedFormId || isCreating || availableForms.length === 0}
            >
              {isCreating ? 'Adding...' : 'Add Form'}
            </Button>
          </div>
          
          {availableForms.length === 0 && eventForms.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              All available forms have been added to this event.
            </p>
          )}
        </CardContent>
      </Card>

      {eventForms.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Total Event Value</h3>
              <div className="text-2xl font-bold text-green-600">
                £{totalEventValue.toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {eventForms.map((eventForm) => (
        <Card key={eventForm.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{eventForm.form_label}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Form Total: £{(eventForm.form_total || 0).toFixed(2)}
                </p>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => deleteEventForm(eventForm.id)}
              >
                Remove
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {eventForm.forms?.sections && eventForm.forms.sections.length > 0 ? (
              <div className="space-y-6">
                {eventForm.forms.sections.map((section: any, sectionIndex: number) => (
                  <div key={section.id || sectionIndex} className="space-y-4">
                    <h4 className="font-medium text-lg border-b pb-2">{section.title}</h4>
                    <div className="grid gap-6 md:grid-cols-2">
                      {section.fields && section.fields.length > 0 ? (
                        section.fields.map((field: any) => renderField(field, eventForm))
                      ) : (
                        <p className="text-sm text-muted-foreground col-span-full">
                          No fields configured for this section.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No sections configured for this form.</p>
            )}
          </CardContent>
        </Card>
      ))}

      {eventForms.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No forms added to this event yet.</p>
            <p className="text-sm text-muted-foreground">Add a form above to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};