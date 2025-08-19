import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PriceInput } from '@/components/ui/price-input';
import { useEventForms, EventForm } from '@/hooks/useEventForms';
import { useForms } from '@/hooks/useForms';
import { useFormFields } from '@/hooks/useFormFields';
import { OptimizedFieldRenderer } from '@/components/form-builder/OptimizedFieldRenderer';
import { FormSaveButton } from './FormSaveButton';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface EventFormTabProps {
  eventId: string;
  eventFormId?: string; // Optional - if provided, shows single form, otherwise shows form manager
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ eventId, eventFormId }) => {
  const { eventForms, isLoading, createEventForm, updateEventForm, deleteEventForm, isCreating } = useEventForms(eventId);
  const { forms } = useForms();
  const { formFields } = useFormFields();
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [formResponses, setFormResponses] = useState<Record<string, Record<string, any>>>({});
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, string>>({});
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  
  // Local state for guest fields to ensure immediate UI updates
  const [localGuestData, setLocalGuestData] = useState<Record<string, {
    men_count: number;
    ladies_count: number;
    guest_price_total: number;
  }>>({});

  // Fetch event type-specific time slots
  const { data: eventTypeConfigs } = useSupabaseQuery(
    ['event-type-configs'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_type_configs')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    }
  );

  // Fetch event type form mappings
  const { data: eventTypeFormMappings } = useSupabaseQuery(
    ['event-type-form-mappings'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_type_form_mappings')
        .select(`
          *,
          event_type_configs!inner(
            event_type,
            available_time_slots
          )
        `)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
      return data || [];
    }
  );

  // Fetch fallback global time slots
  const { data: globalTimeSlots } = useSupabaseQuery(
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

  // Get event details to determine event type
  const { data: eventDetails } = useSupabaseQuery(
    ['event', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('events')
        .select('event_type, guest_mixture')
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error) throw error;
      return data;
    }
  );

  const handleGuestMixUpdate = async (value: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ guest_mixture: value })
        .eq('id', eventId);

      if (error) throw error;
      
      // Invalidate event query to refresh data
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    } catch (error) {
      console.error('Error updating guest mix:', error);
      toast.error('Failed to update guest mix');
    }
  };

  // Get time slots for a specific event form based on its associated event type
  const getTimeSlotsForForm = (eventForm: EventForm) => {
    // Find the event type form mapping for this specific form
    const formMapping = eventTypeFormMappings?.find(mapping => 
      mapping.form_id === eventForm.form_id
    );
    
    if (formMapping?.event_type_configs?.available_time_slots?.length > 0) {
      return formMapping.event_type_configs.available_time_slots;
    }

    // Fallback: For single event type events, use the event's type
    if (eventDetails?.event_type) {
      const eventTypeConfig = eventTypeConfigs?.find(config => 
        config.event_type === eventDetails.event_type
      );
      
      if (eventTypeConfig?.available_time_slots?.length > 0) {
        return eventTypeConfig.available_time_slots;
      }
    }

    // Final fallback to global time slots
    return globalTimeSlots?.map(slot => ({
      id: slot.id,
      label: slot.label,
      start_time: slot.start_time,
      end_time: slot.end_time
    })) || [];
  };

  // Get available forms that aren't already added to this event
  const availableForms = forms.filter(form => 
    !eventForms.some(eventForm => eventForm.form_id === form.id)
  );

  // Filter to specific form if eventFormId is provided
  const displayForms = eventFormId 
    ? eventForms.filter(ef => ef.id === eventFormId)
    : eventForms;

  // CRITICAL FIX: Load form responses when eventForms change - always prioritize database data
  useEffect(() => {
    const responses: Record<string, Record<string, any>> = {};
    
    eventForms.forEach(eventForm => {
      console.log('Loading form responses for:', eventForm.form_label, eventForm.form_responses);
      // Load ALL responses, even empty ones to ensure proper field initialization
      responses[eventForm.id] = eventForm.form_responses || {};
    });
    
    console.log('All loaded form responses (including empty):', responses);
    
    // CRITICAL: Always update state with database responses - this ensures sync
    setFormResponses(responses);
    
    // Only initialize guest data for NEW forms that don't exist in local state
    setLocalGuestData(prev => {
      const updatedGuestData = { ...prev };
      
      eventForms.forEach(eventForm => {
        // Only set if this form doesn't exist in local state yet
        if (!prev[eventForm.id]) {
          updatedGuestData[eventForm.id] = {
            men_count: eventForm.men_count || 0,
            ladies_count: eventForm.ladies_count || 0,
            guest_price_total: eventForm.guest_price_total || 0
          };
        }
      });
      
      return updatedGuestData;
    });

    // Initialize selected time slots
    setSelectedTimeSlots(prev => {
      const updatedTimeSlots = { ...prev };
      
      eventForms.forEach(eventForm => {
        if (!prev[eventForm.id] && eventForm.start_time && eventForm.end_time) {
          const timeSlots = getTimeSlotsForForm(eventForm);
          const matchingSlot = timeSlots?.find(slot => 
            slot.start_time === eventForm.start_time && slot.end_time === eventForm.end_time
          );
          if (matchingSlot) {
            updatedTimeSlots[eventForm.id] = matchingSlot.id;
          }
        }
      });
      
      return updatedTimeSlots;
    });
  }, [eventForms.length, eventForms.map(ef => ef.id).join(',')]);

  // FIXED: Perfect form total calculation with proper state selection
  const calculateFormTotal = (eventForm: EventForm, useLocalGuestData = false) => {
    let total = 0;
    
    // CRITICAL: Use formResponses state first (current UI state), fall back to database
    const responses = formResponses[eventForm.id] || eventForm.form_responses || {};
    
    console.log('Calculating total for form:', eventForm.form_label, 'Responses:', responses);
    
    // Add form field prices (only when enabled and has price)
    Object.entries(responses).forEach(([fieldId, response]) => {
      if (response.enabled === true && response.price) {
        const price = Number(response.price) || 0;
        if (price > 0) {
          console.log('Adding field price:', fieldId, price);
          total += price;
        }
      }
    });
    
    // Add guest_price_total to the form total
    const guestPriceTotal = useLocalGuestData 
      ? (Number(localGuestData[eventForm.id]?.guest_price_total) || 0)
      : (Number(eventForm.guest_price_total) || 0);
    
    if (guestPriceTotal > 0) {
      console.log('Adding guest price total:', guestPriceTotal);
      total += guestPriceTotal;
    }
    
    console.log('Final calculated total:', total);
    
    // Round to 2 decimal places to prevent floating point precision issues
    return Math.round(total * 100) / 100;
  };

  const totalEventValue = eventForms.reduce((sum, eventForm) => {
    return sum + calculateFormTotal(eventForm, true); // Use local guest data for real-time totals
  }, 0);

  // Handle form field changes with local state only (no auto-save)
  const handleResponseChange = useCallback((eventFormId: string, fieldId: string, updates: any) => {
    console.log('Field response change:', {
      eventFormId,
      fieldId, 
      updates,
      currentResponse: formResponses[eventFormId]?.[fieldId]
    });
    
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
    
    console.log('Updated form responses:', newResponses);
    
    // Update local state immediately for responsive UI
    setFormResponses(newResponses);
    
    // Mark form as having unsaved changes
    setUnsavedChanges(prev => ({
      ...prev,
      [eventFormId]: true
    }));
  }, [formResponses]);

  // Save form changes explicitly
  const saveFormChanges = useCallback(async (eventFormId: string) => {
    const eventForm = eventForms.find(ef => ef.id === eventFormId);
    if (!eventForm) return;

    // Get current form responses (use local state if available)
    const currentResponses = formResponses[eventFormId] || eventForm.form_responses || {};
    
    setIsSaving(prev => ({ ...prev, [eventFormId]: true }));

    try {
      console.log('Saving form data:', {
        eventFormId,
        responses: currentResponses,
        guestData: localGuestData[eventFormId]
      });
      
      const currentTotal = calculateFormTotal({ 
        ...eventForm, 
        form_responses: currentResponses 
      } as EventForm, true);
      
      const updateData: any = {
        form_responses: currentResponses,
        form_total: currentTotal,
        updated_at: new Date().toISOString()
      };

      // Include guest data if available
      if (localGuestData[eventFormId]) {
        updateData.men_count = localGuestData[eventFormId].men_count;
        updateData.ladies_count = localGuestData[eventFormId].ladies_count;
        updateData.guest_price_total = localGuestData[eventFormId].guest_price_total;
        updateData.guest_count = localGuestData[eventFormId].men_count + localGuestData[eventFormId].ladies_count;
      }
      
      console.log('Updating event_forms with:', updateData);
      
      const { error } = await supabase
        .from('event_forms')
        .update(updateData)
        .eq('id', eventFormId);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Form saved successfully to database');
      
      // Mark as saved
      setUnsavedChanges(prev => ({
        ...prev,
        [eventFormId]: false
      }));
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['event-forms', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      
      toast.success('Form saved successfully');
      
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error(`Failed to save form: ${error.message}`);
    } finally {
      setIsSaving(prev => ({ ...prev, [eventFormId]: false }));
    }
  }, [eventForms, formResponses, localGuestData, eventId, queryClient, calculateFormTotal]);

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
        <OptimizedFieldRenderer
          field={field}
          response={response}
          onChange={(id, updates) => handleResponseChange(eventForm.id, fieldId, updates)}
          showInCard={false}
        />
      </div>
    );
  };

  const handleTimeSlotUpdate = async (eventFormId: string, timeSlotId: string) => {
    const eventForm = eventForms.find(ef => ef.id === eventFormId);
    if (!eventForm) return;
    
    const timeSlots = getTimeSlotsForForm(eventForm);
    const selectedSlot = timeSlots?.find(slot => slot.id === timeSlotId);
    if (!selectedSlot) return;
    
    // Update local state immediately
    setSelectedTimeSlots(prev => ({
      ...prev,
      [eventFormId]: timeSlotId
    }));
    
    try {
      const { error } = await supabase
        .from('event_forms')
        .update({ 
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time
        })
        .eq('id', eventFormId);
        
      if (error) throw error;
      
      // Refresh the event forms data
      queryClient.invalidateQueries({ queryKey: ['event-forms', eventId] });
    } catch (error) {
      console.error('Error updating time:', error);
      toast.error('Failed to update time');
      
      // Revert local state on error
      setSelectedTimeSlots(prev => {
        const updated = { ...prev };
        delete updated[eventFormId];
        return updated;
      });
    }
  };

  const handleGuestUpdate = async (eventFormId: string, field: 'men_count' | 'ladies_count' | 'guest_price_total', value: number) => {
    // Update local state immediately for responsive UI - PRESERVE existing values
    const updatedLocalData = {
      ...localGuestData[eventFormId],
      [field]: value
    };
    
    setLocalGuestData(prev => ({
      ...prev,
      [eventFormId]: updatedLocalData
    }));

    try {
      // Calculate guest_count when men or ladies count changes
      const newGuestCount = field === 'men_count' 
        ? value + (updatedLocalData.ladies_count || 0)
        : field === 'ladies_count'
        ? (updatedLocalData.men_count || 0) + value
        : (updatedLocalData.men_count || 0) + (updatedLocalData.ladies_count || 0);

      // Calculate new form total with guest price included
      const eventForm = eventForms.find(ef => ef.id === eventFormId);
      if (eventForm) {
        const newTotal = calculateFormTotal({
          ...eventForm,
          [field]: value
        } as EventForm, false);
        
        // Update database with all guest fields and new total
        const updateData: any = {
          id: eventFormId,
          men_count: updatedLocalData.men_count,
          ladies_count: updatedLocalData.ladies_count,
          guest_count: newGuestCount,
          guest_price_total: updatedLocalData.guest_price_total,
          form_total: newTotal
        };
        
        await updateEventForm(updateData);

        // CRITICAL: Invalidate all relevant queries to ensure real-time sync
        queryClient.invalidateQueries({ queryKey: ['event-form-totals', eventId] });
        queryClient.invalidateQueries({ queryKey: ['event-forms', eventId] });
        queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
      }
    } catch (error) {
      console.error('Error updating guest info:', error);
      toast.error('Failed to update guest information');
      
      // Revert local state on error
      const eventForm = eventForms.find(ef => ef.id === eventFormId);
      if (eventForm) {
        setLocalGuestData(prev => ({
          ...prev,
          [eventFormId]: {
            men_count: eventForm.men_count || 0,
            ladies_count: eventForm.ladies_count || 0,
            guest_price_total: eventForm.guest_price_total || 0
          }
        }));
      }
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
                  <Select 
                    onValueChange={(value) => handleTimeSlotUpdate(eventForm.id, value)}
                    value={selectedTimeSlots[eventForm.id] || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTimeSlotsForForm(eventForm)?.map((slot) => (
                        <SelectItem key={slot.id} value={slot.id}>
                          {slot.label} ({slot.start_time} - {slot.end_time})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getTimeSlotsForForm(eventForm)?.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No time slots available. Configure them in Calendar Settings → Event Types.
                    </p>
                  )}
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
                     value={localGuestData[eventForm.id]?.men_count || 0}
                     onChange={(e) => handleGuestUpdate(eventForm.id, 'men_count', parseInt(e.target.value) || 0)}
                     onFocus={(e) => e.target.select()}
                     placeholder="0"
                   />
                 </div>
                 <div>
                   <Label>Ladies Count</Label>
                   <Input
                     type="number"
                     value={localGuestData[eventForm.id]?.ladies_count || 0}
                     onChange={(e) => handleGuestUpdate(eventForm.id, 'ladies_count', parseInt(e.target.value) || 0)}
                     onFocus={(e) => e.target.select()}
                     placeholder="0"
                   />
                 </div>
                 <div>
                   <Label>Guest Mix</Label>
                   <Select 
                     value={eventDetails?.guest_mixture || 'Mixed'} 
                     onValueChange={(value) => handleGuestMixUpdate(value)}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select guest mix" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="Men Only">Men Only</SelectItem>
                       <SelectItem value="Ladies Only">Ladies Only</SelectItem>
                       <SelectItem value="Mixed">Mixed</SelectItem>
                     </SelectContent>
                   </Select>
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
                    <PriceInput
                      value={localGuestData[eventForm.id]?.guest_price_total || 0}
                      onChange={(value) => handleGuestUpdate(eventForm.id, 'guest_price_total', value)}
                      placeholder="0.00"
                    />
                  </div>
                 <div>
                   <Label>Form Total (£)</Label>
                   <div className="text-lg font-semibold">
                     £{calculateFormTotal(eventForm, true).toFixed(2)}
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
                    Form Total: £{calculateFormTotal(eventForm, true).toFixed(2)}
                  </p>
               </div>
                        <FormSaveButton
                          hasUnsavedChanges={unsavedChanges[eventForm.id] || false}
                          onSave={() => saveFormChanges(eventForm.id)}
                          isLoading={isSaving[eventForm.id] || false}
                        />
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
                   Form Total: £{calculateFormTotal(eventForm, true).toFixed(2)}
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