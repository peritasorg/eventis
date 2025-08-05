import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, MessageSquare, Users, TrendingUp, X } from 'lucide-react';

interface FormPreviewModeProps {
  formFields: any[];
  formResponses?: Record<string, any>;
  onResponseChange?: (fieldId: string, field: string, value: any) => void;
  readOnly?: boolean;
  removeFieldMutation?: any;
}

export const FormPreviewMode: React.FC<FormPreviewModeProps> = ({ 
  formFields, 
  formResponses = {}, 
  onResponseChange,
  readOnly = true,
  removeFieldMutation
}) => {
  const handleToggleChange = (fieldId: string, enabled: boolean) => {
    if (onResponseChange) {
      onResponseChange(fieldId, 'enabled', enabled);
      if (!enabled) {
        onResponseChange(fieldId, 'price', 0);
        onResponseChange(fieldId, 'notes', '');
      }
    }
  };

  const handleFieldChange = (fieldId: string, field: string, value: any) => {
    if (onResponseChange) {
      onResponseChange(fieldId, field, value);
    }
  };

  const renderFieldInput = (field: any) => {
    switch (field.field_type) {
      case 'text':
        return (
          <Input
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className="h-8 text-sm"
            disabled={readOnly}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder || "Enter number"}
            className="h-8 text-sm"
            disabled={readOnly}
          />
        );
      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            rows={3}
            className="text-sm resize-none"
            disabled={readOnly}
          />
        );
      case 'select':
        return (
          <Select disabled={readOnly}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded"
              disabled={readOnly}
            />
            <span className="text-sm">Enable this option</span>
          </div>
        );
      default:
        return (
          <Input
            placeholder={field.placeholder || "Enter value"}
            className="h-8 text-sm"
            disabled={readOnly}
          />
        );
    }
  };

  if (formFields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No fields in this form yet.</p>
        <p className="text-xs mt-1">Add fields from the library to see the preview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        This preview shows how the form will appear when used in event records, including pricing controls and notes.
      </div>

      {formFields.map((fieldInstance) => {
        const field = fieldInstance.field_library || fieldInstance;
        const fieldId = field.id;
        const response = formResponses[fieldId] || {};
        const isEnabled = response.enabled || false;

        return (
          <div key={fieldId} className="border rounded-md p-4">
            <div className="flex items-start gap-3">
              {/* Enable/Disable Toggle */}
              <Switch
                checked={isEnabled}
                onCheckedChange={(enabled) => handleToggleChange(fieldId, enabled)}
                className="mt-0.5"
                disabled={readOnly}
              />
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{field.label}</h4>
                  <div className="flex items-center gap-2">
                    {field.category && (
                      <Badge variant="secondary" className="text-xs">
                        {field.category}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">
                      {field.field_type === 'checkbox' ? 'Toggle' : field.field_type === 'select' ? 'Dropdown' : field.field_type.replace('_', ' ')}
                    </Badge>
                    {!readOnly && (
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFieldMutation?.mutate?.(fieldInstance.id)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {field.help_text && (
                  <p className="text-xs text-muted-foreground mb-3">{field.help_text}</p>
                )}

                {/* Field Input */}
                <div className="mb-3">
                  {renderFieldInput(field)}
                </div>
                
                {/* Pricing and Notes - Only show when enabled */}
                {isEnabled && (
                  <div className="space-y-3 pt-3 border-t border-muted">
                    {/* Pricing Type Selection */}
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Pricing Type
                      </Label>
                      <Select
                        value={response.pricing_type || 'fixed'}
                        onValueChange={(value) => handleFieldChange(fieldId, 'pricing_type', value)}
                        disabled={readOnly}
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

                    {/* Pricing Inputs */}
                    {response.pricing_type === 'per_person' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Users className="h-3 w-3" />
                            Quantity
                          </Label>
                          <Input
                            type="number"
                            value={response.quantity || 1}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 1;
                              const unitPrice = parseFloat(response.unit_price) || 0;
                              handleFieldChange(fieldId, 'quantity', qty);
                              handleFieldChange(fieldId, 'price', qty * unitPrice);
                            }}
                            placeholder="1"
                            className="h-8 text-sm"
                            disabled={readOnly}
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            Per Unit
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={response.unit_price || field.price_modifier || 0}
                            onChange={(e) => {
                              const unitPrice = parseFloat(e.target.value) || 0;
                              const qty = parseInt(response.quantity) || 1;
                              handleFieldChange(fieldId, 'unit_price', unitPrice);
                              handleFieldChange(fieldId, 'price', qty * unitPrice);
                            }}
                            placeholder="0.00"
                            className="h-8 text-sm"
                            disabled={readOnly}
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            Total
                          </Label>
                          <div className="h-8 text-sm bg-muted/30 rounded border flex items-center px-2 font-medium">
                            £{((parseInt(response.quantity) || 1) * (parseFloat(response.unit_price) || 0)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          Fixed Price (£)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={response.price || field.price_modifier || 0}
                          onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="h-8 text-sm"
                          disabled={readOnly}
                        />
                      </div>
                    )}
                    
                    {/* Notes */}
                    <div>
                      <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        Notes
                      </Label>
                      <Textarea
                        value={response.notes || ''}
                        onChange={(e) => handleFieldChange(fieldId, 'notes', e.target.value)}
                        placeholder="Additional notes for this field..."
                        rows={2}
                        className="text-sm resize-none"
                        disabled={readOnly}
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
  );
};