import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FileText, DollarSign, MessageSquare, Save, Users, TrendingUp, Edit2 } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface EventFormTabProps {
  eventForm: any;
  eventId: string;
  onFormChange?: (total: number) => void;
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ eventForm, eventId, onFormChange }) => {
  const { currentTenant } = useAuth();
  const [formResponses, setFormResponses] = useState<Record<string, any>>(eventForm.form_responses || {});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch event data to check event type
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
        console.error('Event error:', error);
        return null;
      }
      
      return data;
    }
  );

  // Use the eventForm's form_template_id as the selected form
  const selectedFormId = eventForm.form_template_id || '';

  // Update form responses when eventForm changes
  useEffect(() => {
    if (eventForm.form_responses) {
      setFormResponses(eventForm.form_responses);
      setHasUnsavedChanges(false);
    }
  }, [eventForm.form_responses]);

  const { data: formTemplates } = useSupabaseQuery(
    ['form-templates'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');
      
      if (error) {
        console.error('Form templates error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const { data: formStructure } = useSupabaseQuery(
    ['form-structure', selectedFormId],
    async () => {
      if (!selectedFormId || !currentTenant?.id) return { sections: [], fields: [] };
      
      // First fetch form pages for this template
      const { data: pages, error: pagesError } = await supabase
        .from('form_pages')
        .select('id')
        .eq('form_template_id', selectedFormId)
        .eq('tenant_id', currentTenant.id)
        .order('page_number');
      
      if (pagesError) {
        console.error('Form pages error:', pagesError);
        return { sections: [], fields: [] };
      }
      
      if (!pages || pages.length === 0) {
        // If no pages exist, just fetch fields directly
        const { data: fields, error: fieldsError } = await supabase
          .from('form_field_instances')
          .select(`
            id,
            field_library_id,
            field_order,
            form_section_id,
            field_library (
              id,
              label,
              field_type,
              category,
              required,
              options,
              affects_pricing,
              unit_price,
              show_notes_field
            )
          `)
          .eq('form_template_id', selectedFormId)
          .eq('tenant_id', currentTenant.id)
          .order('field_order');
        
        if (fieldsError) {
          console.error('Form fields error:', fieldsError);
          return { sections: [], fields: [] };
        }
        
        return { sections: [], fields: fields || [] };
      }
      
      const pageIds = pages.map(p => p.id);
      
      // Fetch sections for these pages
      const { data: sections, error: sectionsError } = await supabase
        .from('form_sections')
        .select('*')
        .in('form_page_id', pageIds)
        .eq('tenant_id', currentTenant.id)
        .order('section_order');
      
      if (sectionsError) {
        console.error('Form sections error:', sectionsError);
      }
      
      // Fetch fields with their sections
      const { data: fields, error: fieldsError } = await supabase
        .from('form_field_instances')
        .select(`
          id,
          field_library_id,
          field_order,
          form_section_id,
          field_library (
            id,
            label,
            field_type,
            category,
            required,
            options,
            affects_pricing,
            unit_price,
            show_notes_field
          )
        `)
        .eq('form_template_id', selectedFormId)
        .eq('tenant_id', currentTenant.id)
        .order('field_order');
      
      if (fieldsError) {
        console.error('Form fields error:', fieldsError);
        return { sections: sections || [], fields: [] };
      }
      
      return { sections: sections || [], fields: fields || [] };
    }
  );

  const updateEventFormMutation = useSupabaseMutation(
    async (updates: Record<string, any>) => {
      const { data, error } = await supabase
        .from('event_forms')
        .update(updates)
        .eq('id', eventForm.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Form responses saved successfully!',
      invalidateQueries: [['event-forms', eventId]]
    }
  );

  const handleChangeTemplate = (newFormId: string) => {
    if (!newFormId) {
      toast.error('Please select a form template');
      return;
    }
    
    // Warn about data loss
    if (Object.keys(formResponses).length > 0) {
      if (!confirm('Changing the template will clear all current form responses. Continue?')) {
        return;
      }
    }
    
    updateEventFormMutation.mutate({
      form_template_id: newFormId,
      form_responses: {},
      form_total: 0
    });
  };

  const handleToggleChange = (fieldId: string, enabled: boolean) => {
    const field = formStructure?.fields?.find(f => f.field_library.id === fieldId)?.field_library;
    
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        ...formResponses[fieldId],
        enabled,
        label: field?.label || ''
      }
    };

    // Only add pricing data if field affects pricing
    if (enabled && field?.affects_pricing) {
      updatedResponses[fieldId].pricing_type = formResponses[fieldId]?.pricing_type || 'fixed';
      updatedResponses[fieldId].price = formResponses[fieldId]?.price || 0;
      updatedResponses[fieldId].quantity = formResponses[fieldId]?.quantity || 1;
    } else if (!enabled) {
      // Reset notes when disabled
      updatedResponses[fieldId].notes = '';
      if (field?.affects_pricing) {
        updatedResponses[fieldId].quantity = 0;
      }
    }
    
    setFormResponses(updatedResponses);
    setHasUnsavedChanges(true);
  };

  const renderFieldInput = (field: any, fieldId: string, response: any) => {
    // Toggle fields - show toggle switch with conditional pricing/notes
    if (field.field_type === 'toggle') {
      const isEnabled = response.enabled || false;
      
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={isEnabled}
              onCheckedChange={(enabled) => handleToggleChange(fieldId, enabled)}
            />
            <span className="text-sm">{isEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          
          {isEnabled && field.affects_pricing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Pricing Type
                </Label>
                <Select
                  value={response.pricing_type || 'fixed'}
                  onValueChange={(value) => handleFieldChange(fieldId, 'pricing_type', value)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="per_person">Per Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`price-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    {response.pricing_type === 'per_person' ? 'Price per Person (£)' : 'Price (£)'}
                  </Label>
                  <Input
                    id={`price-${fieldId}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={response.price || ''}
                    onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor={`quantity-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {response.pricing_type === 'per_person' ? 'Number of People' : 'Quantity'}
                  </Label>
                  <Input
                    id={`quantity-${fieldId}`}
                    type="number"
                    min="1"
                    value={response.quantity || ''}
                    onChange={(e) => handleFieldChange(fieldId, 'quantity', parseInt(e.target.value) || 1)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {response.pricing_type === 'per_person' && (
                <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <TrendingUp className="h-3 w-3" />
                  Total: £{formatCurrency((parseFloat(response.price) || 0) * (parseInt(response.quantity) || 1))}
                </div>
              )}
            </div>
          )}

          {isEnabled && field.show_notes_field && (
            <div>
              <Label htmlFor={`notes-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                Notes
              </Label>
              <Textarea
                id={`notes-${fieldId}`}
                value={response.notes || ''}
                onChange={(e) => handleFieldChange(fieldId, 'notes', e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                className="text-sm"
              />
            </div>
          )}
        </div>
      );
    }

    // All other field types - simplified unified rendering
    return (
      <div className="space-y-3">
        {/* Guest Information Fields for All Day Events */}
        {event?.event_type === 'all_day' && (
          <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`men_count-${fieldId}`} className="text-xs font-medium text-muted-foreground">Men Count</Label>
                <Input
                  id={`men_count-${fieldId}`}
                  type="number"
                  min="0"
                  value={response.men_count || ''}
                  onChange={(e) => handleFieldChange(fieldId, 'men_count', parseInt(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor={`ladies_count-${fieldId}`} className="text-xs font-medium text-muted-foreground">Ladies Count</Label>
                <Input
                  id={`ladies_count-${fieldId}`}
                  type="number"
                  min="0"
                  value={response.ladies_count || ''}
                  onChange={(e) => handleFieldChange(fieldId, 'ladies_count', parseInt(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Event Mix Type</Label>
              <Select
                value={response.event_mix_type || 'mixed'}
                onValueChange={(value) => handleFieldChange(fieldId, 'event_mix_type', value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="men_only">Men Only</SelectItem>
                  <SelectItem value="ladies_only">Ladies Only</SelectItem>
                  <SelectItem value="separate_sections">Separate Sections</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Time Slot</Label>
              <Select
                value={response.time_slot || ''}
                onValueChange={(value) => handleFieldChange(fieldId, 'time_slot', value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (9:00 AM - 12:00 PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12:00 PM - 5:00 PM)</SelectItem>
                  <SelectItem value="evening">Evening (5:00 PM - 11:00 PM)</SelectItem>
                  <SelectItem value="night">Night (11:00 PM - 3:00 AM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Pricing section - only show if field affects pricing */}
        {field.affects_pricing && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                Pricing Type
              </Label>
              <Select
                value={response.pricing_type || 'fixed'}
                onValueChange={(value) => handleFieldChange(fieldId, 'pricing_type', value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="per_person">Per Person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`price-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  {response.pricing_type === 'per_person' ? 'Price per Person (£)' : 'Price (£)'}
                </Label>
                <Input
                  id={`price-${fieldId}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={response.price || ''}
                  onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor={`quantity-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {response.pricing_type === 'per_person' ? 'Number of People' : 'Quantity'}
                </Label>
                <Input
                  id={`quantity-${fieldId}`}
                  type="number"
                  min="1"
                  value={response.quantity || ''}
                  onChange={(e) => handleFieldChange(fieldId, 'quantity', parseInt(e.target.value) || 1)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {response.pricing_type === 'per_person' && (
              <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <TrendingUp className="h-3 w-3" />
                Total: £{formatCurrency((parseFloat(response.price) || 0) * (parseInt(response.quantity) || 1))}
              </div>
            )}
          </div>
        )}

        {/* Notes section - show if enabled in field settings */}
        {field.show_notes_field && (
          <div>
            <Label htmlFor={`notes-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              Notes
            </Label>
            <Textarea
              id={`notes-${fieldId}`}
              value={response.notes || ''}
              onChange={(e) => handleFieldChange(fieldId, 'notes', e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="text-sm"
            />
          </div>
        )}
      </div>
    );
  };

  const handleFieldChange = (fieldId: string, field: string, value: string | number) => {
    const fieldInstance = formStructure?.fields?.find(f => f.field_library.id === fieldId);
    const fieldLabel = fieldInstance?.field_library?.label || '';
    
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        ...formResponses[fieldId],
        [field]: value,
        label: fieldLabel // Ensure label is always stored
      }
    };
    
    setFormResponses(updatedResponses);
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = () => {
    const formTotal = calculateFormTotal();
    
    updateEventFormMutation.mutate({
      form_responses: formResponses,
      form_total: formTotal
    });
    
    // Call the callback to update parent component
    onFormChange?.(formTotal);
    
    setHasUnsavedChanges(false);
  };

  const calculateFormTotal = () => {
    if (!formStructure?.fields) return 0;
    
    return formStructure.fields.reduce((total: number, fieldInstance: any) => {
      const fieldId = fieldInstance.field_library.id;
      const field = fieldInstance.field_library;
      const response = formResponses[fieldId];
      
      // Only include fields that affect pricing
      if (field.affects_pricing && response) {
        // For toggle fields, only count if enabled
        if (field.field_type === 'toggle' && !response.enabled) {
          return total;
        }
        
        const price = parseFloat(response.price) || 0;
        const quantity = parseInt(response.quantity) || 1;
        
        // Calculate total based on pricing type
        if (response.pricing_type === 'per_person') {
          return total + (price * quantity);
        } else {
          return total + price;
        }
      }
      
      return total;
    }, 0);
  };

  // Get fields for the summary - only fields with pricing that have values
  const getEnabledFieldsForSummary = () => {
    if (!formStructure?.fields) return [];
    
    return formStructure.fields
      .filter(fieldInstance => {
        const fieldId = fieldInstance.field_library.id;
        const field = fieldInstance.field_library;
        const response = formResponses[fieldId];
        
        // Only include fields that affect pricing
        if (!field.affects_pricing) return false;
        
        // For toggle fields, only include if enabled
        if (field.field_type === 'toggle') {
          return response?.enabled === true && response?.price > 0;
        }
        
        // For other fields with pricing, include if they have a price
        return response?.price > 0;
      })
      .map(fieldInstance => ({
        field: fieldInstance.field_library,
        response: formResponses[fieldInstance.field_library.id]
      }));
  };

  // Organize fields by section
  const getFieldsBySection = (sectionId: string) => {
    if (!formStructure?.fields) return [];
    return formStructure.fields
      .filter(fieldInstance => fieldInstance.form_section_id === sectionId)
      .sort((a, b) => a.field_order - b.field_order);
  };

  return (
    <div className="space-y-4">
      {/* Form Sections */}
      {selectedFormId && formStructure && (formStructure.sections?.length > 0 || formStructure.fields?.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Form Responses</h3>
            <div className="flex items-center gap-3">
                <div className="text-sm font-bold text-green-600">
                  Total: £{formatCurrency(calculateFormTotal())}
                </div>
              {hasUnsavedChanges && (
                <Button 
                  onClick={handleSaveChanges}
                  disabled={updateEventFormMutation.isPending}
                  size="sm"
                  className="flex items-center gap-1 h-7 px-2 text-xs"
                >
                  <Save className="h-3 w-3" />
                  Save Changes
                </Button>
              )}
            </div>
          </div>

          {formStructure.sections.map((section) => {
            const sectionFields = getFieldsBySection(section.id);
            
            if (sectionFields.length === 0) return null;
            
            return (
              <Card key={section.id} className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {section.section_title || 'Form Section'}
                  </CardTitle>
                  {section.section_description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {section.section_description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                     {sectionFields.map((fieldInstance) => {
                       const field = fieldInstance.field_library;
                       const fieldId = field.id;
                       const response = formResponses[fieldId] || {};
                       
                       return (
                         <div key={fieldId} className="border rounded-md p-3">
                           <div className="flex items-center justify-between mb-3">
                             <h4 className="font-medium text-sm">{field.label}</h4>
                             {field.category && (
                               <span className="bg-muted px-2 py-0.5 rounded text-xs">
                                 {field.category}
                               </span>
                             )}
                           </div>
                           
                           {renderFieldInput(field, fieldId, response)}
                         </div>
                       );
                     })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Fields without sections (fallback) */}
      {formStructure?.fields && formStructure.fields.length > 0 && (!formStructure.sections || formStructure.sections.length === 0) && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Form Responses
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-bold text-green-600">
                  Total: £{formatCurrency(calculateFormTotal())}
                </div>
                {hasUnsavedChanges && (
                  <Button 
                    onClick={handleSaveChanges}
                    disabled={updateEventFormMutation.isPending}
                    size="sm"
                    className="flex items-center gap-1 h-7 px-2 text-xs"
                  >
                    <Save className="h-3 w-3" />
                    Save Changes
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {formStructure.fields.map((fieldInstance) => {
                const field = fieldInstance.field_library;
                const fieldId = field.id;
                const response = formResponses[fieldId] || {};
                
                return (
                  <div key={fieldId} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">{field.label}</h4>
                      {field.category && (
                        <span className="bg-muted px-2 py-0.5 rounded text-xs">
                          {field.category}
                        </span>
                      )}
                    </div>
                    
                    {renderFieldInput(field, fieldId, response)}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Summary */}
      {getEnabledFieldsForSummary().length > 0 && (
        <Card className="border-2 border-green-200 shadow-sm">
          <CardHeader className="pb-3 bg-green-50">
            <CardTitle className="text-base flex items-center gap-2 text-green-800">
              <DollarSign className="h-4 w-4" />
              Form Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {getEnabledFieldsForSummary().map(({ field, response }) => (
                <div key={field.id} className="flex justify-between items-center py-2 border-b border-muted last:border-b-0">
                  <div className="flex-1">
                    <span className="font-medium text-sm">{field.label}</span>
                    {response.notes && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {response.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-sm">
                      £{formatCurrency(parseFloat(response.price) || 0)}
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-green-600">
                <span className="text-base font-bold">Total Amount</span>
                <span className="text-xl font-bold text-green-600">
                  £{formatCurrency(calculateFormTotal())}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
