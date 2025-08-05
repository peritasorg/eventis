import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight, Edit3, Trash2, DollarSign, MessageSquare } from 'lucide-react';

interface FormField {
  id: string;
  label: string;
  field_type: string;
  category?: string;
  help_text?: string;
  options?: any[];
  required?: boolean;
}

interface FormSectionData {
  id: string;
  section_title: string;
  section_description?: string;
  collapsed?: boolean;
}

interface UnifiedFormSectionProps {
  section: FormSectionData;
  fields: Array<{
    id: string;
    field_library: FormField;
    field_order: number;
  }>;
  mode: 'builder' | 'event'; // builder = form builder preview, event = event form responses
  formResponses?: Record<string, any>; // Only for event mode
  onFieldChange?: (fieldId: string, field: string, value: any) => void; // Only for event mode
  onToggleChange?: (fieldId: string, enabled: boolean) => void; // Only for event mode
  onEditField?: (field: any) => void; // Only for builder mode
  onDeleteField?: (fieldId: string) => void; // Only for builder mode
  onToggleSection?: (sectionId: string) => void; // For collapsing sections
}

export const UnifiedFormSection: React.FC<UnifiedFormSectionProps> = ({
  section,
  fields,
  mode,
  formResponses = {},
  onFieldChange,
  onToggleChange,
  onEditField,
  onDeleteField,
  onToggleSection
}) => {
  const renderField = (fieldInstance: any) => {
    const field = fieldInstance.field_library;
    const fieldId = field.id;
    const response = formResponses[fieldId] || {};
    const isEnabled = response.enabled || false;

    return (
      <div key={fieldId} className="border rounded-lg p-3 bg-muted/30">
        {mode === 'event' ? (
          // Event mode - show form responses interface
          <div className="flex items-start gap-3">
            <Switch
              checked={isEnabled}
              onCheckedChange={(enabled) => onToggleChange?.(fieldId, enabled)}
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

              {/* Field input based on type */}
              {isEnabled && field.field_type === 'select' && (
                <div className="mb-3">
                  <Select 
                    value={response.value || ''} 
                    onValueChange={(value) => onFieldChange?.(fieldId, 'value', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select an option..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option, index) => (
                        <SelectItem key={index} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isEnabled && field.field_type === 'number' && (
                <div className="mb-3">
                  <Input
                    type="number"
                    value={response.value || ''}
                    onChange={(e) => onFieldChange?.(fieldId, 'value', e.target.value)}
                    placeholder="Enter number..."
                    className="h-8"
                  />
                </div>
              )}
              
              {/* Pricing section - always available when enabled */}
              {isEnabled && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                      Pricing Type
                    </label>
                    <Select 
                      value={response.pricing_type || 'fixed'} 
                      onValueChange={(value) => onFieldChange?.(fieldId, 'pricing_type', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Price</SelectItem>
                        <SelectItem value="per_person">Per Person</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {response.pricing_type === 'per_person' ? (
                    <>
                      <div>
                        <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                          Quantity
                        </label>
                        <Input
                          type="number"
                          value={response.quantity || 1}
                          onChange={(e) => onFieldChange?.(fieldId, 'quantity', parseInt(e.target.value) || 1)}
                          className="h-8 text-sm"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                          <DollarSign className="h-3 w-3" />
                          Per Unit (£)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={response.unit_price || 0}
                          onChange={(e) => onFieldChange?.(fieldId, 'unit_price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                          Total (£)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={(response.quantity || 1) * (response.unit_price || 0)}
                          disabled
                          className="h-8 text-sm bg-muted"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                        <DollarSign className="h-3 w-3" />
                        Price (£)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={response.price || 0}
                        onChange={(e) => onFieldChange?.(fieldId, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                      <MessageSquare className="h-3 w-3" />
                      Notes
                    </label>
                    <Textarea
                      value={response.notes || ''}
                      onChange={(e) => onFieldChange?.(fieldId, 'notes', e.target.value)}
                      placeholder="Additional notes..."
                      rows={1}
                      className="text-xs resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Builder mode - show field preview with edit controls
          <div className="group">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{field.label}</h4>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditField?.(fieldInstance)}
                  className="h-6 w-6 p-0"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteField?.(fieldId)}
                  className="h-6 w-6 p-0 text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              Type: {field.field_type} {field.category && `• Category: ${field.category}`}
            </div>
            
            {field.help_text && (
              <p className="text-xs text-muted-foreground mb-2">{field.help_text}</p>
            )}

            {/* Field preview based on type */}
            {field.field_type === 'toggle' && (
              <div className="flex items-center gap-2">
                <Switch disabled />
                <span className="text-sm">Yes/No toggle</span>
              </div>
            )}

            {field.field_type === 'number' && (
              <Input
                type="number"
                placeholder="Enter number..."
                disabled
                className="h-8"
              />
            )}

            {field.field_type === 'select' && (
              <Select disabled>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={field.options?.[0] || "Select an option..."} />
                </SelectTrigger>
              </Select>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleSection?.(section.id)}
              className="h-6 w-6 p-0"
            >
              {section.collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <CardTitle className="text-base">{section.section_title}</CardTitle>
          </div>
        </div>
        {section.section_description && !section.collapsed && (
          <p className="text-sm text-muted-foreground">{section.section_description}</p>
        )}
      </CardHeader>
      
      {!section.collapsed && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {fields
              .sort((a, b) => a.field_order - b.field_order)
              .map(renderField)}
          </div>
        </CardContent>
      )}
    </Card>
  );
};