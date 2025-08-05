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
  event: any;
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ event }) => {
  const { currentTenant } = useAuth();
  const [formResponses, setFormResponses] = useState<Record<string, any>>(event.form_responses || {});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Use the event's form_template_used as the selected form - this ensures persistence
  const selectedFormId = event.form_template_used || '';

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

  const { data: selectedFormFields } = useSupabaseQuery(
    ['form-fields', selectedFormId],
    async () => {
      if (!selectedFormId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
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
            pricing_behavior,
            unit_price,
            min_quantity,
            max_quantity,
            default_quantity,
            show_quantity_field,
            show_notes_field,
            allow_zero_price
          )
        `)
        .eq('form_template_id', selectedFormId)
        .eq('tenant_id', currentTenant.id)
        .order('field_order');
      
      if (error) {
        console.error('Form fields error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const updateEventMutation = useSupabaseMutation(
    async (updates: Record<string, any>) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', event.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Form responses saved successfully!',
      invalidateQueries: [['event', event.id]]
    }
  );

  const handleLoadForm = (newFormId: string) => {
    if (!newFormId) {
      toast.error('Please select a form template');
      return;
    }
    
    updateEventMutation.mutate({
      form_template_used: newFormId
    });
  };

  const handleToggleChange = (fieldId: string, enabled: boolean) => {
    const field = selectedFormFields?.find(f => f.field_library.id === fieldId)?.field_library;
    
    const defaultPrice = field?.unit_price || 0;
    const defaultQuantity = field?.default_quantity || 1;
    
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        enabled,
        pricing_type: enabled ? (formResponses[fieldId]?.pricing_type || field?.pricing_behavior || 'fixed') : 'none',
        price: enabled ? (formResponses[fieldId]?.price || defaultPrice) : 0,
        unit_price: enabled ? (formResponses[fieldId]?.unit_price || defaultPrice) : 0,
        quantity: enabled ? (formResponses[fieldId]?.quantity || defaultQuantity) : 1,
        notes: enabled ? (formResponses[fieldId]?.notes || '') : '',
        label: field?.label || ''
      }
    };
    
    setFormResponses(updatedResponses);
    setHasUnsavedChanges(true);
  };

  const handleFieldChange = (fieldId: string, field: string, value: string | number) => {
    const fieldInstance = selectedFormFields?.find(f => f.field_library.id === fieldId);
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
    
    updateEventMutation.mutate({
      form_responses: formResponses,
      form_total: formTotal
    });
    
    setHasUnsavedChanges(false);
  };

  const calculateFormTotal = () => {
    if (!selectedFormFields) return 0;
    
    return selectedFormFields.reduce((total: number, fieldInstance: any) => {
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
    if (!selectedFormFields) return [];
    
    return selectedFormFields
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

  return (
    <div className="space-y-4">
      {/* Form Selection */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Form Template Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="form_template" className="text-xs font-medium text-muted-foreground">Select Form Template</Label>
              <Select value={selectedFormId} onValueChange={handleLoadForm}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Choose a form template..." />
                </SelectTrigger>
                <SelectContent>
                  {formTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.description && (
                        <span className="text-muted-foreground ml-2">- {template.description}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedFormId && (
            <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground flex items-center justify-between">
              <span>Currently using: {formTemplates?.find(t => t.id === selectedFormId)?.name || 'Unknown Template'}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Navigate to form builder with this form ID
                  const formId = selectedFormId;
                  window.open(`/form-builder?edit=${formId}`, '_blank');
                }}
                className="h-6 text-xs"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit Form
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Fields */}
      {selectedFormFields && selectedFormFields.length > 0 && (
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
                    disabled={updateEventMutation.isPending}
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
              {selectedFormFields.map((fieldInstance) => {
                const field = fieldInstance.field_library;
                const fieldId = field.id;
                const response = formResponses[fieldId] || {};
                const isEnabled = response.enabled || false;
                
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
                            {/* Pricing Type Selection - only show if field has pricing */}
                            {field.pricing_behavior !== 'none' && (
                              <div>
                                <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                                  Pricing Type
                                </Label>
                                <Select
                                  value={response.pricing_type || field.pricing_behavior}
                                  onValueChange={(value) => {
                                    handleFieldChange(fieldId, 'pricing_type', value);
                                    // Reset quantity when changing pricing type
                                    if (value === 'fixed') {
                                      handleFieldChange(fieldId, 'quantity', 1);
                                      handleFieldChange(fieldId, 'price', field.unit_price || 0);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fixed">Fixed Price</SelectItem>
                                    <SelectItem value="per_person">Per Person</SelectItem>
                                    {field.pricing_behavior === 'quantity_based' && (
                                      <SelectItem value="quantity_based">Quantity Based</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {(response.pricing_type === 'per_person' || response.pricing_type === 'quantity_based') ? (
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label htmlFor={`quantity-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                    <Users className="h-3 w-3" />
                                    Quantity
                                  </Label>
                                  <Input
                                    id={`quantity-${fieldId}`}
                                    type="number"
                                    min={field.min_quantity || 1}
                                    max={field.max_quantity || undefined}
                                    value={response.quantity || field.default_quantity || 1}
                                    onChange={(e) => {
                                      const qty = parseInt(e.target.value) || 1;
                                      const unitPrice = parseFloat(response.unit_price) || field.unit_price || 0;
                                      handleFieldChange(fieldId, 'quantity', qty);
                                      handleFieldChange(fieldId, 'price', qty * unitPrice);
                                    }}
                                    placeholder={field.default_quantity?.toString() || "1"}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`unit-price-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                    <DollarSign className="h-3 w-3" />
                                    Per Unit
                                  </Label>
                                  <Input
                                    id={`unit-price-${fieldId}`}
                                    type="number"
                                    step="0.01"
                                    min={field.allow_zero_price ? "0" : "0.01"}
                                    value={response.unit_price || field.unit_price || 0}
                                    onChange={(e) => {
                                      const unitPrice = parseFloat(e.target.value) || 0;
                                      const qty = parseInt(response.quantity) || field.default_quantity || 1;
                                      handleFieldChange(fieldId, 'unit_price', unitPrice);
                                      handleFieldChange(fieldId, 'price', qty * unitPrice);
                                    }}
                                    placeholder="0.00"
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                    <TrendingUp className="h-3 w-3" />
                                    Total
                                  </Label>
                                  <div className="h-8 text-sm bg-muted/30 rounded border flex items-center px-2 font-medium">
                                    £{((parseInt(response.quantity) || field.default_quantity || 1) * (parseFloat(response.unit_price) || field.unit_price || 0)).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ) : field.pricing_behavior !== 'none' ? (
                              <div>
                                <Label htmlFor={`price-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                  <DollarSign className="h-3 w-3" />
                                  Fixed Price (£)
                                </Label>
                                <Input
                                  id={`price-${fieldId}`}
                                  type="number"
                                  step="0.01"
                                  min={field.allow_zero_price ? "0" : "0.01"}
                                  value={response.price || field.unit_price || 0}
                                  onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="h-8 text-sm"
                                />
                              </div>
                            ) : null}
                            
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
                                  rows={1}
                                  className="h-8 text-sm resize-none"
                                />
                              </div>
                            )}
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
