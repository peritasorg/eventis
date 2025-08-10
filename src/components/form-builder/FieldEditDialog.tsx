import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFormFields, FormField } from '@/hooks/useFormFields';

interface FieldEditDialogProps {
  field?: FormField | null;
  open: boolean;
  onClose: () => void;
}

export const FieldEditDialog: React.FC<FieldEditDialogProps> = ({ 
  field, 
  open, 
  onClose 
}) => {
  const { createField, updateField, isCreating, isUpdating } = useFormFields();
  const [formData, setFormData] = useState({
    name: '',
    field_type: 'text' as FormField['field_type'],
    has_notes: true,
    has_pricing: false,
    pricing_type: null as 'fixed' | 'per_person' | null,
    default_price_gbp: null as number | null,
    placeholder_text: '',
    help_text: '',
    is_active: true
  });

  useEffect(() => {
    if (field) {
      setFormData({
        name: field.name,
        field_type: field.field_type,
        has_notes: field.has_notes,
        has_pricing: field.has_pricing,
        pricing_type: field.pricing_type,
        default_price_gbp: field.default_price_gbp,
        placeholder_text: field.placeholder_text || '',
        help_text: field.help_text || '',
        is_active: field.is_active
      });
    } else {
      setFormData({
        name: '',
        field_type: 'text',
        has_notes: true,
        has_pricing: false,
        pricing_type: null,
        default_price_gbp: null,
        placeholder_text: '',
        help_text: '',
        is_active: true
      });
    }
  }, [field, open]);

  const handleFieldTypeChange = (fieldType: FormField['field_type']) => {
    const updates: Partial<typeof formData> = { field_type: fieldType };
    
    if (fieldType === 'price_fixed') {
      updates.has_pricing = true;
      updates.pricing_type = 'fixed';
    } else if (fieldType === 'price_per_person') {
      updates.has_pricing = true;
      updates.pricing_type = 'per_person';
    } else {
      updates.has_pricing = false;
      updates.pricing_type = null;
      updates.default_price_gbp = null;
    }

    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      placeholder_text: formData.placeholder_text || null,
      help_text: formData.help_text || null,
      default_price_gbp: formData.has_pricing ? formData.default_price_gbp : null
    };

    try {
      if (field) {
        await updateField({ id: field.id, ...submitData });
      } else {
        await createField(submitData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save field:', error);
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{field ? 'Edit Field' : 'Create New Field'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Field Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Chicken Biryani"
                required
              />
            </div>
            <div>
              <Label htmlFor="placeholder">Placeholder Text</Label>
              <Input
                id="placeholder"
                value={formData.placeholder_text}
                onChange={(e) => setFormData(prev => ({ ...prev, placeholder_text: e.target.value }))}
                placeholder="e.g., Medium spicy, extra rice"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="help">Help Text</Label>
            <Textarea
              id="help"
              value={formData.help_text}
              onChange={(e) => setFormData(prev => ({ ...prev, help_text: e.target.value }))}
              placeholder="Enter quantity needed for this menu item"
              rows={2}
            />
          </div>

          <div>
            <Label>Field Type *</Label>
            <RadioGroup
              value={formData.field_type}
              onValueChange={handleFieldTypeChange}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="text" id="text" />
                <Label htmlFor="text">Text Field (notes only)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="price_fixed" id="price_fixed" />
                <Label htmlFor="price_fixed">Fixed Price Field (set price + optional notes)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="price_per_person" id="price_per_person" />
                <Label htmlFor="price_per_person">Per Person Price Field (quantity × price + optional notes)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="counter" id="counter" />
                <Label htmlFor="counter">Counter Field (number input only)</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.has_pricing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pricing Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="price">
                    Default Price * {formData.pricing_type === 'per_person' ? 'per person' : ''}
                  </Label>
                  <div className="flex items-center">
                    <span className="mr-2">£</span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.default_price_gbp || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        default_price_gbp: parseFloat(e.target.value) || null 
                      }))}
                      placeholder="25.00"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <Label>Field Options</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_notes"
                checked={formData.has_notes}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  has_notes: !!checked 
                }))}
              />
              <Label htmlFor="has_notes">Include notes section</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  is_active: !!checked 
                }))}
              />
              <Label htmlFor="is_active">Show in field library</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (field ? 'Update Field' : 'Create Field')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};