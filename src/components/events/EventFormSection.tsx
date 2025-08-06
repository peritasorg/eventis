import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FileText, DollarSign, MessageSquare, Save, Users, Type } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EventFormSectionProps {
  event: any;
}

export const EventFormSection: React.FC<EventFormSectionProps> = ({ event }) => {
  const { currentTenant } = useAuth();
  const [formResponses, setFormResponses] = useState<Record<string, any>>(event.form_responses || {});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Use the event's form_template_used as the selected form
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
          field_library (
            id,
            label,
            field_type,
            category,
            options,
            pricing_behavior,
            show_notes_field
          )
        `)
        .eq('form_template_id', selectedFormId)
        .eq('tenant_id', currentTenant.id)
        .order('field_order');
      
      if (error) {
        console.error('Form fields error:', error);
        return [];
      }
      
      // Filter out auto-created price/notes fields
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

  // Field-type specific handlers
  const handleToggleChange = (fieldId: string, enabled: boolean) => {
    const field = selectedFormFields?.find(f => f.field_library.id === fieldId)?.field_library;
    
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        enabled,
        price: enabled ? (formResponses[fieldId]?.price || 0) : 0,
        quantity: enabled ? (formResponses[fieldId]?.quantity || 1) : 1,
        notes: enabled ? (formResponses[fieldId]?.notes || '') : '',
        label: field?.label || ''
      }
    };
    
    setFormResponses(updatedResponses);
    setHasUnsavedChanges(true);
  };

  const handleTextChange = (fieldId: string, value: string) => {
    const field = selectedFormFields?.find(f => f.field_library.id === fieldId)?.field_library;
    
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        value,
        notes: formResponses[fieldId]?.notes || '',
        label: field?.label || ''
      }
    };
    
    setFormResponses(updatedResponses);
    setHasUnsavedChanges(true);
  };

  const handleNumberChange = (fieldId: string, value: number) => {
    const field = selectedFormFields?.find(f => f.field_library.id === fieldId)?.field_library;
    
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        value,
        price: formResponses[fieldId]?.price || 0,
        quantity: formResponses[fieldId]?.quantity || 1,
        notes: formResponses[fieldId]?.notes || '',
        label: field?.label || ''
      }
    };
    
    setFormResponses(updatedResponses);
    setHasUnsavedChanges(true);
  };

  const handleSelectChange = (fieldId: string, value: string) => {
    const field = selectedFormFields?.find(f => f.field_library.id === fieldId)?.field_library;
    
    const updatedResponses = {
      ...formResponses,
      [fieldId]: {
        value,
        price: formResponses[fieldId]?.price || 0,
        quantity: formResponses[fieldId]?.quantity || 1,
        notes: formResponses[fieldId]?.notes || '',
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
        label: fieldLabel
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
      const field = fieldInstance.field_library;
      const fieldId = field.id;
      const response = formResponses[fieldId];
      
      // Only calculate total for fields with pricing
      if (field.pricing_behavior && field.pricing_behavior !== 'none') {
        if (field.field_type === 'toggle' && response?.enabled) {
          const price = parseFloat(response.price) || 0;
          const quantity = field.pricing_behavior === 'per_person' ? (parseInt(response.quantity) || 1) : 1;
          return total + (price * quantity);
        } else if (field.field_type !== 'toggle' && response?.value !== undefined) {
          const price = parseFloat(response.price) || 0;
          const quantity = field.pricing_behavior === 'per_person' ? (parseInt(response.quantity) || 1) : 1;
          return total + (price * quantity);
        }
      }
      
      return total;
    }, 0);
  };

  const getFieldsForSummary = () => {
    if (!selectedFormFields) return [];
    
    return selectedFormFields
      .filter(fieldInstance => {
        const field = fieldInstance.field_library;
        const fieldId = field.id;
        const response = formResponses[fieldId];
        
        // Include field in summary if it has a value/is enabled
        if (field.field_type === 'toggle') {
          return response?.enabled === true;
        } else if (field.field_type === 'text') {
          return response?.value && response.value.trim() !== '';
        } else {
          return response?.value !== undefined && response?.value !== '';
        }
      })
      .map(fieldInstance => ({
        field: fieldInstance.field_library,
        response: formResponses[fieldInstance.field_library.id]
      }));
  };

  const renderFieldInput = (field: any, fieldId: string, response: any) => {
    const hasPricing = field.pricing_behavior && field.pricing_behavior !== 'none';
    const showNotes = field.show_notes_field === true;

    switch (field.field_type) {
      case 'text':
        return (
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                <Type className="h-3 w-3" />
                {field.label}
              </label>
              <Input
                type="text"
                value={response.value || ''}
                onChange={(e) => handleTextChange(fieldId, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                className="h-8 text-sm"
              />
            </div>
            
            {hasPricing && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                    <DollarSign className="h-3 w-3" />
                    {field.pricing_behavior === 'per_person' ? 'Per Person (£)' : 'Price (£)'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={response.price || 0}
                    onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-8 text-sm"
                  />
                </div>
                
                {field.pricing_behavior === 'per_person' && (
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                      <Users className="h-3 w-3" />
                      Quantity
                    </label>
                    <Input
                      type="number"
                      value={response.quantity || 1}
                      onChange={(e) => handleFieldChange(fieldId, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="1"
                      className="h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            )}
            
            {showNotes && (
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                  <MessageSquare className="h-3 w-3" />
                  Notes
                </label>
                <Textarea
                  value={response.notes || ''}
                  onChange={(e) => handleFieldChange(fieldId, 'notes', e.target.value)}
                  placeholder="Additional notes..."
                  rows={1}
                  className="text-xs resize-none"
                />
              </div>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                <Type className="h-3 w-3" />
                {field.label}
              </label>
              <Input
                type="number"
                value={response.value || ''}
                onChange={(e) => handleNumberChange(fieldId, parseFloat(e.target.value) || 0)}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                className="h-8 text-sm"
              />
            </div>
            
            {hasPricing && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                    <DollarSign className="h-3 w-3" />
                    {field.pricing_behavior === 'per_person' ? 'Per Person (£)' : 'Price (£)'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={response.price || 0}
                    onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-8 text-sm"
                  />
                </div>
                
                {field.pricing_behavior === 'per_person' && (
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                      <Users className="h-3 w-3" />
                      Quantity
                    </label>
                    <Input
                      type="number"
                      value={response.quantity || 1}
                      onChange={(e) => handleFieldChange(fieldId, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="1"
                      className="h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            )}
            
            {showNotes && (
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                  <MessageSquare className="h-3 w-3" />
                  Notes
                </label>
                <Textarea
                  value={response.notes || ''}
                  onChange={(e) => handleFieldChange(fieldId, 'notes', e.target.value)}
                  placeholder="Additional notes..."
                  rows={1}
                  className="text-xs resize-none"
                />
              </div>
            )}
          </div>
        );

      case 'select':
        const options = field.options ? JSON.parse(field.options) : [];
        return (
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                <Type className="h-3 w-3" />
                {field.label}
              </label>
              <Select value={response.value || ''} onValueChange={(value) => handleSelectChange(fieldId, value)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option: string, index: number) => (
                    <SelectItem key={index} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {hasPricing && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                    <DollarSign className="h-3 w-3" />
                    {field.pricing_behavior === 'per_person' ? 'Per Person (£)' : 'Price (£)'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={response.price || 0}
                    onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-8 text-sm"
                  />
                </div>
                
                {field.pricing_behavior === 'per_person' && (
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                      <Users className="h-3 w-3" />
                      Quantity
                    </label>
                    <Input
                      type="number"
                      value={response.quantity || 1}
                      onChange={(e) => handleFieldChange(fieldId, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="1"
                      className="h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            )}
            
            {showNotes && (
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                  <MessageSquare className="h-3 w-3" />
                  Notes
                </label>
                <Textarea
                  value={response.notes || ''}
                  onChange={(e) => handleFieldChange(fieldId, 'notes', e.target.value)}
                  placeholder="Additional notes..."
                  rows={1}
                  className="text-xs resize-none"
                />
              </div>
            )}
          </div>
        );

      case 'toggle':
      default:
        const isEnabled = response.enabled || false;
        return (
          <div className="flex items-start gap-3">
            <Switch
              checked={isEnabled}
              onCheckedChange={(enabled) => handleToggleChange(fieldId, enabled)}
              className="mt-0.5"
            />
            
            <div className="flex-1">
              {isEnabled && (
                <div className="space-y-3 mt-3">
                  {hasPricing && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                          <DollarSign className="h-3 w-3" />
                          {field.pricing_behavior === 'per_person' ? 'Per Person (£)' : 'Price (£)'}
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={response.price || 0}
                          onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      {field.pricing_behavior === 'per_person' && (
                        <div>
                          <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                            <Users className="h-3 w-3" />
                            Quantity
                          </label>
                          <Input
                            type="number"
                            value={response.quantity || 1}
                            onChange={(e) => handleFieldChange(fieldId, 'quantity', parseInt(e.target.value) || 1)}
                            placeholder="1"
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {showNotes && (
                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                        <MessageSquare className="h-3 w-3" />
                        Notes
                      </label>
                      <Textarea
                        value={response.notes || ''}
                        onChange={(e) => handleFieldChange(fieldId, 'notes', e.target.value)}
                        placeholder="Additional notes..."
                        rows={1}
                        className="text-xs resize-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Form Selection */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Form Template
          </h2>
        </div>
        <div className="p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Select Form Template</label>
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
            <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
              Currently using: {formTemplates?.find(t => t.id === selectedFormId)?.name || 'Unknown Template'}
            </div>
          )}
        </div>
      </div>

      {/* Form Fields */}
      {selectedFormFields && selectedFormFields.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Form Responses
              </h2>
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
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {selectedFormFields.map((fieldInstance) => {
                const field = fieldInstance.field_library;
                const fieldId = field.id;
                const response = formResponses[fieldId] || {};
                
                return (
                  <div key={fieldId} className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{field.label}</h4>
                      <div className="flex items-center gap-2">
                        <span className="bg-muted px-2 py-0.5 rounded text-xs">
                          {field.field_type}
                        </span>
                        {field.category && (
                          <span className="bg-muted px-2 py-0.5 rounded text-xs">
                            {field.category}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {renderFieldInput(field, fieldId, response)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Form Summary */}
      {getFieldsForSummary().length > 0 && (
        <div className="bg-card rounded-lg border border-green-200 shadow-sm">
          <div className="p-4 border-b border-green-200 bg-green-50">
            <h2 className="text-base font-semibold text-green-800 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Form Summary
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {getFieldsForSummary().map(({ field, response }) => (
                <div key={field.id} className="flex justify-between items-center py-2 border-b border-muted last:border-b-0">
                  <div className="flex-1">
                    <span className="font-medium text-sm">{field.label}</span>
                    {field.field_type === 'text' && response.value && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Value: {response.value}
                      </div>
                    )}
                    {field.field_type === 'number' && response.value !== undefined && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Value: {response.value}
                      </div>
                    )}
                    {field.field_type === 'select' && response.value && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Selected: {response.value}
                      </div>
                    )}
                    {response.notes && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Notes: {response.notes}
                      </div>
                    )}
                  </div>
                  {field.pricing_behavior && field.pricing_behavior !== 'none' && (
                    <div className="text-right">
                      <span className="font-semibold text-sm">
                        £{((parseFloat(response.price) || 0) * (field.pricing_behavior === 'per_person' ? (parseInt(response.quantity) || 1) : 1)).toFixed(2)}
                      </span>
                      {field.pricing_behavior === 'per_person' && response.quantity > 1 && (
                        <div className="text-xs text-muted-foreground">
                          {response.quantity} × £{(parseFloat(response.price) || 0).toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {calculateFormTotal() > 0 && (
                <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-green-600">
                  <span className="text-base font-bold">Total Amount</span>
                  <span className="text-xl font-bold text-green-600">
                    £{calculateFormTotal().toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};