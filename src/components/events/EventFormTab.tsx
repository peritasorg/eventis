import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTimeSlots } from '@/hooks/useEventTimeSlots';
import { formatCurrency } from '@/lib/utils';

interface EventFormTabProps {
  eventForm: any;
  eventId: string;
  onFormChange?: (total: number) => void;
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ eventForm, eventId, onFormChange }) => {
  const [formResponses, setFormResponses] = useState<any>({});
  const [formTotal, setFormTotal] = useState(0);
  const [guestInfo, setGuestInfo] = useState<any>({
    men_count: 0,
    ladies_count: 0,
    event_mix_type: 'mixed',
    time_slot: ''
  });
  const { currentTenant } = useAuth();
  const { timeSlots } = useEventTimeSlots();
  const { isEventTypeAllDay } = useEventTypeConfigs();

  // Fetch event data to determine if it's an "All Day" event
  const { data: event } = useSupabaseQuery(
    ['event', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('events')
        .select('event_type')
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error) {
        console.error('Event fetch error:', error);
        return null;
      }
      
      return data;
    }
  );

  // Determine if this is an "All Day" event using database configuration
  const isAllDayEvent = event ? isEventTypeAllDay(event.event_type) : false;

  // Fetch form sections and fields for this form template
  const { data: formData } = useSupabaseQuery(
    ['form-sections-fields', eventForm.form_template_id],
    async () => {
      if (!eventForm.form_template_id || !currentTenant?.id) return { sections: [], fields: [] };
      
      // Get form sections
      const { data: sections, error: sectionsError } = await supabase
        .from('form_sections')
        .select('*')
        .eq('form_page_id', eventForm.form_template_id)
        .eq('tenant_id', currentTenant.id)
        .order('section_order');

      // Get form fields
      const { data: fields, error: fieldsError } = await supabase
        .from('form_field_instances')
        .select(`
          *,
          field_library (
            id,
            name,
            label,
            field_type,
            required,
            options,
            affects_pricing,
            unit_price,
            pricing_behavior,
            pricing_type
          )
        `)
        .eq('form_template_id', eventForm.form_template_id)
        .eq('tenant_id', currentTenant.id)
        .order('field_order');

      if (sectionsError || fieldsError) {
        console.error('Form data error:', sectionsError || fieldsError);
        return { sections: [], fields: [] };
      }
      
      return { 
        sections: sections || [], 
        fields: fields || [] 
      };
    }
  );

  const sections = formData?.sections || [];
  const fields = formData?.fields || [];

  // Load existing responses when component mounts
  useEffect(() => {
    if (eventForm?.form_responses) {
      setFormResponses(eventForm.form_responses);
      setFormTotal(eventForm.form_total || 0);
    }
    if (eventForm?.guest_info) {
      setGuestInfo(eventForm.guest_info);
    }
  }, [eventForm]);

  const updateFormMutation = useSupabaseMutation(
    async ({ responses, total, guest_info }: { responses: any; total: number; guest_info?: any }) => {
      const updateData: any = {
        form_responses: responses,
        form_total: total,
        updated_at: new Date().toISOString()
      };
      
      if (guest_info !== undefined) {
        updateData.guest_info = guest_info;
      }
      
      const { data, error } = await supabase
        .from('event_forms')
        .update(updateData)
        .eq('id', eventForm.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        onFormChange?.(formTotal);
      }
    }
  );

  const handleFieldValueChange = (fieldId: string, value: any) => {
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        ...formResponses[fieldId],
        value: value,
        enabled: formResponses[fieldId]?.enabled || true
      }
    };
    
    setFormResponses(updatedResponses);
  };

  const handleInputChange = (fieldId: string, property: string, value: any) => {
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        ...formResponses[fieldId],
        [property]: value
      }
    };
    
    setFormResponses(updatedResponses);
    
    // Recalculate total if pricing-related
    if (property === 'price' || property === 'quantity' || property === 'enabled') {
      let newTotal = 0;
      Object.keys(updatedResponses).forEach(id => {
        const field = fields?.find(f => f.field_library.id === id);
        const response = updatedResponses[id];
        
        if (response.enabled && field?.field_library.affects_pricing) {
          const price = parseFloat(response.price || 0);
          const quantity = parseInt(response.quantity || 1);
          
          if (response.pricing_type === 'per_person') {
            newTotal += price * quantity;
          } else {
            newTotal += price;
          }
        }
      });
      
      setFormTotal(newTotal);
    }
  };

  const handleFieldToggle = (fieldId: string, enabled: boolean) => {
    const field = fields?.find(f => f.field_library.id === fieldId);
    
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        ...formResponses[fieldId],
        enabled,
        price: enabled ? (formResponses[fieldId]?.price || field?.field_library.unit_price || 0) : 0,
        quantity: enabled ? (formResponses[fieldId]?.quantity || 1) : 0,
        pricing_type: formResponses[fieldId]?.pricing_type || 'fixed'
      }
    };
    
    setFormResponses(updatedResponses);
    
    // Recalculate total
    let newTotal = 0;
    Object.keys(updatedResponses).forEach(id => {
      const fieldData = fields?.find(f => f.field_library.id === id);
      const response = updatedResponses[id];
      
      if (response.enabled && fieldData?.field_library.affects_pricing) {
        const price = parseFloat(response.price || 0);
        const quantity = parseInt(response.quantity || 1);
        
        if (response.pricing_type === 'per_person') {
          newTotal += price * quantity;
        } else {
          newTotal += price;
        }
      }
    });
    
    setFormTotal(newTotal);
  };

  const handleSaveForm = () => {
    updateFormMutation.mutate({
      responses: formResponses,
      total: formTotal,
      guest_info: isAllDayEvent ? guestInfo : undefined
    });
  };

  const handleGuestInfoChange = (field: string, value: any) => {
    const updatedGuestInfo = {
      ...guestInfo,
      [field]: value
    };
    setGuestInfo(updatedGuestInfo);
  };

  const renderField = (field: any) => {
    const fieldId = field.field_library.id;
    const response = formResponses[fieldId] || {};
    const fieldLibrary = field.field_library;
    
    const fieldLabel = field.label_override || fieldLibrary.label;
    const fieldRequired = field.required_override !== null ? field.required_override : fieldLibrary.required;
    
    switch (fieldLibrary.field_type) {
      case 'text':
        return (
          <Input
            value={response.value || ''}
            onChange={(e) => handleFieldValueChange(fieldId, e.target.value)}
            placeholder={field.placeholder_override || `Enter ${fieldLabel.toLowerCase()}`}
            required={fieldRequired}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            value={response.value || ''}
            onChange={(e) => handleFieldValueChange(fieldId, e.target.value)}
            placeholder={field.placeholder_override || `Enter ${fieldLabel.toLowerCase()}`}
            required={fieldRequired}
            rows={3}
          />
        );
      
      case 'select':
        return (
          <Select 
            value={response.value || ''} 
            onValueChange={(value) => handleFieldValueChange(fieldId, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${fieldLabel.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {fieldLibrary.options?.map((option: any, index: number) => (
                <SelectItem key={index} value={option.value || option.label || option}>
                  {option.label || option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={response.enabled || false}
              onCheckedChange={(checked) => handleFieldToggle(fieldId, checked as boolean)}
            />
            <Label htmlFor={fieldId} className="text-sm">
              {fieldLabel}
            </Label>
          </div>
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={response.value || ''}
            onChange={(e) => handleFieldValueChange(fieldId, parseFloat(e.target.value) || 0)}
            placeholder={field.placeholder_override || `Enter ${fieldLabel.toLowerCase()}`}
            required={fieldRequired}
          />
        );
      
      default:
        return (
          <Input
            value={response.value || ''}
            onChange={(e) => handleFieldValueChange(fieldId, e.target.value)}
            placeholder={field.placeholder_override || `Enter ${fieldLabel.toLowerCase()}`}
            required={fieldRequired}
          />
        );
    }
  };

  const getFieldsForSection = (sectionId: string) => {
    return fields.filter(field => field.form_section_id === sectionId);
  };

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{eventForm.form_label}</h3>
          <p className="text-sm text-muted-foreground">
            Form template: {eventForm.form_templates?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            Total: £{formatCurrency(formTotal)}
          </Badge>
          <Button 
            onClick={handleSaveForm}
            disabled={updateFormMutation.isPending}
            size="sm"
          >
            {updateFormMutation.isPending ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      </div>

      {/* Guest Information Section - Only for All Day Events */}
      {isAllDayEvent && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-foreground">Guest Information</h4>
                <Badge variant="secondary" className="text-xs">
                  All Day Event
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="men_count" className="text-sm font-medium">Men Count</Label>
                  <Input
                    id="men_count"
                    type="number"
                    min="0"
                    value={guestInfo.men_count || 0}
                    onChange={(e) => handleGuestInfoChange('men_count', parseInt(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ladies_count" className="text-sm font-medium">Ladies Count</Label>
                  <Input
                    id="ladies_count"
                    type="number"
                    min="0"
                    value={guestInfo.ladies_count || 0}
                    onChange={(e) => handleGuestInfoChange('ladies_count', parseInt(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_mix_type" className="text-sm font-medium">Event Mix</Label>
                  <Select 
                    value={guestInfo.event_mix_type || 'mixed'} 
                    onValueChange={(value) => handleGuestInfoChange('event_mix_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="men_only">Men Only</SelectItem>
                      <SelectItem value="ladies_only">Ladies Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_slot" className="text-sm font-medium">Time Slot</Label>
                  <Select 
                    value={guestInfo.time_slot || ''} 
                    onValueChange={(value) => handleGuestInfoChange('time_slot', value)}
                  >
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

              <div className="text-sm text-muted-foreground">
                Total Guests: {(guestInfo.men_count || 0) + (guestInfo.ladies_count || 0)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Sections */}
      <div className="space-y-6">
        {sections.length > 0 ? (
          sections.map((section) => {
            const sectionFields = getFieldsForSection(section.id);
            
            if (sectionFields.length === 0) return null;
            
            return (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{section.section_title}</CardTitle>
                  {section.section_description && (
                    <p className="text-sm text-muted-foreground">{section.section_description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {sectionFields.map((field) => {
                    const fieldId = field.field_library.id;
                    const response = formResponses[fieldId] || {};
                    const fieldLibrary = field.field_library;
                    const fieldLabel = field.label_override || fieldLibrary.label;
                    
                    return (
                      <div key={fieldId} className="space-y-3 p-4 border rounded-lg">
                        {/* Field Label and Input */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            {fieldLabel}
                            {field.required_override !== null ? field.required_override : fieldLibrary.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </Label>
                          
                          {field.help_text_override || fieldLibrary.help_text && (
                            <p className="text-xs text-muted-foreground">
                              {field.help_text_override || fieldLibrary.help_text}
                            </p>
                          )}
                          
                          {fieldLibrary.field_type !== 'checkbox' && renderField(field)}
                          
                          {fieldLibrary.field_type === 'checkbox' && (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={fieldId}
                                checked={response.enabled || false}
                                onCheckedChange={(checked) => handleFieldToggle(fieldId, checked as boolean)}
                              />
                              <Label htmlFor={fieldId} className="text-sm">
                                Enable {fieldLabel}
                              </Label>
                            </div>
                          )}
                        </div>

                        {/* Pricing Fields - Only show for enabled fields that affect pricing */}
                        {response.enabled && fieldLibrary.affects_pricing && (
                          <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label className="text-sm">Pricing Type</Label>
                                <Select
                                  value={response.pricing_type || 'fixed'}
                                  onValueChange={(value) => handleInputChange(fieldId, 'pricing_type', value)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fixed">Fixed Price</SelectItem>
                                    <SelectItem value="per_person">Per Person</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm">
                                  {response.pricing_type === 'per_person' ? 'Price per Person (£)' : 'Price (£)'}
                                </Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={response.price || ''}
                                  onChange={(e) => handleInputChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                                  className="h-8"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm">
                                  {response.pricing_type === 'per_person' ? 'Number of People' : 'Quantity'}
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={response.quantity || ''}
                                  onChange={(e) => handleInputChange(fieldId, 'quantity', parseInt(e.target.value) || 1)}
                                  className="h-8"
                                />
                              </div>
                            </div>

                            {response.pricing_type === 'per_person' && (
                              <div className="text-sm text-green-600 font-medium">
                                Subtotal: £{formatCurrency((parseFloat(response.price) || 0) * (parseInt(response.quantity) || 1))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })
        ) : (
          // Fallback for forms without sections - show fields directly
          <Card>
            <CardContent className="p-6 space-y-4">
              {fields.map((field) => {
                const fieldId = field.field_library.id;
                const response = formResponses[fieldId] || {};
                const fieldLibrary = field.field_library;
                const fieldLabel = field.label_override || fieldLibrary.label;
                
                return (
                  <div key={fieldId} className="space-y-3 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {fieldLabel}
                        {field.required_override !== null ? field.required_override : fieldLibrary.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      
                      {field.help_text_override || fieldLibrary.help_text && (
                        <p className="text-xs text-muted-foreground">
                          {field.help_text_override || fieldLibrary.help_text}
                        </p>
                      )}
                      
                      {fieldLibrary.field_type !== 'checkbox' && renderField(field)}
                      
                      {fieldLibrary.field_type === 'checkbox' && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={fieldId}
                            checked={response.enabled || false}
                            onCheckedChange={(checked) => handleFieldToggle(fieldId, checked as boolean)}
                          />
                          <Label htmlFor={fieldId} className="text-sm">
                            Enable {fieldLabel}
                          </Label>
                        </div>
                      )}
                    </div>

                    {response.enabled && fieldLibrary.affects_pricing && (
                      <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Pricing Type</Label>
                            <Select
                              value={response.pricing_type || 'fixed'}
                              onValueChange={(value) => handleInputChange(fieldId, 'pricing_type', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed Price</SelectItem>
                                <SelectItem value="per_person">Per Person</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">
                              {response.pricing_type === 'per_person' ? 'Price per Person (£)' : 'Price (£)'}
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={response.price || ''}
                              onChange={(e) => handleInputChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">
                              {response.pricing_type === 'per_person' ? 'Number of People' : 'Quantity'}
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={response.quantity || ''}
                              onChange={(e) => handleInputChange(fieldId, 'quantity', parseInt(e.target.value) || 1)}
                              className="h-8"
                            />
                          </div>
                        </div>

                        {response.pricing_type === 'per_person' && (
                          <div className="text-sm text-green-600 font-medium">
                            Subtotal: £{formatCurrency((parseFloat(response.price) || 0) * (parseInt(response.quantity) || 1))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No fields configured for this form template.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};