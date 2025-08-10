import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export interface FieldResponse {
  value?: any;
  notes?: string;
  price?: number;
  quantity?: number;
  enabled?: boolean;
}

interface CompactFieldDisplayProps {
  field: any;
  response: FieldResponse;
  onChange: (response: FieldResponse) => void;
  readOnly?: boolean;
}

export const CompactFieldDisplay: React.FC<CompactFieldDisplayProps> = ({
  field,
  response,
  onChange,
  readOnly = false
}) => {
  const updateResponse = (updates: Partial<FieldResponse>) => {
    const newResponse = { ...response, ...updates };
    
    // Auto-calculate pricing if field affects pricing
    if (field.affects_pricing && !readOnly) {
      const basePrice = parseFloat(field.unit_price || 0);
      const quantity = parseInt(newResponse.quantity?.toString() || '1');
      
      switch (field.pricing_behavior) {
        case 'fixed':
          newResponse.price = basePrice;
          break;
        case 'quantity_based':
          newResponse.price = basePrice * quantity;
          break;
        case 'per_person':
          // Will be calculated at form level based on guest count
          newResponse.price = basePrice;
          break;
        default:
          newResponse.price = basePrice;
      }
    }
    
    onChange(newResponse);
  };

  const renderMainInput = () => {
    switch (field.field_type) {
      case 'price':
      case 'per_person_price':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">£</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={response.price || field.unit_price || ''}
                onChange={(e) => updateResponse({ price: parseFloat(e.target.value) || 0 })}
                disabled={readOnly}
                className="w-32"
              />
              {field.pricing_behavior === 'per_person' && (
                <Badge variant="secondary" className="text-xs">Per Person</Badge>
              )}
            </div>
            {field.pricing_behavior === 'per_person' && (
              <p className="text-xs text-muted-foreground">
                Will be multiplied by guest count
              </p>
            )}
          </div>
        );

      case 'quantity':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={field.min_quantity || 1}
                max={field.max_quantity || undefined}
                value={response.quantity || field.default_quantity || 1}
                onChange={(e) => updateResponse({ quantity: parseInt(e.target.value) || 1 })}
                disabled={readOnly}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                {field.unit_type || 'items'}
              </span>
            </div>
            {field.affects_pricing && field.unit_price && (
              <div className="flex items-center gap-2 text-sm">
                <span>£{field.unit_price} each</span>
                <span className="text-muted-foreground">
                  = £{((response.quantity || 1) * parseFloat(field.unit_price)).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        );

      case 'text':
      case 'email':
      case 'tel':
        return (
          <Input
            type={field.field_type === 'text' ? 'text' : field.field_type}
            value={response.value || ''}
            onChange={(e) => updateResponse({ value: e.target.value })}
            placeholder={field.placeholder}
            disabled={readOnly}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={response.value || ''}
            onChange={(e) => updateResponse({ value: e.target.value })}
            placeholder={field.placeholder}
            disabled={readOnly}
            className="w-32"
          />
        );

      case 'large_textarea':
        return (
          <Textarea
            value={response.value || ''}
            onChange={(e) => updateResponse({ value: e.target.value })}
            placeholder={field.placeholder}
            disabled={readOnly}
            rows={4}
          />
        );

      case 'select':
        return (
          <Select
            value={response.value || ''}
            onValueChange={(value) => updateResponse({ value })}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: any, index: number) => (
                <SelectItem key={index} value={option.value || option}>
                  {option.label || option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={response.value || false}
              onCheckedChange={(checked) => updateResponse({ value: checked })}
              disabled={readOnly}
            />
            <Label htmlFor={field.id} className="text-sm font-normal">
              {field.label}
            </Label>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={response.value || ''}
            onChange={(e) => updateResponse({ value: e.target.value })}
            disabled={readOnly}
          />
        );

      case 'time':
        return (
          <Input
            type="time"
            value={response.value || ''}
            onChange={(e) => updateResponse({ value: e.target.value })}
            disabled={readOnly}
          />
        );

      default:
        return (
          <Input
            value={response.value || ''}
            onChange={(e) => updateResponse({ value: e.target.value })}
            placeholder={field.placeholder}
            disabled={readOnly}
          />
        );
    }
  };

  // Simple inline layout for basic fields
  if (['checkbox'].includes(field.field_type)) {
    return (
      <div className="space-y-2">
        {renderMainInput()}
        {field.help_text && (
          <p className="text-xs text-muted-foreground">{field.help_text}</p>
        )}
      </div>
    );
  }

  // Full card layout for complex fields
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {field.affects_pricing && (
            <Badge variant="outline" className="text-xs">
              {field.pricing_behavior === 'per_person' ? 'Per Person' : 'Pricing'}
            </Badge>
          )}
        </div>
        
        {renderMainInput()}
        
        {field.help_text && (
          <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
        )}
      </div>

      {/* Pricing & Quantity Section */}
      {field.affects_pricing && !['price', 'per_person_price', 'quantity'].includes(field.field_type) && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          {field.show_quantity && (
            <div>
              <Label className="text-xs font-medium">Quantity</Label>
              <Input
                type="number"
                min={field.min_quantity || 1}
                max={field.max_quantity || undefined}
                value={response.quantity || field.default_quantity || 1}
                onChange={(e) => updateResponse({ quantity: parseInt(e.target.value) || 1 })}
                disabled={readOnly}
                className="h-8 text-sm"
              />
            </div>
          )}
          
          <div>
            <Label className="text-xs font-medium">Price</Label>
            <div className="flex items-center gap-1">
              <span className="text-xs">£</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={response.price || field.unit_price || ''}
                onChange={(e) => updateResponse({ price: parseFloat(e.target.value) || 0 })}
                disabled={readOnly || !field.allow_price_override}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes Section */}
      {field.show_notes && !readOnly && (
        <div>
          <Label className="text-xs font-medium">Notes</Label>
          <Textarea
            value={response.notes || ''}
            onChange={(e) => updateResponse({ notes: e.target.value })}
            placeholder="Add any notes or special requirements..."
            rows={2}
            className="text-sm"
          />
        </div>
      )}

      {/* Total Display */}
      {field.affects_pricing && response.price && (
        <div className="text-right pt-2 border-t">
          <div className="text-sm font-medium">
            Total: £{((response.price || 0) * (response.quantity || 1)).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};