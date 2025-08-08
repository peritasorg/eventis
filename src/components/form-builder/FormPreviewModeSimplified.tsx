import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, MessageSquare, Hash, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

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
  const handleFieldChange = (fieldId: string, field: string, value: any) => {
    if (onResponseChange) {
      onResponseChange(fieldId, field, value);
    }
  };

  const renderMainFieldInput = (field: any, fieldId: string, response: any) => {
    const value = response.value || '';
    
    switch (field.field_type) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(fieldId, 'value', e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            className="h-8 text-sm"
            disabled={readOnly}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(fieldId, 'value', e.target.value)}
            placeholder="Enter number"
            className="h-8 text-sm"
            disabled={readOnly}
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(fieldId, 'value', e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            rows={3}
            className="text-sm resize-none"
            disabled={readOnly}
          />
        );
      case 'select':
        return (
          <Select 
            value={value} 
            onValueChange={(val) => handleFieldChange(fieldId, 'value', val)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: any, index: number) => (
                <SelectItem key={index} value={option.value || option}>
                  {option.label || option}
                </SelectItem>
              )) || []}
            </SelectContent>
          </Select>
        );
      case 'toggle':
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!value}
              onCheckedChange={(checked) => handleFieldChange(fieldId, 'value', checked)}
              disabled={readOnly}
            />
            <span className="text-sm">Enable {field.label}</span>
          </div>
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(fieldId, 'value', e.target.value)}
            placeholder="Enter value"
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
        This preview shows exactly how fields will appear in event forms. Every field includes notes, price, and quantity inputs.
      </div>

      {formFields.map((fieldInstance) => {
        const field = fieldInstance.field_library || fieldInstance;
        const fieldId = field.id;
        const response = formResponses[fieldId] || { value: '', notes: '', price: 0, quantity: 1 };
        
        return (
          <div key={fieldId} className="border rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">{field.label}</h4>
              <div className="flex items-center gap-2">
                {field.category && (
                  <Badge variant="secondary" className="text-xs">
                    {field.category}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs capitalize">
                  {field.field_type === 'toggle' ? 'Toggle' : 
                   field.field_type === 'select' ? 'Dropdown' : 
                   field.field_type}
                </Badge>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFieldMutation?.mutate?.(fieldInstance.id)}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Main Field Input */}
              <div>
                <Label className="text-sm font-medium mb-1 block">{field.label}</Label>
                {renderMainFieldInput(field, fieldId, response)}
              </div>
              
              {/* Notes Field - Always Present */}
              <div>
                <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                  <MessageSquare className="h-3 w-3" />
                  Notes
                </Label>
                <Textarea
                  value={response.notes || ''}
                  onChange={(e) => handleFieldChange(fieldId, 'notes', e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                  className="text-sm resize-none"
                  disabled={readOnly}
                />
              </div>
              
              {/* Price and Quantity Fields - Always Present */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                    <DollarSign className="h-3 w-3" />
                    Price (£)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={response.price || 0}
                    onChange={(e) => handleFieldChange(fieldId, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-8 text-sm"
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                    <Hash className="h-3 w-3" />
                    Quantity
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={response.quantity || 1}
                    onChange={(e) => handleFieldChange(fieldId, 'quantity', parseInt(e.target.value) || 1)}
                    placeholder="1"
                    className="h-8 text-sm"
                    disabled={readOnly}
                  />
                </div>
              </div>
              
              {/* Total Display */}
              {(response.price > 0 || response.quantity > 1) && (
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    Total: <span className="font-medium text-foreground">
                      £{((response.price || 0) * (response.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};