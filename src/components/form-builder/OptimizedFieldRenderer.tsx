import React, { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { PriceInput } from '@/components/ui/price-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/hooks/useFormFields';

interface FieldResponse {
  value?: string | number;
  quantity?: number;
  price?: number;
  notes?: string;
  enabled?: boolean;
  selectedOption?: string;
}

interface OptimizedFieldRendererProps {
  field: FormField;
  response?: FieldResponse;
  onChange?: (fieldId: string, updates: Partial<FieldResponse>) => void;
  onBlur?: () => void;
  readOnly?: boolean;
  showInCard?: boolean;
}

export const OptimizedFieldRenderer: React.FC<OptimizedFieldRendererProps> = ({
  field,
  response = {},
  onChange,
  onBlur,
  readOnly = false,
  showInCard = true
}) => {
  // Local state for immediate UI updates (prevents typing glitches)
  const [localValue, setLocalValue] = useState({
    notes: response.notes || '',
    price: response.price || 0,
    quantity: response.quantity || 1,
    value: response.value || '',
    enabled: response.enabled || false,
    selectedOption: response.selectedOption || ''
  });

  // Sync local state when response changes from external updates (only on form load)
  React.useEffect(() => {
    // Only update if the response actually changed significantly to avoid overwriting user input
    const hasSignificantChange = 
      (response.enabled !== undefined && response.enabled !== localValue.enabled) ||
      (response.price !== undefined && response.price !== localValue.price && response.price !== 0) ||
      (response.quantity !== undefined && response.quantity !== localValue.quantity && response.quantity !== 1);
    
    if (hasSignificantChange) {
      setLocalValue({
        notes: response.notes || localValue.notes,
        price: response.price ?? localValue.price,
        quantity: response.quantity ?? localValue.quantity,
        value: response.value || localValue.value,
        enabled: response.enabled ?? localValue.enabled,
        selectedOption: response.selectedOption || localValue.selectedOption
      });
    }
  }, [response.enabled, response.price, response.quantity]);

  const updateResponse = useCallback((updates: Partial<FieldResponse>) => {
    if (onChange && !readOnly) {
      onChange(field.id, updates);
    }
  }, [onChange, readOnly, field.id]);

  // Handle local state updates for text fields
  const handleLocalChange = useCallback((key: keyof typeof localValue, value: any) => {
    setLocalValue(prev => ({ ...prev, [key]: value }));
  }, []);

  // Handle blur events - save text changes to database
  const handleBlur = useCallback((key: keyof typeof localValue) => {
    updateResponse({ [key]: localValue[key] });
    onBlur?.();
  }, [localValue, updateResponse, onBlur]);

  // Immediate updates for non-text fields (toggles, prices)
  const handleImmediateUpdate = useCallback((updates: Partial<FieldResponse>) => {
    setLocalValue(prev => ({ ...prev, ...updates }));
    updateResponse(updates);
  }, [updateResponse]);

  const calculatePrice = useMemo(() => {
    if (field.field_type === 'fixed_price_notes' || field.field_type === 'fixed_price_notes_toggle') {
      return localValue.price || 0;
    } else if (field.field_type === 'fixed_price_quantity_notes') {
      return (localValue.quantity || 1) * (localValue.price || 0);
    } else if (field.field_type === 'per_person_price_notes') {
      return (localValue.quantity || 0) * (localValue.price || 0);
    } else if (field.field_type === 'dropdown_options_price_notes' && localValue.selectedOption) {
      const selectedDropdownOption = field.dropdown_options?.find(opt => opt.value === localValue.selectedOption);
      return selectedDropdownOption?.price || 0;
    }
    return 0;
  }, [field.field_type, field.dropdown_options, localValue.price, localValue.quantity, localValue.selectedOption]);

  const renderFieldContent = () => {
    switch (field.field_type as string) {
      case 'text_notes_only':
        return (
          <>
            <div className="col-span-2">
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
              <Textarea
                value={localValue.notes}
                onChange={(e) => handleLocalChange('notes', e.target.value)}
                onBlur={() => handleBlur('notes')}
                placeholder={field.placeholder_text || 'Enter notes...'}
                rows={3}
                disabled={readOnly}
                className="w-full mt-2"
              />
            </div>
          </>
        );

      case 'fixed_price_notes_toggle':
        return (
          <div className="col-span-2 space-y-3">
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
            </div>
            
            {/* Single horizontal line: Toggle → Notes → Price */}
            <div className="flex items-center gap-3">
              {/* Toggle - immediate update */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={localValue.enabled}
                  onCheckedChange={(enabled) => handleImmediateUpdate({ enabled })}
                  disabled={readOnly}
                />
                <Label className="text-xs text-muted-foreground">Enable</Label>
              </div>
              
              {/* Notes and Price - only visible when toggle is ON */}
              {localValue.enabled && (
                <>
                  {field.has_notes && (
                    <div className="flex-1">
                      <Input
                        value={localValue.notes}
                        onChange={(e) => handleLocalChange('notes', e.target.value)}
                        onBlur={() => handleBlur('notes')}
                        placeholder={field.placeholder_text || 'Notes...'}
                        disabled={readOnly}
                        className="w-full"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs">£</span>
                    <PriceInput
                      value={localValue.price}
                      onChange={(value) => handleImmediateUpdate({ price: value })}
                      placeholder="0.00"
                      disabled={readOnly}
                      className="w-24"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Display total if enabled */}
            {localValue.enabled && calculatePrice > 0 && (
              <div className="text-sm font-medium text-right">
                Total: £{calculatePrice.toFixed(2)}
              </div>
            )}
          </div>
        );

      case 'fixed_price_quantity_notes_toggle':
        return (
          <div className="col-span-2 space-y-3">
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
            </div>
            
            {/* Single horizontal line: Toggle → Notes → Quantity → Price */}
            <div className="flex items-center gap-3">
              {/* Toggle - immediate update */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={localValue.enabled}
                  onCheckedChange={(enabled) => handleImmediateUpdate({ enabled })}
                  disabled={readOnly}
                />
                <Label className="text-xs text-muted-foreground">Enable</Label>
              </div>
              
              {/* Notes, Quantity and Price - only visible when toggle is ON */}
              {localValue.enabled && (
                <>
                  {field.has_notes && (
                    <div className="flex-1">
                      <Input
                        value={localValue.notes}
                        onChange={(e) => handleLocalChange('notes', e.target.value)}
                        onBlur={() => handleBlur('notes')}
                        placeholder={field.placeholder_text || 'Notes...'}
                        disabled={readOnly}
                        className="w-full"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={localValue.quantity}
                      onChange={(e) => handleImmediateUpdate({ quantity: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={100}
                      disabled={readOnly}
                      className="w-16"
                      placeholder="Qty"
                    />
                    <span className="text-xs">×</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs">£</span>
                    <PriceInput
                      value={localValue.price}
                      onChange={(value) => handleImmediateUpdate({ price: value })}
                      placeholder="0.00"
                      disabled={readOnly}
                      className="w-24"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Display total if enabled */}
            {localValue.enabled && calculatePrice > 0 && (
              <div className="text-sm font-medium text-right">
                Total: £{calculatePrice.toFixed(2)}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="col-span-2">
            <Label className="text-sm font-medium">{field.name}</Label>
            <p className="text-xs text-muted-foreground">Field type: {field.field_type}</p>
            <p className="text-xs text-red-500">Optimized renderer: Field type not yet implemented</p>
          </div>
        );
    }
  };

  const content = renderFieldContent();

  if (showInCard) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 items-start">
            {content}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 items-start">
      {content}
    </div>
  );
};