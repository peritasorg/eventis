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
    const field = formStructure?.fields?.find(f => f.field_library.id === fieldId)?.field_library;
    
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
    
    updateEventMutation.mutate({
      form_responses: formResponses,
      form_total: formTotal
    });
    
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
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label htmlFor={`price-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                        <DollarSign className="h-3 w-3" />
                                        Price (£)
                                      </Label>
                                      <Input
                                        id={`price-${fieldId}`}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={response.price || 0}
                                        onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor={`quantity-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                        <Users className="h-3 w-3" />
                                        Quantity
                                      </Label>
                                      <Input
                                        id={`quantity-${fieldId}`}
                                        type="number"
                                        min="1"
                                        value={response.quantity || 1}
                                        onChange={(e) => handleFieldChange(fieldId, 'quantity', parseInt(e.target.value) || 1)}
                                        placeholder="1"
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
              {formStructure.fields.map((fieldInstance) => {
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
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor={`price-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                  <DollarSign className="h-3 w-3" />
                                  Price (£)
                                </Label>
                                <Input
                                  id={`price-${fieldId}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={response.price || 0}
                                  onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`quantity-${fieldId}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  Quantity
                                </Label>
                                <Input
                                  id={`quantity-${fieldId}`}
                                  type="number"
                                  min="1"
                                  value={response.quantity || 1}
                                  onChange={(e) => handleFieldChange(fieldId, 'quantity', parseInt(e.target.value) || 1)}
                                  placeholder="1"
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
