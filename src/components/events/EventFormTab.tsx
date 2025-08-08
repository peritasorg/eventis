import React, { useState, useEffect } from 'react';
import { Save, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';

interface EventFormTabProps {
  eventForm: any;
  eventId: string;
  onFormChange?: (total: number) => void;
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ 
  eventForm, 
  eventId,
  onFormChange 
}) => {
  const { currentTenant } = useAuth();
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  const [formTotal, setFormTotal] = useState(0);
  const [guestInfo, setGuestInfo] = useState<Record<string, any>>({});
  const [individualGuestInfo, setIndividualGuestInfo] = useState(false);
  const { isEventTypeAllDay } = useEventTypeConfigs();

  // Fetch event details
  const { data: event } = useSupabaseQuery(
    ['event-detail', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error) return null;
      return data;
    }
  );

  const isAllDay = event ? isEventTypeAllDay(event.event_type) : false;

  // Fetch time slots
  const { data: timeSlots } = useSupabaseQuery(
    ['event-time-slots'],
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

  // Fetch form structure with proper relationships
  const { data: formStructure } = useSupabaseQuery(
    ['form-structure', eventForm?.form_template_id],
    async () => {
      if (!eventForm?.form_template_id || !currentTenant?.id) return [];
      
      // Get pages for this template
      const { data: pages, error: pagesError } = await supabase
        .from('form_pages')
        .select('id')
        .eq('form_template_id', eventForm.form_template_id)
        .eq('tenant_id', currentTenant.id)
        .order('page_number');
      
      if (pagesError || !pages?.length) return [];
      
      // Get sections for these pages
      const { data: sections, error: sectionsError } = await supabase
        .from('form_sections')
        .select('*')
        .in('form_page_id', pages.map(p => p.id))
        .eq('tenant_id', currentTenant.id)
        .order('section_order');
      
      if (sectionsError || !sections?.length) return [];
      
      // Get fields for these sections
      const { data: fields, error: fieldsError } = await supabase
        .from('form_field_instances')
        .select(`
          *,
          field_library (
            id, name, label, field_type, required, options, 
            affects_pricing, unit_price, pricing_behavior, min_quantity, max_quantity
          )
        `)
        .in('form_section_id', sections.map(s => s.id))
        .eq('tenant_id', currentTenant.id)
        .order('field_order');
      
      if (fieldsError) return [];
      
      // Group fields by section
      return sections.map(section => ({
        ...section,
        fields: fields?.filter(field => field.form_section_id === section.id) || []
      }));
    }
  );

  // Load existing data
  useEffect(() => {
    if (eventForm?.form_responses) {
      setFormResponses(eventForm.form_responses);
    }
    if (eventForm?.guest_info) {
      setGuestInfo(eventForm.guest_info);
    }
    if (eventForm?.form_total) {
      setFormTotal(eventForm.form_total);
    }
    if (eventForm?.individual_guest_info !== undefined) {
      setIndividualGuestInfo(eventForm.individual_guest_info);
    }
  }, [eventForm]);

  // Calculate total
  useEffect(() => {
    let total = 0;
    Object.values(formResponses).forEach((response: any) => {
      if (response?.enabled && response?.price) {
        const price = parseFloat(response.price) || 0;
        const quantity = parseInt(response.quantity) || 1;
        total += price * quantity;
      }
    });
    setFormTotal(total);
    if (onFormChange) onFormChange(total);
  }, [formResponses, onFormChange]);

  const updateEventFormMutation = useSupabaseMutation(
    async ({ responses, total, guestInfo, individualGuestInfo, timeSlotId }: any) => {
      const { data, error } = await supabase
        .from('event_forms')
        .update({
          form_responses: responses,
          form_total: total,
          guest_info: guestInfo,
          individual_guest_info: individualGuestInfo,
          time_slot_id: timeSlotId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventForm.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    { successMessage: 'Form saved successfully!' }
  );

  const handleFieldValueChange = (fieldId: string, value: any) => {
    setFormResponses(prev => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], value }
    }));
  };

  const handleSaveForm = () => {
    updateEventFormMutation.mutate({
      responses: formResponses,
      total: formTotal,
      guestInfo: guestInfo,
      individualGuestInfo: individualGuestInfo,
      timeSlotId: guestInfo.time_slot_id
    });
  };

  const renderField = (field: any) => {
    const fieldId = field.id;
    const lib = field.field_library;
    const currentResponse = formResponses[fieldId] || {};
    const fieldValue = currentResponse.value || '';
    
    if (!lib) return null;

    const label = field.label_override || lib.label || lib.name;
    const required = field.required_override !== null ? field.required_override : lib.required;

    let input = null;
    switch (lib.field_type) {
      case 'text':
        input = <Input value={fieldValue} onChange={(e) => handleFieldValueChange(fieldId, e.target.value)} required={required} />;
        break;
      case 'textarea':
        input = <Textarea value={fieldValue} onChange={(e) => handleFieldValueChange(fieldId, e.target.value)} required={required} rows={3} />;
        break;
      case 'select':
        input = (
          <Select value={fieldValue} onValueChange={(value) => handleFieldValueChange(fieldId, value)}>
            <SelectTrigger><SelectValue placeholder={`Select ${label?.toLowerCase()}`} /></SelectTrigger>
            <SelectContent>
              {Array.isArray(lib.options) && lib.options.map((option: any, index: number) => (
                <SelectItem key={index} value={option.value || option}>
                  {option.label || option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        break;
      case 'checkbox':
        input = (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={!!fieldValue}
              onCheckedChange={(checked) => handleFieldValueChange(fieldId, checked)}
            />
            <Label htmlFor={fieldId}>{label}</Label>
          </div>
        );
        break;
      case 'number':
        input = <Input type="number" value={fieldValue} onChange={(e) => handleFieldValueChange(fieldId, e.target.value)} required={required} />;
        break;
      default:
        input = <Input value={fieldValue} onChange={(e) => handleFieldValueChange(fieldId, e.target.value)} required={required} />;
    }

    return (
      <div key={fieldId} className="space-y-3">
        {lib.field_type !== 'checkbox' && (
          <Label>{label}{required && <span className="text-red-500 ml-1">*</span>}</Label>
        )}
        {input}
        {field.help_text_override && <p className="text-xs text-muted-foreground">{field.help_text_override}</p>}
        
        {lib.affects_pricing && lib.field_type !== 'checkbox' && (
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox
              checked={currentResponse.enabled || false}
              onCheckedChange={(checked) => setFormResponses(prev => ({
                ...prev,
                [fieldId]: { ...prev[fieldId], enabled: checked }
              }))}
            />
            <Label className="text-xs">Include in pricing</Label>
            {currentResponse.enabled && (
              <div className="flex space-x-2 ml-4">
                <Input
                  type="number"
                  step="0.01"
                  value={currentResponse.price || lib.unit_price || ''}
                  onChange={(e) => setFormResponses(prev => ({
                    ...prev,
                    [fieldId]: { ...prev[fieldId], price: e.target.value }
                  }))}
                  className="w-20 h-6 text-xs"
                  placeholder="Price"
                />
                {lib.pricing_behavior !== 'fixed' && (
                  <Input
                    type="number"
                    min={lib.min_quantity || 1}
                    max={lib.max_quantity || undefined}
                    value={currentResponse.quantity || 1}
                    onChange={(e) => setFormResponses(prev => ({
                      ...prev,
                      [fieldId]: { ...prev[fieldId], quantity: e.target.value }
                    }))}
                    className="w-16 h-6 text-xs"
                    placeholder="Qty"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {eventForm?.form_label || 'Form'}
              <span className="text-sm font-normal text-muted-foreground">
                ({eventForm?.form_templates?.name})
              </span>
            </CardTitle>
            {formTotal > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-lg font-semibold text-green-600">£{formTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAllDay && (
              <div className="flex items-center space-x-2">
                <Switch checked={individualGuestInfo} onCheckedChange={setIndividualGuestInfo} />
                <Label className="text-sm">Individual Guest Info</Label>
              </div>
            )}
            <Button onClick={handleSaveForm} className="flex items-center gap-2">
              <Save className="w-4 h-4" />Save Form
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {isAllDay && individualGuestInfo && (
          <Card className="bg-blue-50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />Guest Information for {eventForm?.form_label}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Men Count</Label>
                <Input type="number" value={guestInfo.men_count || ''} 
                  onChange={(e) => setGuestInfo(prev => ({...prev, men_count: e.target.value}))} />
              </div>
              <div>
                <Label>Ladies Count</Label>
                <Input type="number" value={guestInfo.ladies_count || ''} 
                  onChange={(e) => setGuestInfo(prev => ({...prev, ladies_count: e.target.value}))} />
              </div>
              <div>
                <Label>Time Slot</Label>
                <Select value={guestInfo.time_slot_id || ''} 
                  onValueChange={(value) => setGuestInfo(prev => ({...prev, time_slot_id: value}))}>
                  <SelectTrigger><SelectValue placeholder="Select time slot" /></SelectTrigger>
                  <SelectContent>
                    {timeSlots?.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id}>
                        {slot.label} ({slot.start_time} - {slot.end_time})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Total Guests</Label>
                <Input type="number" value={guestInfo.total_guests || ''} 
                  onChange={(e) => setGuestInfo(prev => ({...prev, total_guests: e.target.value}))} />
              </div>
            </CardContent>
          </Card>
        )}

        {formStructure && formStructure.length > 0 ? (
          <div className="space-y-6">
            {formStructure.map((section) => (
              <Card key={section.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="text-lg">{section.section_title || 'Form Section'}</CardTitle>
                  {section.section_description && (
                    <p className="text-sm text-muted-foreground">{section.section_description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    {section.fields && section.fields.length > 0 ? (
                      section.fields.map((field) => renderField(field))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No fields in this section</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No form structure found. Please check the form template configuration.
              </p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};