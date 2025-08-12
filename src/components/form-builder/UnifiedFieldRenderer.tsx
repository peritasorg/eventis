import React from 'react';
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
    } else if (field.field_type === 'fixed_price_quantity_notes') {
      return (response.quantity || 1) * (response.price || 0);
    } else if (field.field_type === 'per_person_price_notes') {
      return (response.quantity || 0) * (response.price || 0);
    } else if (field.field_type === 'dropdown_options_price_notes' && response.selectedOption) {
      const selectedDropdownOption = field.dropdown_options?.find(opt => opt.value === response.selectedOption);
      return selectedDropdownOption?.price || 0;
    }
    return 0;
  };

  const renderToggleSection = () => {
    if (!field.is_toggleable) return null;

    return (
      <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
        <div>
          <Label className="text-sm font-medium">
            {field.toggle_label || field.name}
          </Label>
          <p className="text-xs text-muted-foreground">
            Toggle to enable this field and its options
          </p>
        </div>
        <Switch
          checked={response.enabled !== false}
          onCheckedChange={(enabled) => updateResponse({ enabled })}
          disabled={readOnly}
        />
      </div>
    );
  };

  const renderFieldContent = () => {
    switch (field.field_type) {
      case 'text_notes_only':
        return (
          <>
            <div className="col-span-2">
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
              <Textarea
                value={response.notes || ''}
                onChange={(e) => updateResponse({ notes: e.target.value })}
                placeholder={field.placeholder_text || 'Enter notes...'}
                rows={3}
                disabled={readOnly}
                className="w-full mt-2"
              />
            </div>
          </>
        );

      case 'fixed_price_notes':
        return (
          <>
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Price</Label>
                <div className="flex items-center">
                  <span className="text-xs mr-1">£</span>
                  <PriceInput
                    value={response.price || 0}
                    onChange={(value) => updateResponse({ price: value })}
                    placeholder="0.00"
                    disabled={readOnly}
                    className="w-full"
                  />
                </div>
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
          </>
        );

      case 'fixed_price_quantity_notes':
        return (
          <>
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
              <div className="grid grid-cols-2 gap-2 items-end mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={response.quantity || 1}
                    onChange={(e) => updateResponse({ quantity: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                    disabled={readOnly}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Unit Price</Label>
                  <div className="flex items-center">
                    <span className="text-xs mr-1">£</span>
                    <PriceInput
                      value={response.price || 0}
                      onChange={(value) => updateResponse({ price: value })}
                      placeholder="0.00"
                      disabled={readOnly}
                      className="w-full"
                    />
                  </div>
                </div>
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
          </>
        );

      case 'per_person_price_notes':
        const totalPrice = calculatePrice();
        return (
          <>
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
              <div className="grid grid-cols-3 gap-2 items-end mt-2">
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
                    <PriceInput
                      value={response.price || 0}
                      onChange={(value) => updateResponse({ price: value })}
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
          </>
        );

      case 'counter_notes':
        return (
          <>
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
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
          </>
        );

      case 'dropdown_options':
        // Support for multi-select on specific field types like ethnicity, dining chairs
        const isMultiSelect = field.name.toLowerCase().includes('ethnicity') || 
                             field.name.toLowerCase().includes('dining') ||
                             field.name.toLowerCase().includes('chairs');
        
        if (isMultiSelect) {
          const selectedValues = Array.isArray(response.selectedOption) 
            ? response.selectedOption 
            : response.selectedOption ? [response.selectedOption] : [];
          
          return (
            <div className="col-span-2 space-y-3">
              <div>
                <Label className="text-sm font-medium">{field.name}</Label>
                {field.help_text && (
                  <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
                )}
              </div>

              <div className="space-y-2">
                {field.dropdown_options?.filter(option => option.value.trim() !== '').map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`${field.id}-${option.value}`}
                      checked={selectedValues.includes(option.value)}
                      onChange={(e) => {
                        let newSelected;
                        if (e.target.checked) {
                          newSelected = [...selectedValues, option.value];
                        } else {
                          newSelected = selectedValues.filter(v => v !== option.value);
                        }
                        updateResponse({ selectedOption: newSelected });
                      }}
                      disabled={readOnly}
                      className="rounded border-gray-300"
                    />
                    <label 
                      htmlFor={`${field.id}-${option.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
              
              {selectedValues.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Selected: {selectedValues.join(', ')}
                </div>
              )}
            </div>
          );
        }
        
        return (
          <div className="col-span-2 space-y-3">
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
            </div>

            <Select 
              value={response.selectedOption || ''} 
              onValueChange={(value) => updateResponse({ selectedOption: value })}
              disabled={readOnly}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={field.placeholder_text || 'Select an option...'} />
              </SelectTrigger>
              <SelectContent>
                {field.dropdown_options?.filter(option => option.value.trim() !== '').map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'dropdown_options_price_notes':
        const selectedDropdownOption = field.dropdown_options?.find(opt => opt.value === response.selectedOption);
        const dropdownPrice = selectedDropdownOption?.price || 0;
        
        return (
          <>
            <div>
              <Label className="text-sm font-medium">{field.name}</Label>
              {field.help_text && (
                <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
              )}
              <div className="grid grid-cols-2 gap-2 items-end mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Selection</Label>
                  <Select 
                    value={response.selectedOption || ''} 
                    onValueChange={(value) => {
                      const selectedOpt = field.dropdown_options?.find(opt => opt.value === value);
                      updateResponse({ 
                        selectedOption: value,
                        price: selectedOpt?.price || 0
                      });
                    }}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an option..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.dropdown_options?.filter(option => option.value.trim() !== '').map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} {option.price ? `(£${option.price.toFixed(2)})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Price</Label>
                  <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                    £{dropdownPrice.toFixed(2)}
                  </div>
                </div>
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
          </>
        );

      default:
        return (
          <div className="col-span-2 text-sm text-muted-foreground">
            Unknown field type: {field.field_type}
          </div>
        );
    }
  };

  // Don't render sub-fields if field is toggleable but disabled
  const shouldShowSubFields = !field.is_toggleable || response.enabled !== false;

  if (showInCard) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          {renderToggleSection()}
          {shouldShowSubFields && (
            <div className="grid grid-cols-2 gap-4">
              {renderFieldContent()}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {renderToggleSection()}
      {shouldShowSubFields && (
        <div className="grid grid-cols-2 gap-4">
          {renderFieldContent()}
        </div>
      )}
    </div>
  );
};