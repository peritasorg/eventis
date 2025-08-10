import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/hooks/useFormFields';

interface FieldResponse {
  value?: string | number;
  quantity?: number;
  price?: number;
  notes?: string;
  enabled?: boolean;
}

interface UnifiedFieldRendererProps {
  field: FormField;
  response?: FieldResponse;
  onChange?: (fieldId: string, updates: Partial<FieldResponse>) => void;
  readOnly?: boolean;
  showInCard?: boolean;
}

export const UnifiedFieldRenderer: React.FC<UnifiedFieldRendererProps> = ({
  field,
  response = {},
  onChange,
  readOnly = false,
  showInCard = true
}) => {
  const updateResponse = (updates: Partial<FieldResponse>) => {
    if (onChange && !readOnly) {
      onChange(field.id, { ...response, ...updates });
    }
  };

  const calculatePrice = () => {
    if (field.field_type === 'fixed_price_notes') {
      return response.price || 0;
    } else if (field.field_type === 'per_person_price_notes') {
      return (response.quantity || 0) * (response.price || 0);
    }
    return 0;
  };

  const renderFieldContent = () => {
    switch (field.field_type) {
      case 'text_notes_only':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
            </div>
            <Textarea
              value={response.notes || ''}
              onChange={(e) => updateResponse({ notes: e.target.value })}
              placeholder={field.placeholder_text || 'Enter notes...'}
              rows={3}
              disabled={readOnly}
              className="w-full"
            />
          </div>
        );

      case 'fixed_price_notes':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm">Price:</Label>
              <div className="flex items-center">
                <span className="text-sm mr-1">£</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={response.price || ''}
                  onChange={(e) => updateResponse({ price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  disabled={readOnly}
                  className="w-24"
                />
              </div>
            </div>

            {field.has_notes && (
              <div>
                <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                <Textarea
                  value={response.notes || ''}
                  onChange={(e) => updateResponse({ notes: e.target.value })}
                  placeholder={field.placeholder_text || 'Additional requirements...'}
                  rows={2}
                  disabled={readOnly}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        );

      case 'per_person_price_notes':
        const totalPrice = calculatePrice();
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <Label className="text-xs text-muted-foreground">Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={response.quantity || ''}
                  onChange={(e) => updateResponse({ quantity: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  disabled={readOnly}
                  className="w-full"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Unit Price</Label>
                <div className="flex items-center">
                  <span className="text-xs mr-1">£</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={response.price || ''}
                    onChange={(e) => updateResponse({ price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    disabled={readOnly}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Total</Label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                  £{totalPrice.toFixed(2)}
                </div>
              </div>
            </div>

            {field.has_notes && (
              <div>
                <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                <Textarea
                  value={response.notes || ''}
                  onChange={(e) => updateResponse({ notes: e.target.value })}
                  placeholder={field.placeholder_text || 'Special requirements...'}
                  rows={2}
                  disabled={readOnly}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        );

      case 'counter_notes':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                value={response.value || ''}
                onChange={(e) => updateResponse({ value: parseInt(e.target.value) || 0 })}
                placeholder="0"
                disabled={readOnly}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">items</span>
            </div>

            {field.has_notes && (
              <div>
                <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                <Textarea
                  value={response.notes || ''}
                  onChange={(e) => updateResponse({ notes: e.target.value })}
                  placeholder={field.placeholder_text || 'Additional notes...'}
                  rows={2}
                  disabled={readOnly}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            Unknown field type: {field.field_type}
          </div>
        );
    }
  };

  if (showInCard) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          {renderFieldContent()}
        </CardContent>
      </Card>
    );
  }

  return renderFieldContent();
};