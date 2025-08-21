import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Settings, Eye } from 'lucide-react';
import { useCalendarSyncConfigs } from '@/hooks/useCalendarSyncConfigs';
import { useFormFields } from '@/hooks/useFormFields';
import { Textarea } from '@/components/ui/textarea';

export const CalendarSyncSettings = () => {
  const { 
    configs, 
    eventTypes, 
    forms, 
    saveConfig, 
    deleteConfig, 
    isSaving, 
    getConfigForEventType 
  } = useCalendarSyncConfigs();
  
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [showPricingFieldsOnly, setShowPricingFieldsOnly] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const formFields = useFormFields();

  // Load existing config when event type and form are selected
  React.useEffect(() => {
    if (selectedEventType && selectedForm) {
      const existingConfig = getConfigForEventType(selectedEventType, selectedForm);
      if (existingConfig) {
        setSelectedFields(existingConfig.selected_fields);
        setShowPricingFieldsOnly(existingConfig.show_pricing_fields_only);
      } else {
        setSelectedFields([]);
        setShowPricingFieldsOnly(false);
      }
    }
  }, [selectedEventType, selectedForm, getConfigForEventType]);

  const availableFields = useMemo(() => {
    // Get fields from the hook properly
    const fieldsData = formFields?.formFields || [];
    
    // Filter fields for display
    const fieldsForForm = fieldsData.filter(field => 
      field.field_type !== 'section_header' && 
      field.field_type !== 'spacer'
    );
    
    return fieldsForForm;
  }, [formFields]);

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    if (checked) {
      setSelectedFields(prev => [...prev, fieldId]);
    } else {
      setSelectedFields(prev => prev.filter(id => id !== fieldId));
    }
  };

  const handleSave = async () => {
    if (!selectedEventType || !selectedForm) return;

    try {
      await saveConfig({
        eventTypeConfigId: selectedEventType,
        formId: selectedForm,
        selectedFields,
        showPricingFieldsOnly
      });
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const generatePreview = () => {
    const selectedEventTypeObj = eventTypes?.find(et => et.id === selectedEventType);
    const selectedFormObj = forms?.find(f => f.id === selectedForm);
    const selectedFieldObjs = availableFields.filter(field => selectedFields.includes(field.id));

    if (!selectedEventTypeObj || !selectedFormObj) return '';

    let preview = `Event Title\nEvent Date & Time\n\nPrimary Contact: [Contact Name]\nPrimary Contact No.: [Contact Number]\n\n`;
    
    preview += `${selectedEventTypeObj.display_name} - [Time Slot]:\n`;
    preview += `Men Count: [Men Count]\n`;
    preview += `Ladies Count: [Ladies Count]\n\n`;

    selectedFieldObjs.forEach(field => {
      if (field.field_type === 'toggle') {
        preview += `${field.name} - [Yes/No] - [Notes]`;
        if (showPricingFieldsOnly) {
          preview += ` (Only shown if has pricing or notes)`;
        }
      } else if (field.field_type === 'textarea' || field.field_type === 'text') {
        preview += `${field.name} - [Value]`;
        if (showPricingFieldsOnly) {
          preview += ` (Only shown if has pricing or notes)`;
        }
      } else {
        preview += `${field.name} - [Value]`;
      }
      preview += '\n';
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
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

            <div className="space-y-2">
              <Label htmlFor="form">Form Template</Label>
              <Select value={selectedForm} onValueChange={setSelectedForm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select form template" />
                </SelectTrigger>
                <SelectContent>
                  {forms?.map(form => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedEventType && selectedForm && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pricingOnly"
                  checked={showPricingFieldsOnly}
                  onCheckedChange={(checked) => setShowPricingFieldsOnly(checked === true)}
                />
                <Label htmlFor="pricingOnly">
                  Only show fields with pricing or notes in calendar
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Select Fields to Include in Calendar Description</Label>
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Standard fields (title, date, contact info, guest counts) are always included.
                    Select additional form fields to display below.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-4 border rounded">
                  {availableFields.map(field => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={(checked) => handleFieldToggle(field.id, !!checked)}
                      />
                      <Label htmlFor={field.id} className="text-sm">
                        {field.name} ({field.field_type})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Configuration'}
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
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>
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
                const form = forms?.find(f => f.id === config.form_id);
                
                return (
                  <div key={config.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">
                        {eventType?.display_name} - {form?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {config.selected_fields.length} fields selected
                        {config.show_pricing_fields_only && ' (Pricing fields only)'}
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