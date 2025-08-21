import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Settings, Eye, Loader2 } from 'lucide-react';
import { useCalendarSyncConfigs } from '@/hooks/useCalendarSyncConfigs';
import { useFormFields } from '@/hooks/useFormFields';
import { useEventTypeFormMappingsForCreation } from '@/hooks/useEventTypeFormMappings';
import { Textarea } from '@/components/ui/textarea';

export const CalendarSyncSettings = () => {
  const { 
    configs, 
    eventTypes, 
    saveConfig, 
    deleteConfig, 
    isSaving, 
    getConfigForEventType 
  } = useCalendarSyncConfigs();
  
  const { getFormMappingsForEventType } = useEventTypeFormMappingsForCreation();
  const formFields = useFormFields();
  
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [assignedForms, setAssignedForms] = useState<any[]>([]);
  const [formConfigs, setFormConfigs] = useState<Record<string, {
    selectedFields: string[];
    showPricingFieldsOnly: boolean;
  }>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);

  // Load assigned forms when event type is selected
  const loadAssignedForms = useCallback(async () => {
    if (!selectedEventType || !eventTypes?.length) {
      setAssignedForms([]);
      setFormConfigs({});
      return;
    }

    setIsLoadingConfigs(true);
    try {
      const eventTypeConfig = eventTypes?.find(et => et.id === selectedEventType);
      if (!eventTypeConfig) return;

      const mappings = await getFormMappingsForEventType(eventTypeConfig.event_type);
      setAssignedForms(mappings);
      
      // Initialize form configs with empty state - configs will be loaded separately
      const newFormConfigs: Record<string, any> = {};
      for (const mapping of mappings) {
        if (mapping.forms?.id) {
          newFormConfigs[mapping.forms.id] = {
            selectedFields: [],
            showPricingFieldsOnly: false
          };
        }
      }
      setFormConfigs(newFormConfigs);
    } catch (error) {
      console.error('Error loading assigned forms:', error);
    } finally {
      setIsLoadingConfigs(false);
    }
  }, [selectedEventType, eventTypes?.length, getFormMappingsForEventType]);

  // Load forms when event type is selected (only on event type change, not config changes)
  useEffect(() => {
    if (selectedEventType && eventTypes?.length) {
      loadAssignedForms();
    }
  }, [selectedEventType, eventTypes?.length, loadAssignedForms]);

  // Load existing configurations when configs or assigned forms change
  useEffect(() => {
    if (configs && assignedForms.length > 0 && selectedEventType) {
      console.log('Loading existing configs for selectedEventType:', selectedEventType);
      console.log('Available configs:', configs);
      console.log('Assigned forms:', assignedForms);
      
      const newFormConfigs: Record<string, any> = {};
      for (const mapping of assignedForms) {
        if (mapping.forms?.id) {
          // Find config by matching the event_type_config_id (which should be a UUID)
          const existingConfig = configs.find(config => 
            config.event_type_config_id === selectedEventType && 
            config.form_id === mapping.forms.id &&
            config.is_active
          );
          
          console.log(`Looking for config with event_type_config_id: ${selectedEventType}, form_id: ${mapping.forms.id}`);
          console.log('Found existing config:', existingConfig);
          
          newFormConfigs[mapping.forms.id] = {
            selectedFields: existingConfig?.selected_fields || [],
            showPricingFieldsOnly: existingConfig?.show_pricing_fields_only || false
          };
        }
      }
      console.log('Setting form configs:', newFormConfigs);
      setFormConfigs(newFormConfigs);
    }
  }, [configs, assignedForms, selectedEventType]);

  // Reset configs when event type changes  
  useEffect(() => {
    if (!selectedEventType) {
      setAssignedForms([]);
      setFormConfigs({});
    }
  }, [selectedEventType]);

  // Get form-specific fields based on assigned forms
  const getFormSpecificFields = useCallback((formId: string) => {
    const fieldsData = formFields?.formFields || [];
    
    // For now, return all available fields since we don't have form-field associations
    // TODO: Filter by actual form-field relationships when available
    const fieldsForForm = fieldsData.filter(field => 
      field.field_type !== 'section_header' && 
      field.field_type !== 'spacer' &&
      field.is_active
    );
    
    return fieldsForForm;
  }, [formFields]);

  const handleFieldToggle = useCallback((formId: string, fieldId: string, checked: boolean) => {
    setFormConfigs(prev => {
      const currentFormConfig = prev[formId] || { selectedFields: [], showPricingFieldsOnly: false };
      const updatedFields = checked 
        ? [...currentFormConfig.selectedFields.filter(id => id !== fieldId), fieldId]
        : currentFormConfig.selectedFields.filter(id => id !== fieldId);
      
      return {
        ...prev,
        [formId]: {
          ...currentFormConfig,
          selectedFields: updatedFields
        }
      };
    });
  }, []);

  const handlePricingOnlyToggle = useCallback((formId: string, checked: boolean) => {
    setFormConfigs(prev => ({
      ...prev,
      [formId]: {
        ...(prev[formId] || { selectedFields: [] }),
        showPricingFieldsOnly: checked
      }
    }));
  }, []);

  const handleSave = async () => {
    if (!selectedEventType || assignedForms.length === 0) return;

    try {
      // Save configuration for each assigned form that has selected fields
      const savePromises = assignedForms
        .filter(mapping => mapping.forms?.id && formConfigs[mapping.forms.id]?.selectedFields.length > 0)
        .map(mapping => {
          const config = formConfigs[mapping.forms.id];
          return saveConfig({
            eventTypeConfigId: selectedEventType,
            formId: mapping.forms.id,
            selectedFields: config.selectedFields,
            showPricingFieldsOnly: config.showPricingFieldsOnly
          });
        });

      await Promise.all(savePromises);
      
      // Configs will automatically refresh via query invalidation
      
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const generatePreview = () => {
    const selectedEventTypeObj = eventTypes?.find(et => et.id === selectedEventType);
    if (!selectedEventTypeObj || assignedForms.length === 0) return '';

    let preview = `${selectedEventTypeObj.display_name} Event\nEvent Date, Start Time - End Time\n\nPrimary Contact: [Contact Name]\nPrimary Contact No.: [Contact Number]\n\n`;
    
    assignedForms.forEach((mapping, index) => {
      if (!mapping.forms?.id) return;
      
      const config = formConfigs[mapping.forms.id];
      const formFields = getFormSpecificFields(mapping.forms.id);
      const selectedFieldObjs = formFields.filter(field => 
        config?.selectedFields.includes(field.id)
      );

      preview += `${mapping.forms.name} - [Time Slot]:\n`;
      preview += `Men Count: [Men Count]\n`;
      preview += `Ladies Count: [Ladies Count]\n`;
      preview += `Guest Mix: [Guest Mix]\n\n`;

      // Display fields in the order they were selected
      config?.selectedFields.forEach(fieldId => {
        const field = formFields.find(f => f.id === fieldId);
        if (field) {
          if (field.field_type.includes('toggle')) {
            preview += `${field.name} - [Yes/No] - [Notes]`;
          } else {
            preview += `${field.name} - [Notes]`;
          }
          if (config?.showPricingFieldsOnly) {
            preview += ` !!ONLY SHOW IF THERE IS A PRICE or NOTES value!!`;
          }
          preview += '\n';
        }
      });

      if (index < assignedForms.length - 1) {
        preview += '\n------------------------------------------------------------\n\n';
      }
    });

    return preview;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Sync Field Configuration
          </CardTitle>
          <CardDescription>
            Configure which form fields appear in Google Calendar event descriptions for each event type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type</Label>
            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger>
                <SelectValue placeholder="Select event type to configure" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes?.map(eventType => (
                  <SelectItem key={eventType.id} value={eventType.id}>
                    {eventType.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEventType && assignedForms.length > 0 && (
            <div className="space-y-6">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Configure which fields appear in Google Calendar descriptions for each form assigned to this event type.
                  Standard fields (title, date, contact info, guest counts) are always included.
                </AlertDescription>
              </Alert>

              {assignedForms.map(mapping => {
                const form = mapping.forms;
                if (!form?.id) return null;
                
                const config = formConfigs[form.id] || { selectedFields: [], showPricingFieldsOnly: false };
                
                return (
                  <Card key={form.id} className="border-l-4 border-l-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg">{form.name} Form Configuration</CardTitle>
                      <CardDescription>
                        Configure calendar sync settings for the {form.name} form
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`pricingOnly-${form.id}`}
                          checked={config.showPricingFieldsOnly}
                          onCheckedChange={(checked) => handlePricingOnlyToggle(form.id, checked === true)}
                        />
                        <Label htmlFor={`pricingOnly-${form.id}`}>
                          Only show fields with pricing or notes in calendar
                        </Label>
                      </div>

                       <div className="space-y-2">
                         <Label>Select Fields to Include in Calendar Description</Label>
                         {isLoadingConfigs ? (
                           <div className="flex items-center justify-center p-8">
                             <Loader2 className="h-4 w-4 animate-spin" />
                             <span className="ml-2">Loading field configurations...</span>
                           </div>
                         ) : (
                           <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 border rounded">
                             {getFormSpecificFields(form.id).map(field => (
                               <div key={`${form.id}-${field.id}`} className="flex items-center space-x-2">
                                 <Checkbox
                                   id={`${form.id}-${field.id}`}
                                   checked={config.selectedFields.includes(field.id)}
                                   onCheckedChange={(checked) => handleFieldToggle(form.id, field.id, !!checked)}
                                 />
                                 <Label htmlFor={`${form.id}-${field.id}`} className="text-sm">
                                   {field.name} ({field.field_type})
                                 </Label>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save All Configurations'}
                </Button>
                <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>

              {showPreview && (
                <div className="space-y-2">
                  <Label>Calendar Description Preview</Label>
                  <Textarea
                    value={generatePreview()}
                    readOnly
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {selectedEventType && assignedForms.length === 0 && (
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                No forms are assigned to this event type. Please assign forms in the Event Types configuration first.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Configurations</CardTitle>
          <CardDescription>
            Manage existing calendar sync configurations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configs && configs.length > 0 ? (
            <div className="space-y-2">
              {configs.map(config => {
                const eventType = eventTypes?.find(et => et.id === config.event_type_config_id);
                const formName = config.form?.name || `Form ${config.form_id?.slice(0, 8)}...`;
                
                return (
                  <div key={config.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">
                        {eventType?.display_name || 'Unknown Event Type'} - {formName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {config.selected_fields?.length || 0} fields selected
                        {config.show_pricing_fields_only && ' (Pricing fields only)'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Fields: {config.selected_fields?.slice(0, 3).join(', ')}
                        {config.selected_fields?.length > 3 && '...'}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteConfig(config.id)}
                    >
                      Delete
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">No configurations created yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};