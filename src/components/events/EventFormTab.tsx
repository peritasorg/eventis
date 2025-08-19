import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PriceInput } from '@/components/ui/price-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Clock, Users, DollarSign } from 'lucide-react';
import { useEventForms } from '@/hooks/useEventForms';
import { useForms } from '@/hooks/useForms';
import { useEventFormTotals } from '@/hooks/useEventFormTotals';
import { useEventTimeSlots } from '@/hooks/useEventTimeSlots';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { OptimizedFieldRenderer } from '@/components/form-builder/OptimizedFieldRenderer';
import { FormSaveButton } from './FormSaveButton';
import { SaveBeforeCloseDialog } from './SaveBeforeCloseDialog';

interface EventFormTabProps {
  eventId: string;
  eventFormId?: string;
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ eventId, eventFormId }) => {
  const { currentTenant } = useAuth();
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  
  // Local state for immediate UI updates
  const [localResponses, setLocalResponses] = useState<Record<string, any>>({});
  const [localGuestCount, setLocalGuestCount] = useState<number>(0);
  const [localGuestPrice, setLocalGuestPrice] = useState<number>(0);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, any>>({});
  
  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Hooks
  const { 
    eventForms, 
    isLoading, 
    createEventForm, 
    updateEventForm, 
    deleteEventForm
  } = useEventForms(eventId);
  
  const { forms } = useForms();
  const { formTotals } = useEventFormTotals(eventId);

  // Fetch event details and available time slots
  const { data: eventDetails } = useSupabaseQuery(
    ['event-details', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return null;
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id)
        .single();
      if (error) throw error;
      return data;
    }
  );

  const { data: availableTimeSlots } = useSupabaseQuery(
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

  // Get current form data
  const currentForm = eventFormId ? eventForms?.find(ef => ef.id === eventFormId) : null;

  // Sync local state when event forms data changes
  useEffect(() => {
    if (eventForms && eventFormId) {
      const currentForm = eventForms.find(ef => ef.id === eventFormId);
      if (currentForm) {
        setLocalResponses(currentForm.form_responses || {});
        setLocalGuestCount(currentForm.guest_count || 0);
        setLocalGuestPrice(currentForm.guest_price || 0);
        
        // Initialize selected time slot if it exists
        if (currentForm.selected_time_slot) {
          setSelectedTimeSlots({
            [eventFormId]: currentForm.selected_time_slot
          });
        }
        
        // Reset unsaved changes when data loads
        setHasUnsavedChanges(false);
      }
    }
  }, [eventForms, eventFormId]);

  // Calculate live form total from local state
  const liveFormTotal = useMemo(() => {
    let total = 0;
    
    // Add guest price
    total += localGuestPrice * localGuestCount;
    
    // Add field prices
    Object.values(localResponses).forEach((response: any) => {
      if (response?.enabled && response?.price) {
        const price = parseFloat(response.price) || 0;
        const quantity = parseFloat(response.quantity) || 1;
        total += price * quantity;
      }
    });
    
    return Math.round(total * 100) / 100; // Round to 2 decimal places
  }, [localResponses, localGuestCount, localGuestPrice]);

  // Save all form data to database
  const saveFormData = async () => {
    if (!eventFormId || !currentTenant?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('event_forms')
        .update({
          form_responses: localResponses,
          guest_count: localGuestCount,
          guest_price: localGuestPrice,
          form_total: liveFormTotal,
          selected_time_slot: selectedTimeSlots[eventFormId] || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventFormId)
        .eq('tenant_id', currentTenant.id);

      if (error) throw error;

      setHasUnsavedChanges(false);
      toast.success('Form saved successfully');
      
      // Data will refresh automatically via queries
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error('Failed to save form');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (fieldId: string, response: any) => {
    setLocalResponses(prev => ({
      ...prev,
      [fieldId]: response
    }));
    setHasUnsavedChanges(true);
  };

  const handleFieldBlur = (fieldId: string, response: any) => {
    // Just update local state, no database save
    setLocalResponses(prev => ({
      ...prev,
      [fieldId]: response
    }));
    setHasUnsavedChanges(true);
  };

  const handleGuestChange = (field: 'count' | 'price', value: number) => {
    if (field === 'count') {
      setLocalGuestCount(value);
    } else {
      setLocalGuestPrice(value);
    }
    setHasUnsavedChanges(true);
  };

  const handleGuestBlur = (field: 'count' | 'price', value: number) => {
    // Just update local state, no database save
    if (field === 'count') {
      setLocalGuestCount(value);
    } else {
      setLocalGuestPrice(value);
    }
    setHasUnsavedChanges(true);
  };

  const handleTimeSlotChange = (value: string) => {
    const timeSlotData = JSON.parse(value);
    
    setSelectedTimeSlots(prev => ({
      ...prev,
      [eventFormId]: timeSlotData
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddForm = async (formId: string) => {
    const selectedForm = forms.find(f => f.id === formId);
    if (!selectedForm) {
      toast.error('Selected form not found');
      return;
    }

    try {
      await createEventForm({
        event_id: eventId,
        form_template_id: formId,
        form_label: selectedForm.name,
        tab_order: (eventForms?.length || 0) + 1
      });
      toast.success('Form added successfully');
    } catch (error: any) {
      console.error('Error adding form:', error);
      toast.error(error.message || 'Failed to add form');
    }
  };

  const handleDeleteForm = async (eventFormId: string) => {
    try {
      await deleteEventForm(eventFormId);
      toast.success('Form removed successfully');
    } catch (error: any) {
      console.error('Error deleting form:', error);
      toast.error(error.message || 'Failed to remove form');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading forms...</p>
        </div>
      </div>
    );
  }

  // Single form view
  if (eventFormId && currentForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{currentForm.form_label}</h2>
          <FormSaveButton
            hasUnsavedChanges={hasUnsavedChanges}
            onSave={saveFormData}
            isSaving={isSaving}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form content */}
          <div className="lg:col-span-2 space-y-6">
            {currentForm.forms?.sections?.map((section: any) => (
              <Card key={section.id} className="space-y-4">
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                  {section.description && (
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.field_ids?.map((fieldId: string) => {
                    const field = currentForm.forms?.form_fields?.find((f: any) => f.id === fieldId);
                    if (!field) return null;

                    return (
                      <OptimizedFieldRenderer
                        key={fieldId}
                        field={field}
                        response={localResponses[fieldId] || {}}
                        onChange={(updates) => handleFieldChange(fieldId, updates)}
                        onBlur={() => handleFieldBlur(fieldId, localResponses[fieldId] || {})}
                        showInCard={false}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timing
                </CardTitle>
                <FormSaveButton
                  hasUnsavedChanges={hasUnsavedChanges}
                  onSave={saveFormData}
                  isSaving={isSaving}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {availableTimeSlots && availableTimeSlots.length > 0 && (
                  <div className="space-y-2">
                    <Label>Quick Times</Label>
                    <Select 
                      value={selectedTimeSlots[eventFormId] ? JSON.stringify(selectedTimeSlots[eventFormId]) : ""} 
                      onValueChange={handleTimeSlotChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a time slot..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimeSlots.map((slot) => (
                          <SelectItem key={slot.id} value={JSON.stringify(slot)}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Guest Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Guest Count</Label>
                  <Input
                    type="number"
                    value={localGuestCount}
                    onChange={(e) => handleGuestChange('count', parseInt(e.target.value) || 0)}
                    onBlur={(e) => handleGuestBlur('count', parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price per Guest (£)</Label>
                  <PriceInput
                    value={localGuestPrice}
                    onChange={(value) => handleGuestChange('price', value)}
                    onBlur={() => handleGuestBlur('price', localGuestPrice)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Finance
                  <span className="ml-auto text-lg font-bold text-green-600">
                    £{liveFormTotal.toFixed(2)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This form's total value including all selected options and guest pricing.
                </p>
                {hasUnsavedChanges && (
                  <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                    ⚠️ You have unsaved changes. Click Save to persist these values.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <SaveBeforeCloseDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
          onSaveAndClose={() => {
            saveFormData().then(() => {
              setShowSaveDialog(false);
              if (pendingNavigation) {
                pendingNavigation();
                setPendingNavigation(null);
              }
            });
          }}
          onDiscardChanges={() => {
            setHasUnsavedChanges(false);
            setShowSaveDialog(false);
            if (pendingNavigation) {
              pendingNavigation();
              setPendingNavigation(null);
            }
          }}
          formLabel={currentForm?.form_label || 'Form'}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>
    );
  }

  // Form management view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Event Forms</h2>
        <div className="flex items-center gap-3">
          <FormSaveButton
            hasUnsavedChanges={hasUnsavedChanges}
            onSave={saveFormData}
            isSaving={isSaving}
          />
          {forms && forms.length > 0 && (
            <Select onValueChange={handleAddForm}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Add a form..." />
              </SelectTrigger>
              <SelectContent>
                {forms
                  .filter(form => !eventForms?.some(ef => ef.form_template_id === form.id))
                  .map(form => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {eventForms && eventForms.length > 0 ? (
        <div className="grid gap-4">
          {eventForms.map((eventForm) => (
            <Card key={eventForm.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{eventForm.form_label}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-green-600">
                      £{eventForm.form_total?.toFixed(2) || '0.00'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteForm(eventForm.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Guest Count: {eventForm.guest_count || 0} | 
                  Total Value: £{eventForm.form_total?.toFixed(2) || '0.00'}
                </p>
              </CardContent>
            </Card>
          ))}
          
          <Card className="border-2 border-dashed border-muted">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  Total Event Value: £{eventForms.reduce((sum, form) => sum + (form.form_total || 0), 0).toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Combined value of all forms for this event
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-2 border-dashed border-muted">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">
                No forms added to this event yet.
              </p>
              {forms && forms.length > 0 ? (
                <Select onValueChange={handleAddForm}>
                  <SelectTrigger className="w-[200px] mx-auto">
                    <SelectValue placeholder="Add your first form..." />
                  </SelectTrigger>
                  <SelectContent>
                    {forms.map(form => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Create forms in the Forms section first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};