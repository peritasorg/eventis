import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useEventForms, EventForm } from '@/hooks/useEventForms';
import { useForms } from '@/hooks/useForms';
import { useFormFields } from '@/hooks/useFormFields';
import { UnifiedFieldRenderer } from '@/components/form-builder/UnifiedFieldRenderer';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EventFormTabProps {
  eventId: string;
  eventFormId?: string; // Optional - if provided, shows single form, otherwise shows form manager
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ eventId, eventFormId }) => {
  const { eventForms, isLoading, createEventForm, updateEventForm, deleteEventForm, isCreating } = useEventForms(eventId);
  const { forms } = useForms();
  const { formFields } = useFormFields();
  const { currentTenant } = useAuth();
  
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [formResponses, setFormResponses] = useState<Record<string, Record<string, any>>>({});

  // Fetch time slots for form timing
  const { data: timeSlots } = useSupabaseQuery(
    ['event-time-slots', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_time_slots')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  );

  // Get available forms that aren't already added to this event
  const availableForms = forms.filter(form => 
    !eventForms.some(eventForm => eventForm.form_id === form.id)
  );

  // Filter to specific form if eventFormId is provided
  const displayForms = eventFormId 
    ? eventForms.filter(ef => ef.id === eventFormId)
    : eventForms;

  // Load form responses when eventForms change (with dependency check)
  useEffect(() => {
    const responses: Record<string, Record<string, any>> = {};
    eventForms.forEach(eventForm => {
      if (eventForm.form_responses && Object.keys(eventForm.form_responses).length > 0) {
        responses[eventForm.id] = eventForm.form_responses;
      }
    });
    
    // Only update if responses actually changed
    const responseKeys = Object.keys(responses).sort();
    const currentResponseKeys = Object.keys(formResponses).sort();
    
    if (responseKeys.join(',') !== currentResponseKeys.join(',') || 
        JSON.stringify(responses) !== JSON.stringify(formResponses)) {
      setFormResponses(responses);
    }
  }, [eventForms.map(ef => `${ef.id}-${JSON.stringify(ef.form_responses)}`).join(',')]);

  // Perfect form total calculation - handles all field types
  const calculateFormTotal = (eventForm: EventForm) => {
    let total = 0;
    const responses = formResponses[eventForm.id] || eventForm.form_responses || {};
    
    Object.entries(responses).forEach(([fieldId, response]) => {
      // Skip if toggle is disabled
      if (response.enabled === false) return;
      
      const price = response.price || 0;
      const quantity = response.quantity || 1;
      
      // All pricing fields contribute to total when enabled
      if (price > 0) {
        total += price; // Price already calculated with quantity in UnifiedFieldRenderer
      }
    });
    
    return total;
  };

  const totalEventValue = eventForms.reduce((sum, eventForm) => {
    return sum + calculateFormTotal(eventForm);
  }, 0);

  // Smart auto-save for form responses
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
    
    // Update local state immediately for responsive UI
    setFormResponses(newResponses);
    
    // Find the event form and calculate new total
    const eventForm = eventForms.find(ef => ef.id === eventFormId);
    if (eventForm) {
      const newTotal = calculateFormTotal({ ...eventForm, form_responses: newResponses[eventFormId] } as EventForm);
      
      // Smart debounced save based on field type
      const isToggleField = updates.hasOwnProperty('enabled');
      const isPriceField = updates.hasOwnProperty('price') || updates.hasOwnProperty('quantity');
      const isTextField = updates.hasOwnProperty('notes') && !isToggleField && !isPriceField;
      
      let delay = 500; // default
      if (isTextField) delay = 2000; // typing fields
      if (isPriceField) delay = 300; // shorter delay for better UX
      if (isToggleField) delay = 0; // immediate for toggles
      
      // Clear any existing timeout for this field
      const timeoutKey = `${eventFormId}-${fieldId}`;
      if (window[timeoutKey]) {
        clearTimeout(window[timeoutKey]);
      }
      
      // Set new timeout
      window[timeoutKey] = setTimeout(() => {
        updateEventForm({
          id: eventFormId,
          form_responses: newResponses[eventFormId],
          form_total: newTotal
        });
        delete window[timeoutKey];
      }, delay);
    }
  };

  // Add blur handler for immediate save on focus loss
  const handleFieldBlur = (eventFormId: string) => {
    const eventForm = eventForms.find(ef => ef.id === eventFormId);
    if (eventForm) {
      const currentTotal = calculateFormTotal({ ...eventForm, form_responses: formResponses[eventFormId] } as EventForm);
      updateEventForm({
        id: eventFormId,
        form_responses: formResponses[eventFormId],
        form_total: currentTotal
      });
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

  const renderField = (fieldId: string, eventForm: EventForm) => {
    const field = formFields.find(f => f.id === fieldId);
    if (!field) return null;

    const response = formResponses[eventForm.id]?.[fieldId] || {};

    return (
      <div key={fieldId} className="space-y-2">
        <div onBlur={() => handleFieldBlur(eventForm.id)}>
          <UnifiedFieldRenderer
            field={field}
            response={response}
            onChange={(id, updates) => handleResponseChange(eventForm.id, fieldId, updates)}
            showInCard={false}
          />
        </div>
      </div>
    );
  };

  const handleTimeSlotUpdate = async (eventFormId: string, timeSlotId: string) => {
    const selectedSlot = timeSlots?.find(slot => slot.id === timeSlotId);
    if (!selectedSlot) return;
    
    try {
      await supabase
        .from('event_forms')
        .update({ 
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time
        })
        .eq('id', eventFormId);
    } catch (error) {
      console.error('Error updating time:', error);
      toast.error('Failed to update time');
    }
  };

  const handleGuestUpdate = async (eventFormId: string, field: 'men_count' | 'ladies_count' | 'guest_price_total', value: number) => {
    try {
      // Use the proper mutation to update with automatic refresh
      await updateEventForm({
        id: eventFormId,
        [field]: value
      });
    } catch (error) {
      console.error('Error updating guest info:', error);
      toast.error('Failed to update guest information');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Loading forms...</div>;
  }

  // If showing single form, render just that form
  if (eventFormId) {
    const eventForm = displayForms[0];
    if (!eventForm) {
      return <div className="text-center text-muted-foreground py-8">Form not found</div>;
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Timing Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">Timing Information</h3>
              <div className="space-y-4">
                <div>
                  <Label>Quick Times</Label>
                  <Select onValueChange={(value) => handleTimeSlotUpdate(eventForm.id, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots?.map((slot) => (
                        <SelectItem key={slot.id} value={slot.id}>
                          {slot.label} ({slot.start_time} - {slot.end_time})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guest Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">Guest Information</h3>
              <div className="space-y-4">
                <div>
                  <Label>Men Count</Label>
                  <Input
                    type="number"
                    value={eventForm.men_count || 0}
                    onChange={(e) => handleGuestUpdate(eventForm.id, 'men_count', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Ladies Count</Label>
                  <Input
                    type="number"
                    value={eventForm.ladies_count || 0}
                    onChange={(e) => handleGuestUpdate(eventForm.id, 'ladies_count', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Finance Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">Finance Information</h3>
              <div className="space-y-4">
                <div>
                  <Label>Guest Total Price (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={eventForm.guest_price_total || 0}
                    onChange={(e) => handleGuestUpdate(eventForm.id, 'guest_price_total', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Form Total (£)</Label>
                  <div className="text-lg font-semibold">
                    £{(eventForm.form_total || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{eventForm.form_label}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Form Total: £{(eventForm.form_total || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {eventForm.forms?.sections && eventForm.forms.sections.length > 0 ? (
              <div className="space-y-6">
                {eventForm.forms.sections.map((section: any, sectionIndex: number) => (
                  <div key={section.id || sectionIndex} className="space-y-4">
                    <h4 className="font-medium text-lg border-b pb-2 text-foreground">
                      {section.title}
                    </h4>
                     <div className="space-y-4">
                       {section.field_ids && section.field_ids.length > 0 ? (
                         section.field_ids.map((fieldId: string) => renderField(fieldId, eventForm))
                       ) : (
                         <p className="text-sm text-muted-foreground">
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
      </div>
    );
  }

  // Show form management interface if no specific form ID
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
              disabled={!selectedFormId || isCreating || availableForms.length === 0 || eventForms.length >= 2}
            >
              {isCreating ? 'Adding...' : 'Add Form'}
            </Button>
          </div>
          
          {eventForms.length >= 2 && (
            <p className="text-sm text-muted-foreground mt-2">
              Maximum of 2 forms reached for this event.
            </p>
          )}
          
          {availableForms.length === 0 && eventForms.length > 0 && eventForms.length < 2 && (
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
              <div className="text-2xl font-bold text-primary">
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
                    <h4 className="font-medium text-lg border-b pb-2 text-foreground">
                      {section.title}
                    </h4>
                     <div className="space-y-4">
                       {section.field_ids && section.field_ids.length > 0 ? (
                         section.field_ids.map((fieldId: string) => renderField(fieldId, eventForm))
                       ) : (
                         <p className="text-sm text-muted-foreground">
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