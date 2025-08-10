import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEventForms, EventForm } from '@/hooks/useEventForms';
import { useForms } from '@/hooks/useForms';
import { useFormFields } from '@/hooks/useFormFields';
import { toast } from 'sonner';

interface EventFormTabProps {
  eventId: string;
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ eventId }) => {
  const { eventForms, createEventForm, updateEventForm, deleteEventForm, isLoading } = useEventForms(eventId);
  const { forms } = useForms();
  const { formFields } = useFormFields();
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [formResponses, setFormResponses] = useState<Record<string, Record<string, any>>>({});

  // Load existing form responses - use useMemo to prevent infinite loops
  useEffect(() => {
    if (eventForms.length === 0) {
      setFormResponses({});
      return;
    }

    setFormResponses(prevResponses => {
      const responses: Record<string, Record<string, any>> = {};
      let hasChanges = false;
      
      eventForms.forEach(eventForm => {
        const currentResponses = eventForm.form_responses || {};
        responses[eventForm.id] = currentResponses;
        
        // Check if this event form's responses have changed
        if (!prevResponses[eventForm.id] || 
            JSON.stringify(prevResponses[eventForm.id]) !== JSON.stringify(currentResponses)) {
          hasChanges = true;
        }
      });
      
      // Only update if there are actual changes to prevent infinite loops
      return hasChanges ? responses : prevResponses;
    });
  }, [eventForms.length, eventForms.map(ef => ef.id + JSON.stringify(ef.form_responses)).join(',')]);

  const calculateFormTotal = (eventFormId: string, responses: Record<string, any>) => {
    let total = 0;
    const eventForm = eventForms.find(ef => ef.id === eventFormId);
    if (!eventForm?.forms?.sections) return total;

    // Iterate through form sections and fields to calculate pricing
    eventForm.forms.sections.forEach((section: any) => {
      section.field_ids?.forEach((fieldId: string) => {
        const field = formFields.find(f => f.id === fieldId);
        const response = responses[fieldId];
        
        if (!field || !response) return;

        if (field.has_pricing && field.default_price_gbp && response.enabled) {
          switch (field.pricing_type) {
            case 'fixed':
              total += parseFloat(field.default_price_gbp.toString());
              break;
            case 'per_person':
              const quantity = parseInt(response.quantity) || 1;
              total += parseFloat(field.default_price_gbp.toString()) * quantity;
              break;
            case 'variable':
              if (response.custom_price) {
                total += parseFloat(response.custom_price.toString());
              }
              break;
          }
        }
      });
    });

    return total;
  };

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
    
    // Calculate new total
    const newTotal = calculateFormTotal(eventFormId, newResponses[eventFormId]);
    
    // Debounced save
    setTimeout(() => {
      updateEventForm({
        id: eventFormId,
        form_responses: newResponses[eventFormId],
        form_total: newTotal
      });
    }, 500);
  };

  const handleAddForm = async () => {
    console.log('handleAddForm called with selectedFormId:', selectedFormId);
    
    if (!selectedFormId) {
      toast.error('Please select a form to add');
      return;
    }

    const selectedForm = forms.find(f => f.id === selectedFormId);
    console.log('selectedForm found:', selectedForm);
    
    if (!selectedForm) {
      toast.error('Selected form not found');
      return;
    }

    try {
      console.log('Calling createEventForm with data:', {
        event_id: eventId,
        form_id: selectedFormId,
        form_label: selectedForm.name,
        tab_order: eventForms.length + 1
      });
      
      await createEventForm({
        event_id: eventId,
        form_id: selectedFormId,
        form_label: selectedForm.name,
        tab_order: eventForms.length + 1
      });

      console.log('createEventForm completed successfully');
      setSelectedFormId('');
      toast.success('Form added to event successfully');
    } catch (error) {
      console.error('Error adding form to event:', error);
      toast.error('Failed to add form to event');
    }
  };

  const renderField = (eventForm: EventForm, field: any, response: any = {}) => {
    const fieldId = field.id;
    const eventFormId = eventForm.id;

    switch (field.field_type) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>{field.name}</Label>
            <Input
              id={fieldId}
              value={response.value || ''}
              onChange={(e) => handleResponseChange(eventFormId, fieldId, { value: e.target.value })}
              placeholder={field.placeholder_text || ''}
            />
            {field.help_text && (
              <p className="text-sm text-muted-foreground">{field.help_text}</p>
            )}
          </div>
        );

      case 'counter':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>{field.name}</Label>
            <Input
              id={fieldId}
              type="number"
              min="0"
              value={response.quantity || 0}
              onChange={(e) => handleResponseChange(eventFormId, fieldId, { 
                quantity: parseInt(e.target.value) || 0,
                enabled: parseInt(e.target.value) > 0
              })}
            />
            {field.has_pricing && field.default_price_gbp && (
              <p className="text-sm text-muted-foreground">
                £{field.default_price_gbp} {field.pricing_type === 'per_person' ? 'per person' : 'total'}
              </p>
            )}
          </div>
        );

      case 'price_fixed':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={fieldId}>{field.name}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">£{field.default_price_gbp}</span>
                <input
                  type="checkbox"
                  checked={response.enabled || false}
                  onChange={(e) => handleResponseChange(eventFormId, fieldId, { enabled: e.target.checked })}
                  className="rounded"
                />
              </div>
            </div>
            {field.help_text && (
              <p className="text-sm text-muted-foreground">{field.help_text}</p>
            )}
          </div>
        );

      case 'price_per_person':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>{field.name}</Label>
            <div className="flex items-center gap-2">
              <Input
                id={fieldId}
                type="number"
                min="0"
                value={response.quantity || 0}
                onChange={(e) => handleResponseChange(eventFormId, fieldId, { 
                  quantity: parseInt(e.target.value) || 0,
                  enabled: parseInt(e.target.value) > 0
                })}
                placeholder="Number of people"
              />
              <span className="text-sm text-muted-foreground">
                × £{field.default_price_gbp}
              </span>
            </div>
            {response.quantity > 0 && (
              <p className="text-sm font-medium">
                Total: £{(parseFloat(field.default_price_gbp.toString()) * (response.quantity || 0)).toFixed(2)}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>{field.name}</Label>
            <Textarea
              id={fieldId}
              value={response.value || ''}
              onChange={(e) => handleResponseChange(eventFormId, fieldId, { value: e.target.value })}
              placeholder={field.placeholder_text || ''}
              rows={3}
            />
          </div>
        );
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Loading forms...</div>;
  }

  const totalFormValue = eventForms.reduce((sum, form) => sum + (form.form_total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Add Form Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Form to Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a form to add" />
                </SelectTrigger>
                <SelectContent>
                  {forms.filter(form => 
                    !eventForms.some(ef => ef.form_id === form.id)
                  ).map(form => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddForm} disabled={!selectedFormId}>
              Add Form
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Forms Total Summary */}
      {eventForms.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Total Form Value</span>
              </div>
              <span className="text-2xl font-bold">£{totalFormValue.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Forms */}
      {eventForms.map((eventForm) => (
        <Card key={eventForm.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{eventForm.form_label}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">£{(eventForm.form_total || 0).toFixed(2)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteEventForm(eventForm.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {eventForm.forms?.sections?.map((section: any) => (
              <div key={section.id} className="space-y-4">
                <h4 className="font-medium text-lg border-b pb-2">{section.title}</h4>
                <div className="grid gap-4">
                  {section.field_ids?.map((fieldId: string) => {
                    const field = formFields.find(f => f.id === fieldId);
                    if (!field) return null;
                    
                    const response = formResponses[eventForm.id]?.[fieldId] || {};
                    return (
                      <div key={fieldId}>
                        {renderField(eventForm, field, response)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {eventForms.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No forms added to this event yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Add a form above to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};