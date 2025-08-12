import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEventForms, EventForm } from '@/hooks/useEventForms';
import { useForms } from '@/hooks/useForms';
import { useFormFields } from '@/hooks/useFormFields';
import { UnifiedFieldRenderer } from '@/components/form-builder/UnifiedFieldRenderer';
import { toast } from 'sonner';

interface EventFormTabProps {
  eventId: string;
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ eventId }) => {
  const { eventForms, isLoading, createEventForm, updateEventForm, deleteEventForm, isCreating } = useEventForms(eventId);
  const { forms } = useForms();
  const { formFields } = useFormFields();
  
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [formResponses, setFormResponses] = useState<Record<string, Record<string, any>>>({});

  // Get available forms that aren't already added to this event
  const availableForms = forms.filter(form => 
    !eventForms.some(eventForm => eventForm.form_id === form.id)
  );

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

  const calculateFormTotal = (eventForm: EventForm) => {
    let total = 0;
    const responses = formResponses[eventForm.id] || {};
    
    if (eventForm.forms?.sections) {
      eventForm.forms.sections.forEach((section: any) => {
        if (section.field_ids) {
          section.field_ids.forEach((fieldId: string) => {
            const field = formFields.find(f => f.id === fieldId);
            const response = responses[fieldId];
            
            if (field && response) {
              switch (field.field_type) {
                case 'fixed_price_notes':
                  total += response.price || 0;
                  break;
                case 'per_person_price_notes':
                  total += (response.quantity || 0) * (response.price || 0);
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
      
      // Debounced save with increased delay to prevent typing glitches
      setTimeout(() => {
        updateEventForm({
          id: eventFormId,
          form_responses: newResponses[eventFormId],
          form_total: newTotal
        });
      }, 1500);
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
        <UnifiedFieldRenderer
          field={field}
          response={response}
          onChange={(id, updates) => handleResponseChange(eventForm.id, fieldId, updates)}
          showInCard={false}
        />
      </div>
    );
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
                    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                      {section.field_ids && section.field_ids.length > 0 ? (
                        section.field_ids.map((fieldId: string) => renderField(fieldId, eventForm))
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