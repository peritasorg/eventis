import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FileText, DollarSign, MessageSquare } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EventFormTabProps {
  event: any;
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ event }) => {
  const { currentTenant } = useAuth();
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [formResponses, setFormResponses] = useState<Record<string, any>>(event.form_responses || {});

  // Set the active form ID based on what's already loaded or selected
  const activeFormId = event.form_template_used || selectedFormId;

  useEffect(() => {
    if (event.form_template_used) {
      setSelectedFormId(event.form_template_used);
    }
  }, [event.form_template_used]);

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
    ['form-fields', activeFormId],
    async () => {
      if (!activeFormId || !currentTenant?.id) return [];
      
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
        .eq('form_template_id', activeFormId)
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

  const handleLoadForm = () => {
    if (!selectedFormId) {
      toast.error('Please select a form template');
      return;
    }
    
    updateEventMutation.mutate({
      form_template_used: selectedFormId
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
    
    const formTotal = Object.values(updatedResponses).reduce((total: number, response: any) => {
      return total + (response?.enabled ? (parseFloat(response?.price) || 0) : 0);
    }, 0);
    
    updateEventMutation.mutate({
      form_responses: updatedResponses,
      form_total: formTotal
    });
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
    
    if (field === 'price') {
      const formTotal = Object.values(updatedResponses).reduce((total: number, response: any) => {
        return total + (response?.enabled ? (parseFloat(response?.price) || 0) : 0);
      }, 0);
      
      updateEventMutation.mutate({
        form_responses: updatedResponses,
        form_total: formTotal
      });
    } else {
      updateEventMutation.mutate({
        form_responses: updatedResponses
      });
    }
  };

  const calculateFormTotal = () => {
    return Object.values(formResponses).reduce((total: number, response: any) => {
      return total + (response?.enabled ? (parseFloat(response?.price) || 0) : 0);
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
              <Select value={selectedFormId} onValueChange={setSelectedFormId}>
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
            <Button 
              onClick={handleLoadForm} 
              disabled={!selectedFormId || selectedFormId === event.form_template_used} 
              size="sm"
            >
              {selectedFormId === event.form_template_used ? 'Loaded' : 'Load Form'}
            </Button>
          </div>
          
          {event.form_template_used && (
            <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-800">
              Currently using: {formTemplates?.find(t => t.id === event.form_template_used)?.name || 'Unknown Template'}
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
              <div className="text-base font-bold text-green-600">
                Total: £{calculateFormTotal().toLocaleString()}
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

      {/* Summary - Only show if there are enabled fields from current form */}
      {getEnabledFieldsForSummary().length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Form Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {getEnabledFieldsForSummary().map(({ field, response }) => (
                <div key={field.id} className="flex justify-between items-center py-1 text-sm border-b">
                  <span>{field.label}</span>
                  <span className="font-medium">£{(response.price || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 text-base font-bold border-t-2">
                <span>Total</span>
                <span className="text-green-600">£{calculateFormTotal().toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
