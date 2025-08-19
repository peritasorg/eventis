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

  // Only sync on initial load - prevent overwriting user input
  React.useEffect(() => {
    if (response && Object.keys(response).length > 0) {
      console.log('Loading field data:', field.name, response);
      setLocalValue(prev => ({
        notes: response.notes || prev.notes,
        price: response.price !== undefined ? response.price : prev.price,
        quantity: response.quantity || prev.quantity,
        value: response.value || prev.value,
        enabled: response.enabled !== undefined ? response.enabled : prev.enabled,
        selectedOption: response.selectedOption || prev.selectedOption
      }));
    }
  }, [field.id]); // Only run when field ID changes

  const updateResponse = useCallback((updates: Partial<FieldResponse>) => {
    if (onChange && !readOnly) {
      console.log('Updating field response:', field.name, updates);
      onChange(field.id, updates);
    }
  }, [onChange, readOnly, field.id, field.name]);

  // Handle local state updates for text fields
  const handleLocalChange = useCallback((key: keyof typeof localValue, value: any) => {
    console.log('Local field change:', field.name, key, value);
    setLocalValue(prev => ({ ...prev, [key]: value }));
  }, [field.name]);

  // Handle blur events - save text changes to database
  const handleBlur = useCallback((key: keyof typeof localValue) => {
    console.log('Field blur save:', field.name, key, localValue[key]);
    updateResponse({ [key]: localValue[key] });
    onBlur?.();
  }, [localValue, updateResponse, onBlur, field.name]);

  // Immediate updates for non-text fields (toggles, prices)
  const handleImmediateUpdate = useCallback((updates: Partial<FieldResponse>) => {
    console.log('Immediate field update:', field.name, updates);
    setLocalValue(prev => ({ ...prev, ...updates }));
    updateResponse(updates);
  }, [updateResponse, field.name]);

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

      case 'dropdown_options':
      case 'dropdown_options_price_notes':
        return (
          <div className="col-span-2 space-y-3">
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
            </div>
            
            <div className="space-y-3">
              <Select
                value={localValue.selectedOption}
                onValueChange={(value) => {
                  const selectedDropdownOption = field.dropdown_options?.find(opt => opt.value === value);
                  const updates: any = { 
                    selectedOption: value,
                    value: value,
                    enabled: true
                  };
                  if (selectedDropdownOption?.price) {
                    updates.price = selectedDropdownOption.price;
                  }
                  handleImmediateUpdate(updates);
                }}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option..." />
                </SelectTrigger>
                <SelectContent>
                  {field.dropdown_options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} {option.price ? `(£${option.price})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {field.has_notes && localValue.selectedOption && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Textarea
                    value={localValue.notes}
                    onChange={(e) => handleLocalChange('notes', e.target.value)}
                    onBlur={() => handleBlur('notes')}
                    placeholder="Additional notes..."
                    rows={2}
                    disabled={readOnly}
                    className="w-full mt-1"
                  />
                </div>
              )}
              
              {localValue.selectedOption && calculatePrice > 0 && (
                <div className="text-sm font-medium text-right">
                  Total: £{calculatePrice.toFixed(2)}
                </div>
              )}
            </div>
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