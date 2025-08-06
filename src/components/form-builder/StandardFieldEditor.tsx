import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, DollarSign, Users } from 'lucide-react';
import { toast } from 'sonner';

const FIELD_CATEGORIES = [
  'Basic Info',
  'Food & Beverage',
  'Decorations', 
  'Equipment',
  'Services',
  'Logistics',
  'Entertainment',
  'Venue'
];

const FIELD_TYPES = [
  { value: 'toggle', label: 'Toggle' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'text', label: 'Text' }
];

const PRICING_BEHAVIORS = [
  { value: 'none', label: 'No Pricing' },
  { 
    value: 'fixed', 
    label: 'Fixed Price', 
    example: 'Same price regardless of guest count (e.g., DJ service £500)'
  },
  { 
    value: 'per_person', 
    label: 'Per Person', 
    example: 'Price multiplied by guest count (e.g., Menu £25 per person)'
  }
];

interface StandardFieldEditorProps {
  isOpen: boolean;
  onClose: () => void;
  field?: any; // null for create mode, populated for edit mode
  onSuccess: () => void;
  formId?: string; // Optional: if editing from form builder, auto-add to form
}

export const StandardFieldEditor: React.FC<StandardFieldEditorProps> = ({
  isOpen,
  onClose,
  field,
  onSuccess,
  formId
}) => {
  const { currentTenant } = useAuth();
  const [formData, setFormData] = useState({
    label: '',
    category: '',
    field_type: 'toggle',
    options: [] as string[],
    pricing_type: 'none',
    show_notes_field: true
  });
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (field) {
      // Edit mode - populate form
      setFormData({
        label: field.label || '',
        category: field.category || '',
        field_type: field.field_type || 'toggle',
        options: field.options || [],
        pricing_type: field.pricing_behavior || 'none',
        show_notes_field: field.show_notes_field !== false
      });
    } else {
      // Create mode - reset form
      setFormData({
        label: '',
        category: '',
        field_type: 'toggle',
        options: [],
        pricing_type: 'none',
        show_notes_field: true
      });
    }
    setNewOption('');
  }, [field, isOpen]);

  const createFieldMutation = useSupabaseMutation(
    async (data: any) => {
      const fieldData = {
        tenant_id: currentTenant?.id,
        name: data.label.toLowerCase().replace(/\s+/g, '_'),
        label: data.label,
        category: data.category,
        field_type: data.field_type,
        options: data.field_type === 'select' ? data.options : [],
        pricing_behavior: data.pricing_type,
        show_notes_field: data.show_notes_field,
        active: true,
        required: true,
        sort_order: 0
      };

      const { data: newField, error } = await supabase
        .from('field_library')
        .insert([fieldData])
        .select()
        .single();

      if (error) throw error;

      // If formId provided, also add to form
      if (formId) {
        const { data: maxOrder } = await supabase
          .from('form_field_instances')
          .select('field_order')
          .eq('form_template_id', formId)
          .order('field_order', { ascending: false })
          .limit(1);

        const nextOrder = (maxOrder?.[0]?.field_order || 0) + 1;

        const { error: instanceError } = await supabase
          .from('form_field_instances')
          .insert([{
            tenant_id: currentTenant?.id,
            form_template_id: formId,
            field_library_id: newField.id,
            field_order: nextOrder
          }]);

        if (instanceError) throw instanceError;
      }

      return newField;
    },
    {
      onSuccess: () => {
        toast.success('Field created successfully');
        onSuccess();
        onClose();
      },
      onError: (error) => {
        toast.error('Failed to create field: ' + error.message);
      }
    }
  );

  const updateFieldMutation = useSupabaseMutation(
    async (data: any) => {
      const fieldData = {
        name: data.label.toLowerCase().replace(/\s+/g, '_'),
        label: data.label,
        category: data.category,
        field_type: data.field_type,
        options: data.field_type === 'select' ? data.options : [],
        pricing_behavior: data.pricing_type,
        show_notes_field: data.show_notes_field,
        updated_at: new Date().toISOString()
      };

      const { data: updatedField, error } = await supabase
        .from('field_library')
        .update(fieldData)
        .eq('id', field.id)
        .select()
        .single();

      if (error) throw error;
      return updatedField;
    },
    {
      onSuccess: () => {
        toast.success('Field updated successfully');
        onSuccess();
        onClose();
      },
      onError: (error) => {
        toast.error('Failed to update field: ' + error.message);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.label.trim()) {
      toast.error('Please enter a field label');
      return;
    }

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    if (formData.field_type === 'select' && formData.options.length === 0) {
      toast.error('Please add at least one option for dropdown fields');
      return;
    }

    if (field) {
      updateFieldMutation.mutate(formData);
    } else {
      createFieldMutation.mutate(formData);
    }
  };

  const addOption = () => {
    if (newOption.trim() && !formData.options.includes(newOption.trim())) {
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOption();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{field ? 'Edit Field' : 'Create New Field'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="label">Field Label *</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              placeholder="e.g., DJ Services"
              required
            />
          </div>

          <div>
            <Label htmlFor="field_type">Field Type *</Label>
            <Select 
              value={formData.field_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, field_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.field_type === 'select' && (
            <div>
              <Label>Dropdown Options *</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add option"
                  onKeyPress={handleKeyPress}
                />
                <Button type="button" onClick={addOption} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm">{option}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {FIELD_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Default Pricing Type</Label>
            <Select 
              value={formData.pricing_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, pricing_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRICING_BEHAVIORS.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        {type.value === 'fixed' ? (
                          <DollarSign className="h-3 w-3" />
                        ) : type.value === 'per_person' ? (
                          <Users className="h-3 w-3" />
                        ) : null}
                        {type.label}
                      </div>
                      {type.example && (
                        <span className="text-xs text-muted-foreground">{type.example}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="show-notes"
              checked={formData.show_notes_field}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_notes_field: checked }))}
            />
            <Label htmlFor="show-notes" className="text-sm">Show notes field</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
            >
              {field ? 'Update Field' : 'Create Field'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};