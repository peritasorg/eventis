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

interface EventFormTabProps {
  eventForm: any;
  eventId: string;
  onFormChange?: (total: number) => void;
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ eventForm, eventId, onFormChange }) => {
  const { currentTenant } = useAuth();
  const [formResponses, setFormResponses] = useState<Record<string, any>>(eventForm.form_responses || {});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
              help_text,
              required
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
            help_text,
            required
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
        pricing_type: enabled ? (formResponses[fieldId]?.pricing_type || 'fixed') : 'none',
        price: enabled ? (formResponses[fieldId]?.price || 0) : 0,
        quantity: enabled ? (formResponses[fieldId]?.quantity || 1) : 1,
        notes: enabled ? (formResponses[fieldId]?.notes || '') : '',
        label: field?.label || ''
      }
    };
    
    setFormResponses(updatedResponses);
    setHasUnsavedChanges(true);
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
      const response = formResponses[fieldId];
      
      // Only include enabled fields in the total
      if (response?.enabled) {
        const price = parseFloat(response.price) || 0;
        return total + price;
      }
      
      return total;
    }, 0);
  };

  // Get enabled fields for the summary - only fields that exist in current form AND are enabled
  const getEnabledFieldsForSummary = () => {
    if (!formStructure?.fields) return [];
    
    return formStructure.fields
      .filter(fieldInstance => {
        const fieldId = fieldInstance.field_library.id;
        const response = formResponses[fieldId];
        return response?.enabled === true;
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
      {/* Form Selection */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Form Template: {formTemplates?.find(t => t.id === selectedFormId)?.name || 'Loading...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedFormId ? (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{formTemplates?.find(t => t.id === selectedFormId)?.name}</p>
                    {formTemplates?.find(t => t.id === selectedFormId)?.description && (
                      <p className="text-muted-foreground text-xs">
                        {formTemplates?.find(t => t.id === selectedFormId)?.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        window.open(`/form-builder?edit=${selectedFormId}`, '_blank');
                      }}
                      className="h-7 text-xs"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit Template
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const newTemplateId = prompt('Enter new template ID or select from dropdown (this will clear current responses):');
                        if (newTemplateId) handleChangeTemplate(newTemplateId);
                      }}
                      className="h-7 text-xs"
                    >
                      Change Template
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>No template selected for this form tab.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Sections */}
      {formStructure?.sections && formStructure.sections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Form Responses</h3>
            <div className="flex items-center gap-3">
              <div className="text-sm font-bold text-green-600">
                Total: £{calculateFormTotal().toFixed(2)}
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
                      // Auto-enable if there's existing data (price > 0 or notes exist)
                      const hasExistingData = (response.price && response.price > 0) || (response.notes && response.notes.trim() !== '');
                      const isEnabled = response.enabled || hasExistingData;
                      
                      return (
                        <div key={fieldId} className="border rounded-md p-3">
                          <div className="flex items-start gap-3">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(enabled) => handleToggleChange(fieldId, enabled)}
                              className="mt-0.5"
                            />
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm">{field.label}</h4>
                                {field.category && (
                                  <span className="bg-muted px-2 py-0.5 rounded text-xs">
                                    {field.category}
                                  </span>
                                )}
                              </div>
                              
                              {field.help_text && (
                                <p className="text-xs text-muted-foreground mb-2">{field.help_text}</p>
                              )}
                              
                              {isEnabled && (
                                <div className="space-y-3 mt-3">
                                  {/* Pricing Type Selection */}
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
                                        onFocus={(e) => e.target.select()}
                                        placeholder={response.price ? response.price.toString() : "0.00"}
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
                                        onFocus={(e) => e.target.select()}
                                        placeholder={response.quantity ? response.quantity.toString() : "1"}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>
                                  
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
                                </div>
                              )}
                            </div>
                          </div>
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
                  Total: £{calculateFormTotal().toFixed(2)}
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
                // Auto-enable if there's existing data (price > 0 or notes exist)
                const hasExistingData = (response.price && response.price > 0) || (response.notes && response.notes.trim() !== '');
                const isEnabled = response.enabled || hasExistingData;
                
                return (
                  <div key={fieldId} className="border rounded-md p-3">
                    <div className="flex items-start gap-3">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(enabled) => handleToggleChange(fieldId, enabled)}
                        className="mt-0.5"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{field.label}</h4>
                          {field.category && (
                            <span className="bg-muted px-2 py-0.5 rounded text-xs">
                              {field.category}
                            </span>
                          )}
                        </div>
                        
                        {field.help_text && (
                          <p className="text-xs text-muted-foreground mb-2">{field.help_text}</p>
                        )}
                        
                        {isEnabled && (
                          <div className="space-y-3 mt-3">
                            {/* Pricing Type Selection */}
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
                                  onFocus={(e) => e.target.select()}
                                  placeholder={response.price ? response.price.toString() : "0.00"}
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
                                  onFocus={(e) => e.target.select()}
                                  placeholder={response.quantity ? response.quantity.toString() : "1"}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                            
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
                          </div>
                        )}
                      </div>
                    </div>
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
                      £{(parseFloat(response.price) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-green-600">
                <span className="text-base font-bold">Total Amount</span>
                <span className="text-xl font-bold text-green-600">
                  £{calculateFormTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
