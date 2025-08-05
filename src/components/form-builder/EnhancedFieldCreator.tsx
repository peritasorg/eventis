import React, { useState } from 'react';
import { Plus, DollarSign, Users, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EnhancedFieldCreatorProps {
  formId: string;
  onFieldAdded: () => void;
}

const FIELD_CATEGORIES = [
  'Food & Beverage',
  'Decorations', 
  'Entertainment',
  'Services',
  'Equipment',
  'Venue',
  'Photography',
  'Catering',
  'Other'
];

interface NewFieldData {
  label: string;
  field_type: string;
  category: string;
  options: string[];
  toggle_true_value: string;
  toggle_false_value: string;
  pricing_behavior: 'none' | 'fixed' | 'per_person' | 'quantity_based';
  unit_price: number;
  min_quantity: number;
  max_quantity: number | null;
  default_quantity: number;
  show_quantity_field: boolean;
  show_notes_field: boolean;
  allow_zero_price: boolean;
  help_text: string;
}

export const EnhancedFieldCreator: React.FC<EnhancedFieldCreatorProps> = ({ formId, onFieldAdded }) => {
  const { currentTenant } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [newField, setNewField] = useState<NewFieldData>({
    label: '',
    field_type: 'text',
    category: '',
    options: [],
    toggle_true_value: 'Yes',
    toggle_false_value: 'No',
    pricing_behavior: 'none',
    unit_price: 0,
    min_quantity: 1,
    max_quantity: null,
    default_quantity: 1,
    show_quantity_field: false,
    show_notes_field: true,
    allow_zero_price: true,
    help_text: ''
  });

  const createFieldMutation = useSupabaseMutation(
    async (fieldData: NewFieldData) => {
      const name = fieldData.label
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 50) + '_' + Date.now();

      let options = null;
      
      if (fieldData.field_type === 'select') {
        options = fieldData.options;
      } else if (fieldData.field_type === 'checkbox') {
        options = [fieldData.toggle_false_value, fieldData.toggle_true_value];
      }

      // Create field in library
      const { data: fieldLibraryData, error: fieldError } = await supabase
        .from('field_library')
        .insert([{
          name: name,
          label: fieldData.label,
          field_type: fieldData.field_type,
          category: fieldData.category || null,
          options: options,
          help_text: fieldData.help_text || null,
          pricing_behavior: fieldData.pricing_behavior,
          unit_price: fieldData.unit_price,
          min_quantity: fieldData.min_quantity,
          max_quantity: fieldData.max_quantity,
          default_quantity: fieldData.default_quantity,
          show_quantity_field: fieldData.show_quantity_field,
          show_notes_field: fieldData.show_notes_field,
          allow_zero_price: fieldData.allow_zero_price,
          tenant_id: currentTenant?.id,
          active: true
        }])
        .select()
        .single();

      if (fieldError) throw fieldError;

      // Add field to form
      const { data: maxOrderResult } = await supabase
        .from('form_field_instances')
        .select('field_order')
        .eq('form_template_id', formId)
        .order('field_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (maxOrderResult?.field_order || 0) + 1;

      const { error: instanceError } = await supabase
        .from('form_field_instances')
        .insert([{
          form_template_id: formId,
          field_library_id: fieldLibraryData.id,
          field_order: nextOrder,
          tenant_id: currentTenant?.id
        }]);

      if (instanceError) throw instanceError;
      
      return fieldLibraryData;
    },
    {
      successMessage: 'Field created and added to form!',
      onSuccess: () => {
        setIsDialogOpen(false);
        resetNewField();
        onFieldAdded();
      }
    }
  );

  const resetNewField = () => {
    setNewField({
      label: '',
      field_type: 'text',
      category: '',
      options: [],
      toggle_true_value: 'Yes',
      toggle_false_value: 'No',
      pricing_behavior: 'none',
      unit_price: 0,
      min_quantity: 1,
      max_quantity: null,
      default_quantity: 1,
      show_quantity_field: false,
      show_notes_field: true,
      allow_zero_price: true,
      help_text: ''
    });
    setNewOption('');
  };

  const handleCreateField = () => {
    if (!newField.label.trim()) {
      toast.error('Field label is required');
      return;
    }

    if (newField.field_type === 'select' && newField.options.length === 0) {
      toast.error('Dropdown fields require at least one option');
      return;
    }

    createFieldMutation.mutate(newField);
  };

  const addOption = () => {
    if (newOption.trim() && !newField.options.includes(newOption.trim())) {
      setNewField(prev => ({
        ...prev,
        options: [...prev.options, newOption.trim()]
      }));
      setNewOption('');
    }
  };

  const removeOption = (optionToRemove: string) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options.filter(option => option !== optionToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOption();
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus className="h-3 w-3 mr-1" />
          Create Field
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Field</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Basic Field Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Label *</Label>
              <Input
                value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                placeholder="Field label"
              />
            </div>
            
            <div>
              <Label>Type *</Label>
              <Select 
                value={newField.field_type} 
                onValueChange={(value) => setNewField({ ...newField, field_type: value, options: [] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="checkbox">Toggle</SelectItem>
                  <SelectItem value="select">Dropdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={newField.category} onValueChange={(value) => setNewField({ ...newField, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Help Text</Label>
              <Input
                value={newField.help_text}
                onChange={(e) => setNewField({ ...newField, help_text: e.target.value })}
                placeholder="Optional help text"
              />
            </div>
          </div>

          {/* Field Type Specific Options */}
          {newField.field_type === 'select' && (
            <div>
              <Label>Dropdown Options *</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Add option..."
                    onKeyPress={handleKeyPress}
                  />
                  <Button type="button" onClick={addOption} disabled={!newOption.trim()}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {newField.options.map((option, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {option}
                      <button
                        onClick={() => removeOption(option)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {newField.field_type === 'checkbox' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>False Value</Label>
                <Input
                  value={newField.toggle_false_value}
                  onChange={(e) => setNewField({ ...newField, toggle_false_value: e.target.value })}
                  placeholder="No"
                />
              </div>
              <div>
                <Label>True Value</Label>
                <Input
                  value={newField.toggle_true_value}
                  onChange={(e) => setNewField({ ...newField, toggle_true_value: e.target.value })}
                  placeholder="Yes"
                />
              </div>
            </div>
          )}

          {/* Pricing Configuration */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing Configuration
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pricing Type</Label>
                <Select 
                  value={newField.pricing_behavior} 
                  onValueChange={(value: any) => setNewField({ 
                    ...newField, 
                    pricing_behavior: value,
                    show_quantity_field: value === 'per_person' || value === 'quantity_based'
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Pricing</SelectItem>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="per_person">Per Person</SelectItem>
                    <SelectItem value="quantity_based">Quantity Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newField.pricing_behavior !== 'none' && (
                <div>
                  <Label className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Unit Price (£)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={newField.allow_zero_price ? "0" : "0.01"}
                    value={newField.unit_price}
                    onChange={(e) => setNewField({ ...newField, unit_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>

            {(newField.pricing_behavior === 'per_person' || newField.pricing_behavior === 'quantity_based') && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Min Quantity
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={newField.min_quantity}
                    onChange={(e) => setNewField({ ...newField, min_quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>Max Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newField.max_quantity || ''}
                    onChange={(e) => setNewField({ ...newField, max_quantity: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="No limit"
                  />
                </div>
                <div>
                  <Label>Default Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newField.default_quantity}
                    onChange={(e) => setNewField({ ...newField, default_quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-6 mt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-notes"
                  checked={newField.show_notes_field}
                  onCheckedChange={(checked) => setNewField({ ...newField, show_notes_field: checked })}
                />
                <Label htmlFor="show-notes" className="text-sm">Show Notes Field</Label>
              </div>
              
              {newField.pricing_behavior !== 'none' && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="allow-zero"
                    checked={newField.allow_zero_price}
                    onCheckedChange={(checked) => setNewField({ ...newField, allow_zero_price: checked })}
                  />
                  <Label htmlFor="allow-zero" className="text-sm">Allow Zero Price</Label>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreateField} disabled={createFieldMutation.isPending} className="flex-1">
              {createFieldMutation.isPending ? 'Creating...' : 'Create Field'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};