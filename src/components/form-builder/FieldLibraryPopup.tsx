import React, { useState } from 'react';
import { Plus, Edit3, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [fieldType, setFieldType] = useState('text');
  const [dropdownOptions, setDropdownOptions] = useState<Array<{option: string, price: string, notes: string}>>([{option: '', price: '', notes: ''}]);

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
        resetForm();
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
        resetForm();
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
    
    const fieldData = {
      name: formData.get('label') as string,
      label: formData.get('label') as string,
      field_type: fieldType,
      placeholder: formData.get('placeholder') as string || null,
      category: formData.get('category') as string || null,
      affects_pricing: true, // Always true as per requirement
      options: fieldType === 'select' || fieldType === 'radio' ? 
        { 
          values: dropdownOptions
            .filter(opt => opt.option.trim())
            .map(opt => ({
              option: opt.option,
              price: parseFloat(opt.price) || 0,
              notes: opt.notes || ''
            }))
        } : null,
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
    setFieldType(field.field_type);
    if (field.options?.values) {
      const formattedOptions = field.options.values.map((val: any) => ({
        option: typeof val === 'string' ? val : val.option || '',
        price: typeof val === 'object' ? val.price?.toString() || '' : '',
        notes: typeof val === 'object' ? val.notes || '' : ''
      }));
      setDropdownOptions([...formattedOptions, {option: '', price: '', notes: ''}]);
    } else {
      setDropdownOptions([{option: '', price: '', notes: ''}]);
    }
    setIsCreating(true);
  };

  const handleOptionChange = (index: number, field: 'option' | 'price' | 'notes', value: string) => {
    const newOptions = [...dropdownOptions];
    newOptions[index][field] = value;
    
    // Add new empty option if this is the last one and has an option value
    if (index === newOptions.length - 1 && field === 'option' && value.trim()) {
      newOptions.push({option: '', price: '', notes: ''});
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
    setFieldType('text');
    setDropdownOptions([{option: '', price: '', notes: ''}]);
  };

  const handleFieldTypeChange = (value: string) => {
    setFieldType(value);
    if (value !== 'select' && value !== 'radio') {
      setDropdownOptions([{option: '', price: '', notes: ''}]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header with better spacing */}
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Field Library Management</DialogTitle>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setIsCreating(true)} 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Field
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content area with proper scrolling */}
        <div className="flex-1 overflow-hidden">
          {isCreating ? (
            <div className="h-full overflow-y-auto p-1">
              <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
                <div className="bg-blue-50 p-4 rounded-lg border">
                  <h3 className="text-lg font-medium text-blue-900 mb-4">
                    {editingField ? 'Edit Field' : 'Create New Field'}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="label" className="text-sm font-medium text-gray-700">Field Label *</Label>
                      <Input 
                        id="label" 
                        name="label" 
                        defaultValue={editingField?.label || ''}
                        placeholder="e.g., Cake Selection"
                        required 
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="field_type" className="text-sm font-medium text-gray-700">Field Type *</Label>
                      <Select value={fieldType} onValueChange={handleFieldTypeChange} required>
                        <SelectTrigger className="mt-1">
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
                  
                  <div className="grid grid-cols-2 gap-6 mt-4">
                    <div>
                      <Label htmlFor="placeholder" className="text-sm font-medium text-gray-700">Placeholder Text</Label>
                      <Input 
                        id="placeholder" 
                        name="placeholder" 
                        placeholder="Enter placeholder text"
                        defaultValue={editingField?.placeholder || ''}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category" className="text-sm font-medium text-gray-700">Category</Label>
                      <Input 
                        id="category" 
                        name="category" 
                        placeholder="e.g., Catering, Decoration"
                        defaultValue={editingField?.category || ''}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  {(fieldType === 'select' || fieldType === 'radio') && (
                    <div className="mt-6">
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">Options & Pricing</Label>
                      <div className="bg-white rounded-lg border p-4 max-h-64 overflow-y-auto">
                        <div className="space-y-3">
                          {dropdownOptions.map((option, index) => (
                            <div key={index} className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                              <div className="col-span-5">
                                <Input
                                  value={option.option}
                                  onChange={(e) => handleOptionChange(index, 'option', e.target.value)}
                                  placeholder={`Option ${index + 1}`}
                                  className="text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  value={option.price}
                                  onChange={(e) => handleOptionChange(index, 'price', e.target.value)}
                                  placeholder="Price (£)"
                                  type="number"
                                  step="0.01"
                                  className="text-sm"
                                />
                              </div>
                              <div className="col-span-4">
                                <Input
                                  value={option.notes}
                                  onChange={(e) => handleOptionChange(index, 'notes', e.target.value)}
                                  placeholder="Notes (optional)"
                                  className="text-sm"
                                />
                              </div>
                              <div className="col-span-1 flex justify-center">
                                {dropdownOptions.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeOption(index)}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {editingField ? 'Update Field' : 'Create Field'}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-1">
              {(!fields || fields.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Plus className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No fields created yet</h3>
                  <p className="text-gray-600 mb-6 max-w-md">
                    Create reusable form fields that you can use across multiple event questionnaires.
                  </p>
                  <Button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Field
                  </Button>
                </div>
              ) : (
                <div className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {fields.map((field) => (
                      <Card key={field.id} className="hover:shadow-md transition-all duration-200 border border-gray-200">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 truncate">{field.label}</h4>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Pricing
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 capitalize mb-2">{field.field_type.replace('_', ' ')}</p>
                              {field.category && (
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                  {field.category}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Options preview */}
                          {field.options?.values && field.options.values.length > 0 && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-700 mb-2">Options:</p>
                              <div className="space-y-1">
                                {field.options.values.slice(0, 3).map((option: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className="text-gray-700">
                                      {typeof option === 'string' ? option : option.option}
                                    </span>
                                    {typeof option === 'object' && option.price && (
                                      <span className="text-green-600 font-medium">£{option.price}</span>
                                    )}
                                  </div>
                                ))}
                                {field.options.values.length > 3 && (
                                  <p className="text-xs text-gray-500 italic">
                                    +{field.options.values.length - 3} more options
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Action buttons */}
                          <div className="flex justify-end gap-2 pt-3 border-t">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => startEdit(field)}
                              className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deleteFieldMutation.mutate(field.id)}
                              disabled={deleteFieldMutation.isPending}
                              className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
