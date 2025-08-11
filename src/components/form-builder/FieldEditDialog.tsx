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
import { UnifiedFieldRenderer } from './UnifiedFieldRenderer';

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
    field_type: 'text_notes_only' as FormField['field_type'],
    has_notes: true,
    has_pricing: false,
    pricing_type: null as 'fixed' | 'per_person' | null,
    default_price_gbp: null as number | null,
    placeholder_text: '',
    help_text: '',
    is_active: true
  });

  const [showPreview, setShowPreview] = useState(false);

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
        field_type: 'text_notes_only',
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
    
    if (fieldType === 'fixed_price_notes') {
      updates.has_pricing = true;
      updates.pricing_type = 'fixed';
      updates.has_notes = true;
    } else if (fieldType === 'per_person_price_notes') {
      updates.has_pricing = true;
      updates.pricing_type = 'per_person';
      updates.has_notes = true;
    } else if (fieldType === 'text_notes_only') {
      updates.has_pricing = false;
      updates.pricing_type = null;
      updates.default_price_gbp = null;
      updates.has_notes = true;
    } else if (fieldType === 'counter_notes') {
      updates.has_pricing = false;
      updates.pricing_type = null;
      updates.default_price_gbp = null;
      updates.has_notes = true;
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

  // Create preview field for rendering
  const previewField: FormField = {
    id: 'preview',
    tenant_id: 'preview',
    name: formData.name || 'Sample Field',
    field_type: formData.field_type,
    has_notes: formData.has_notes,
    has_pricing: formData.has_pricing,
    pricing_type: formData.pricing_type,
    default_price_gbp: formData.default_price_gbp,
    placeholder_text: formData.placeholder_text,
    help_text: formData.help_text,
    is_active: formData.is_active,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {field ? 'Edit Field' : 'Create New Field'}
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Field Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Chicken Biryani, Event Theme"
                  required
                />
              </div>
              <div>
                <Label htmlFor="placeholder">Placeholder Text</Label>
                <Input
                  id="placeholder"
                  value={formData.placeholder_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, placeholder_text: e.target.value }))}
                  placeholder="e.g., Enter your requirements..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="help">Help Text</Label>
              <Textarea
                id="help"
                value={formData.help_text}
                onChange={(e) => setFormData(prev => ({ ...prev, help_text: e.target.value }))}
                placeholder="Additional guidance for users"
                rows={2}
              />
            </div>

            <div>
              <Label>Field Type *</Label>
              <RadioGroup
                value={formData.field_type}
                onValueChange={handleFieldTypeChange}
                className="mt-2 space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text_notes_only" id="text_notes_only" />
                  <Label htmlFor="text_notes_only" className="cursor-pointer">
                    <div className="font-medium">Text Field (notes only)</div>
                    <div className="text-xs text-muted-foreground">Only a text area for notes/requirements</div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed_price_notes" id="fixed_price_notes" />
                  <Label htmlFor="fixed_price_notes" className="cursor-pointer">
                    <div className="font-medium">Fixed Price Field + Quantity + Notes</div>
                    <div className="text-xs text-muted-foreground">Quantity × fixed price with auto-calculated total + notes</div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="per_person_price_notes" id="per_person_price_notes" />
                  <Label htmlFor="per_person_price_notes" className="cursor-pointer">
                    <div className="font-medium">Per Person Price Field + Notes</div>
                    <div className="text-xs text-muted-foreground">Quantity × price with auto-calculated total + notes</div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="counter_notes" id="counter_notes" />
                  <Label htmlFor="counter_notes" className="cursor-pointer">
                    <div className="font-medium">Counter Field + Notes</div>
                    <div className="text-xs text-muted-foreground">Number input + optional notes</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Field Options</Label>
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

          {/* Live Preview */}
          {showPreview && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-semibold">Live Preview</Label>
                <p className="text-sm text-muted-foreground">
                  This is exactly how the field will appear in forms
                </p>
              </div>
              <UnifiedFieldRenderer 
                field={previewField}
                showInCard={true}
                readOnly={false}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};