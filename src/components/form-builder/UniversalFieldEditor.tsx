import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, X } from 'lucide-react';
import { useFieldTypes } from '@/hooks/useFieldTypes';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UniversalFieldEditorProps {
  isOpen: boolean;
  onClose: () => void;
  field?: any;
  onSuccess: () => void;
  formId?: string;
}

const PRICING_BEHAVIORS = [
  { value: 'none', label: 'No Pricing' },
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'per_person', label: 'Per Person' },
  { value: 'quantity_based', label: 'Quantity Based' },
];

const UNIT_TYPES = [
  { value: 'item', label: 'Item' },
  { value: 'person', label: 'Person' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'dish', label: 'Dish' },
  { value: 'hour', label: 'Hour' },
  { value: 'service', label: 'Service' },
];

export const UniversalFieldEditor: React.FC<UniversalFieldEditorProps> = ({
  isOpen,
  onClose,
  field,
  onSuccess,
  formId
}) => {
  const { currentTenant } = useAuth();
  const { fieldTypes } = useFieldTypes();
  
  const [formData, setFormData] = useState({
    label: '',
    field_type: '',
    category: '',
    pricing_behavior: 'none',
    unit_price: 0,
    unit_type: 'item',
    show_quantity: false,
    show_notes: true,
    allow_price_override: false,
    min_quantity: 1,
    max_quantity: null as number | null,
    default_quantity: 1,
    help_text: '',
    placeholder: '',
    options: [] as string[],
  });
  
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (field) {
      setFormData({
        label: field.label || '',
        field_type: field.field_type || '',
        category: field.category || '',
        pricing_behavior: field.pricing_behavior || 'none',
        unit_price: field.unit_price || 0,
        unit_type: field.unit_type || 'item',
        show_quantity: field.show_quantity || false,
        show_notes: field.show_notes !== undefined ? field.show_notes : true,
        allow_price_override: field.allow_price_override || false,
        min_quantity: field.min_quantity || 1,
        max_quantity: field.max_quantity || null,
        default_quantity: field.default_quantity || 1,
        help_text: field.help_text || '',
        placeholder: field.placeholder || '',
        options: Array.isArray(field.options) ? field.options : [],
      });
    } else {
      setFormData({
        label: '',
        field_type: '',
        category: '',
        pricing_behavior: 'none',
        unit_price: 0,
        unit_type: 'item',
        show_quantity: false,
        show_notes: true,
        allow_price_override: false,
        min_quantity: 1,
        max_quantity: null,
        default_quantity: 1,
        help_text: '',
        placeholder: '',
        options: [],
      });
    }
  }, [field]);

  const createFieldMutation = useSupabaseMutation(
    async (variables: any) => {
      if (!currentTenant?.id) {
        throw new Error('No tenant found');
      }
      
      // Create field in library
      const { data: libraryField, error: libraryError } = await supabase
        .from('field_library')
        .insert({
          tenant_id: currentTenant.id,
          name: variables.label.toLowerCase().replace(/\s+/g, '_'),
          label: variables.label,
          field_type: variables.field_type,
          category: variables.category,
          pricing_behavior: variables.pricing_behavior,
          unit_price: variables.unit_price,
          unit_type: variables.unit_type,
          show_quantity: variables.show_quantity,
          show_notes: variables.show_notes,
          allow_price_override: variables.allow_price_override,
          min_quantity: variables.min_quantity,
          max_quantity: variables.max_quantity,
          default_quantity: variables.default_quantity,
          help_text: variables.help_text,
          placeholder: variables.placeholder,
          options: variables.options,
          affects_pricing: variables.pricing_behavior !== 'none',
          active: true,
        })
        .select()
        .single();
      
      if (libraryError) throw libraryError;
      
      // If formId provided, also add to form
      if (formId && libraryField) {
        const { error: instanceError } = await supabase
          .from('form_field_instances')
          .insert({
            tenant_id: currentTenant.id,
            form_template_id: formId,
            field_library_id: libraryField.id,
            field_order: 999, // Will be reordered via drag & drop
          });
        
        if (instanceError) throw instanceError;
      }
      
      return libraryField;
    },
    {
      successMessage: 'Field created successfully!',
      invalidateQueries: [['field-library'], ['form-fields']],
      onSuccess: () => {
        onSuccess();
        onClose();
      }
    }
  );

  const updateFieldMutation = useSupabaseMutation(
    async (variables: any) => {
      const { data, error } = await supabase
        .from('field_library')
        .update({
          label: variables.label,
          field_type: variables.field_type,
          category: variables.category,
          pricing_behavior: variables.pricing_behavior,
          unit_price: variables.unit_price,
          unit_type: variables.unit_type,
          show_quantity: variables.show_quantity,
          show_notes: variables.show_notes,
          allow_price_override: variables.allow_price_override,
          min_quantity: variables.min_quantity,
          max_quantity: variables.max_quantity,
          default_quantity: variables.default_quantity,
          help_text: variables.help_text,
          placeholder: variables.placeholder,
          options: variables.options,
          affects_pricing: variables.pricing_behavior !== 'none',
        })
        .eq('id', field.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Field updated successfully!',
      invalidateQueries: [['field-library'], ['form-fields']],
      onSuccess: () => {
        onSuccess();
        onClose();
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim()) return;
    
    if (field) {
      updateFieldMutation.mutate(formData);
    } else {
      createFieldMutation.mutate(formData);
    }
  };

  const addOption = () => {
    if (newOption.trim()) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, newOption.trim()]
      }));
      setNewOption('');
    }
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const selectedFieldType = fieldTypes.find(ft => ft.name === formData.field_type);
  const showPricingOptions = selectedFieldType?.supports_pricing;
  const showQuantityOptions = selectedFieldType?.supports_quantity;
  const showSelectOptions = formData.field_type === 'select';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {field ? 'Edit Field' : 'Create New Field'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="label">Field Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Chicken Biryani"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="field_type">Field Type</Label>
              <Select 
                value={formData.field_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, field_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((type) => (
                    <SelectItem key={type.name} value={type.name}>
                      {type.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              placeholder="e.g., menu, services, requirements"
            />
          </div>

          {showPricingOptions && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium">Pricing Configuration</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pricing_behavior">Pricing Model</Label>
                  <Select 
                    value={formData.pricing_behavior} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, pricing_behavior: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_BEHAVIORS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.pricing_behavior !== 'none' && (
                  <div>
                    <Label htmlFor="unit_price">Unit Price (£)</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unit_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                )}
              </div>
              
              {formData.pricing_behavior !== 'none' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unit_type">Unit Type</Label>
                    <Select 
                      value={formData.unit_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, unit_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_TYPES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allow_price_override"
                        checked={formData.allow_price_override}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_price_override: checked }))}
                      />
                      <Label htmlFor="allow_price_override">Allow Price Override</Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showQuantityOptions && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium">Quantity Configuration</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="show_quantity"
                  checked={formData.show_quantity}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_quantity: checked }))}
                />
                <Label htmlFor="show_quantity">Show Quantity Field</Label>
              </div>
              
              {formData.show_quantity && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="min_quantity">Min Quantity</Label>
                    <Input
                      id="min_quantity"
                      type="number"
                      min="0"
                      value={formData.min_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="max_quantity">Max Quantity</Label>
                    <Input
                      id="max_quantity"
                      type="number"
                      min="1"
                      value={formData.max_quantity || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_quantity: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="No limit"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="default_quantity">Default</Label>
                    <Input
                      id="default_quantity"
                      type="number"
                      min="1"
                      value={formData.default_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, default_quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="show_notes"
              checked={formData.show_notes}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_notes: checked }))}
            />
            <Label htmlFor="show_notes">Show Notes Field</Label>
          </div>

          {showSelectOptions && (
            <div className="space-y-3">
              <Label>Options</Label>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={option} readOnly className="flex-1" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex items-center gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Add new option"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="placeholder">Placeholder Text</Label>
              <Input
                id="placeholder"
                value={formData.placeholder}
                onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                placeholder="e.g., Enter quantity needed"
              />
            </div>
            
            <div>
              <Label htmlFor="help_text">Help Text</Label>
              <Input
                id="help_text"
                value={formData.help_text}
                onChange={(e) => setFormData(prev => ({ ...prev, help_text: e.target.value }))}
                placeholder="Additional guidance for users"
              />
            </div>
          </div>
        </form>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
          >
            {field ? 'Update' : 'Create'} Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};