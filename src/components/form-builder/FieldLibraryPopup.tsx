
import React, { useState } from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FieldLibraryPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FieldLibraryPopup: React.FC<FieldLibraryPopupProps> = ({ isOpen, onClose }) => {
  const { currentTenant } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [dropdownOptions, setDropdownOptions] = useState<string[]>(['']);

  const { data: fields, refetch } = useSupabaseQuery(
    ['field-library'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  );

  const createFieldMutation = useSupabaseMutation(
    async (fieldData: any) => {
      const { data, error } = await supabase
        .from('field_library')
        .insert([{
          ...fieldData,
          tenant_id: currentTenant?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Field created successfully!',
      onSuccess: () => {
        setIsCreating(false);
        setDropdownOptions(['']);
        refetch();
      }
    }
  );

  const updateFieldMutation = useSupabaseMutation(
    async ({ id, ...fieldData }: any) => {
      const { data, error } = await supabase
        .from('field_library')
        .update(fieldData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Field updated successfully!',
      onSuccess: () => {
        setEditingField(null);
        setDropdownOptions(['']);
        refetch();
      }
    }
  );

  const deleteFieldMutation = useSupabaseMutation(
    async (fieldId: string) => {
      const { error } = await supabase
        .from('field_library')
        .delete()
        .eq('id', fieldId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field deleted successfully!',
      onSuccess: refetch
    }
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fieldType = formData.get('field_type') as string;
    
    const fieldData = {
      name: formData.get('label') as string,
      label: formData.get('label') as string,
      field_type: fieldType,
      placeholder: formData.get('placeholder') as string || null,
      help_text: formData.get('help_text') as string || null,
      category: formData.get('category') as string || null,
      price_modifier: parseFloat(formData.get('price_modifier') as string) || 0,
      affects_pricing: formData.get('affects_pricing') === 'on',
      auto_add_price_field: formData.get('auto_add_price_field') === 'on',
      auto_add_notes_field: formData.get('auto_add_notes_field') === 'on',
      options: fieldType === 'select' || fieldType === 'radio' ? 
        { values: dropdownOptions.filter(opt => opt.trim()) } : null,
      active: true
    };

    if (editingField) {
      updateFieldMutation.mutate({ id: editingField.id, ...fieldData });
    } else {
      createFieldMutation.mutate(fieldData);
    }
  };

  const startEdit = (field: any) => {
    setEditingField(field);
    if (field.options?.values) {
      setDropdownOptions([...field.options.values, '']);
    } else {
      setDropdownOptions(['']);
    }
    setIsCreating(true);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...dropdownOptions];
    newOptions[index] = value;
    
    // Add new empty option if this is the last one and has value
    if (index === newOptions.length - 1 && value.trim()) {
      newOptions.push('');
    }
    
    setDropdownOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (dropdownOptions.length > 1) {
      const newOptions = dropdownOptions.filter((_, i) => i !== index);
      setDropdownOptions(newOptions);
    }
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingField(null);
    setDropdownOptions(['']);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Field Library
            <Button onClick={() => setIsCreating(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Field
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isCreating ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="label">Field Label *</Label>
                <Input 
                  id="label" 
                  name="label" 
                  defaultValue={editingField?.label || ''}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="field_type">Field Type *</Label>
                <Select name="field_type" defaultValue={editingField?.field_type || ''} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose field type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Input</SelectItem>
                    <SelectItem value="textarea">Text Area</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                    <SelectItem value="radio">Radio Buttons</SelectItem>
                    <SelectItem value="date">Date Picker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="placeholder">Placeholder Text</Label>
                <Input 
                  id="placeholder" 
                  name="placeholder" 
                  defaultValue={editingField?.placeholder || ''}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input 
                  id="category" 
                  name="category" 
                  defaultValue={editingField?.category || ''}
                />
              </div>
            </div>

            {/* Dropdown Options - Show only for select/radio fields */}
            <div className="space-y-2">
              <Label>Dropdown/Radio Options</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {dropdownOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {dropdownOptions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                        className="px-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="help_text">Help Text</Label>
              <Textarea 
                id="help_text" 
                name="help_text" 
                defaultValue={editingField?.help_text || ''}
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price_modifier">Default Price (£)</Label>
                <Input 
                  id="price_modifier" 
                  name="price_modifier" 
                  type="number" 
                  step="0.01" 
                  defaultValue={editingField?.price_modifier || ''}
                />
              </div>
              <div className="space-y-3 pt-6">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="affects_pricing" 
                    name="affects_pricing" 
                    defaultChecked={editingField?.affects_pricing || false}
                  />
                  <Label htmlFor="affects_pricing">Affects pricing</Label>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="auto_add_price_field" 
                  name="auto_add_price_field" 
                  defaultChecked={editingField?.auto_add_price_field ?? true}
                />
                <Label htmlFor="auto_add_price_field">Auto-add price field</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="auto_add_notes_field" 
                  name="auto_add_notes_field" 
                  defaultChecked={editingField?.auto_add_notes_field ?? true}
                />
                <Label htmlFor="auto_add_notes_field">Auto-add notes field</Label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
              >
                {editingField ? 'Update' : 'Create'} Field
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {(!fields || fields.length === 0) ? (
              <div className="text-center py-12">
                <Plus className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No fields yet</h3>
                <p className="text-gray-600 mb-4">Create your first field to get started</p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Field
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {fields.map((field) => (
                  <Card key={field.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{field.label}</h4>
                          <p className="text-sm text-gray-600 capitalize">{field.field_type}</p>
                          {field.category && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-1 inline-block">
                              {field.category}
                            </span>
                          )}
                        </div>
                        {field.affects_pricing && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            £{field.price_modifier}
                          </span>
                        )}
                      </div>
                      
                      {field.help_text && (
                        <p className="text-xs text-gray-500 mb-3">{field.help_text}</p>
                      )}

                      {field.options?.values && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-600 mb-1">Options:</p>
                          <div className="flex flex-wrap gap-1">
                            {field.options.values.slice(0, 3).map((option: string, idx: number) => (
                              <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {option}
                              </span>
                            ))}
                            {field.options.values.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{field.options.values.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="flex gap-1">
                          {field.auto_add_price_field && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Auto Price
                            </span>
                          )}
                          {field.auto_add_notes_field && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              Auto Notes
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => startEdit(field)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteFieldMutation.mutate(field.id)}
                            disabled={deleteFieldMutation.isPending}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
