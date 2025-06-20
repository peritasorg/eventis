
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, FileText, DollarSign, MessageSquare } from 'lucide-react';
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
  const [formResponses, setFormResponses] = useState(event.form_responses || {});

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
          *,
          field_library (*)
        `)
        .eq('form_template_id', selectedFormId)
        .eq('tenant_id', currentTenant.id)
        .order('field_order');
      
      if (error) {
        console.error('Form fields error:', error);
        return [];
      }
      
      return data || [];
    },
    {
      enabled: !!selectedFormId
    }
  );

  const updateEventMutation = useSupabaseMutation(
    async (updates: any) => {
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
    
    // Load the selected form template
    updateEventMutation.mutate({
      form_template_used: selectedFormId
    });
  };

  const handleToggleChange = (fieldId: string, enabled: boolean) => {
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        ...formResponses[fieldId],
        enabled,
        price: enabled ? (formResponses[fieldId]?.price || 0) : 0,
        notes: enabled ? (formResponses[fieldId]?.notes || '') : ''
      }
    };
    
    setFormResponses(updatedResponses);
    
    // Calculate new form total
    const formTotal = Object.values(updatedResponses).reduce((total: number, response: any) => {
      return total + (response?.enabled ? (parseFloat(response?.price) || 0) : 0);
    }, 0);
    
    // Update event with new form responses and total
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
    
    // If it's a price change, recalculate total
    if (field === 'price') {
      const formTotal = Object.values(updatedResponses).reduce((total: number, response: any) => {
        return total + (response?.enabled ? (parseFloat(response?.price) || 0) : 0);
      }, 0);
      
      updateEventMutation.mutate({
        form_responses: updatedResponses,
        form_total: formTotal
      });
    } else {
      // For notes, just update the responses
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

  return (
    <div className="space-y-6">
      {/* Form Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Form Template Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="form_template">Select Form Template</Label>
              <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                <SelectTrigger>
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
            <Button onClick={handleLoadForm} disabled={!selectedFormId}>
              Load Form
            </Button>
          </div>
          
          {event.form_template_used && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                Currently using: {formTemplates?.find(t => t.id === event.form_template_used)?.name || 'Unknown Template'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Fields */}
      {selectedFormFields && selectedFormFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Form Responses
              </div>
              <div className="text-lg font-bold text-green-600">
                Total: £{calculateFormTotal().toLocaleString()}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {selectedFormFields.map((fieldInstance) => {
                const field = fieldInstance.field_library;
                const fieldId = field.id;
                const response = formResponses[fieldId] || {};
                const isEnabled = response.enabled || false;
                
                return (
                  <div key={fieldId} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(enabled) => handleToggleChange(fieldId, enabled)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{field.label}</h4>
                          <div className="text-sm text-gray-500">
                            {field.category && (
                              <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                {field.category}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {field.help_text && (
                          <p className="text-sm text-gray-600 mb-3">{field.help_text}</p>
                        )}
                        
                        {isEnabled && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label htmlFor={`price-${fieldId}`} className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Price (£)
                              </Label>
                              <Input
                                id={`price-${fieldId}`}
                                type="number"
                                step="0.01"
                                value={response.price || field.price_modifier || 0}
                                onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor={`notes-${fieldId}`} className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Notes
                              </Label>
                              <Textarea
                                id={`notes-${fieldId}`}
                                value={response.notes || ''}
                                onChange={(e) => handleFieldChange(fieldId, 'notes', e.target.value)}
                                placeholder="Additional notes or specifications..."
                                rows={2}
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

      {/* Summary */}
      {Object.keys(formResponses).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Form Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(formResponses)
                .filter(([_, response]: [string, any]) => response.enabled)
                .map(([fieldId, response]: [string, any]) => {
                  const field = selectedFormFields?.find(f => f.field_library.id === fieldId)?.field_library;
                  return (
                    <div key={fieldId} className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">{field?.label}</span>
                      <span className="font-bold">£{(response.price || 0).toLocaleString()}</span>
                    </div>
                  );
                })}
              <div className="flex justify-between items-center py-2 text-lg font-bold border-t-2">
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
