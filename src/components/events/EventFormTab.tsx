import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FileText, DollarSign, MessageSquare, Save } from 'lucide-react';
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

  // ... keep existing code (form templates query)

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

  // ... keep existing code (selected form fields query)

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
          field_library (
            id,
            label,
            field_type,
            category,
            help_text,
            price_modifier
          )
        `)
        .eq('form_template_id', selectedFormId)
        .eq('tenant_id', currentTenant.id)
        .order('field_order');
      
      if (error) {
        console.error('Form fields error:', error);
        return [];
      }
      
      // Filter out auto-created price/notes fields - we only want the main fields
      const mainFields = (data || []).filter(field => {
        const label = field.field_library?.label || '';
        return !label.toLowerCase().includes(' price') && !label.toLowerCase().includes(' notes');
      });
      
      return mainFields;
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
    
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        enabled,
        price: enabled ? (formResponses[fieldId]?.price || field?.price_modifier || 0) : 0,
        notes: enabled ? (formResponses[fieldId]?.notes || '') : ''
      }
    };
    
    setFormResponses(updatedResponses);
    setHasUnsavedChanges(true);
  };

  const handleFieldChange = (fieldId: string, field: string, value: string | number) => {
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        ...formResponses[fieldId],
        [field]: value
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Form Template Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="form_template" className="text-sm">Select Form Template</Label>
              <Select value={selectedFormId} onValueChange={handleLoadForm}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose a form template..." />
                </SelectTrigger>
                <SelectContent>
                  {formTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.description && (
                        <span className="text-gray-500 ml-2">- {template.description}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedFormId && (
            <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-800">
              Currently using: {formTemplates?.find(t => t.id === selectedFormId)?.name || 'Unknown Template'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Fields */}
      {selectedFormFields && selectedFormFields.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Form Responses
              </div>
              <div className="flex items-center gap-3">
                <div className="text-base font-bold text-green-600">
                  Total: £{calculateFormTotal().toFixed(2)}
                </div>
                {hasUnsavedChanges && (
                  <Button 
                    onClick={handleSaveChanges}
                    disabled={updateEventMutation.isPending}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedFormFields.map((fieldInstance) => {
                const field = fieldInstance.field_library;
                const fieldId = field.id;
                const response = formResponses[fieldId] || {};
                const isEnabled = response.enabled || false;
                
                return (
                  <div key={fieldId} className="border rounded p-3">
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
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                              {field.category}
                            </span>
                          )}
                        </div>
                        
                        {field.help_text && (
                          <p className="text-xs text-gray-600 mb-2">{field.help_text}</p>
                        )}
                        
                        {isEnabled && (
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                              <Label htmlFor={`price-${fieldId}`} className="flex items-center gap-1 text-xs">
                                <DollarSign className="h-3 w-3" />
                                Price (£)
                              </Label>
                              <Input
                                id={`price-${fieldId}`}
                                type="number"
                                step="0.01"
                                value={response.price || field.price_modifier || 0}
                                onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="h-8"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor={`notes-${fieldId}`} className="flex items-center gap-1 text-xs">
                                <MessageSquare className="h-3 w-3" />
                                Notes
                              </Label>
                              <Textarea
                                id={`notes-${fieldId}`}
                                value={response.notes || ''}
                                onChange={(e) => handleFieldChange(fieldId, 'notes', e.target.value)}
                                placeholder="Additional notes..."
                                rows={1}
                                className="text-xs"
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
        <Card className="border-2 border-green-200">
          <CardHeader className="pb-3 bg-green-50">
            <CardTitle className="text-lg flex items-center gap-2 text-green-800">
              <DollarSign className="h-5 w-5" />
              Form Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {getEnabledFieldsForSummary().map(({ field, response }) => (
                <div key={field.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{field.label}</span>
                    {response.notes && (
                      <div className="text-xs text-gray-500 mt-1">
                        {response.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">
                      £{(parseFloat(response.price) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-green-600">
                <span className="text-lg font-bold text-gray-900">Total Amount</span>
                <span className="text-2xl font-bold text-green-600">
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
