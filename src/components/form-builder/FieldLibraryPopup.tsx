import React, { useState, useMemo } from 'react';
import { Plus, Edit3, Trash2, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface FieldLibraryPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FieldLibraryPopup: React.FC<FieldLibraryPopupProps> = ({ isOpen, onClose }) => {
  const { currentTenant } = useAuth();
  const isMobile = useIsMobile();
  const [isCreating, setIsCreating] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [fieldType, setFieldType] = useState('text');
  const [searchTerm, setSearchTerm] = useState('');
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

  // Filter fields based on search term
  const filteredFields = useMemo(() => {
    if (!fields) return [];
    if (!searchTerm.trim()) return fields;
    
    return fields.filter(field => 
      field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.field_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (field.category && field.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [fields, searchTerm]);

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
    
    const fieldName = formData.get('label') as string;
    
    // Check for duplicate field names (case-insensitive)
    const existingField = fields?.find(field => 
      field.label.toLowerCase() === fieldName.toLowerCase() && 
      (!editingField || field.id !== editingField.id)
    );
    
    if (existingField) {
      toast.error('A field with this name already exists. Please choose a different name.');
      return;
    }

    const fieldData = {
      name: fieldName,
      label: fieldName,
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
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh] p-0' : 'max-w-6xl max-h-[90vh]'} overflow-hidden flex flex-col`}>
        {/* Header */}
        <DialogHeader className={`${isMobile ? 'p-4' : 'pb-4'} border-b`}>
          <DialogTitle className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-center`}>Field Library Management</DialogTitle>
        </DialogHeader>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {isCreating ? (
            <div className="h-full overflow-y-auto p-4 sm:p-6">
              <form onSubmit={handleSubmit} className={`space-y-4 ${isMobile ? '' : 'max-w-4xl mx-auto'}`}>
                <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border">
                  <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 mb-4 sm:mb-6`}>
                    {editingField ? 'Edit Field' : 'Create New Field'}
                  </h3>
                  
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 sm:gap-6`}>
                    <div>
                      <Label htmlFor="label" className="text-sm font-medium text-gray-700">Field Label *</Label>
                      <Input 
                        id="label" 
                        name="label" 
                        defaultValue={editingField?.label || ''}
                        placeholder="e.g., Cake Selection"
                        required 
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="field_type" className="text-sm font-medium text-gray-700">Field Type *</Label>
                      <Select value={fieldType} onValueChange={handleFieldTypeChange} required>
                        <SelectTrigger className="mt-2">
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
                  
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 sm:gap-6 mt-4 sm:mt-6`}>
                    <div>
                      <Label htmlFor="placeholder" className="text-sm font-medium text-gray-700">Placeholder Text</Label>
                      <Input 
                        id="placeholder" 
                        name="placeholder" 
                        placeholder="Enter placeholder text"
                        defaultValue={editingField?.placeholder || ''}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category" className="text-sm font-medium text-gray-700">Category</Label>
                      <Input 
                        id="category" 
                        name="category" 
                        placeholder="e.g., Catering, Decoration"
                        defaultValue={editingField?.category || ''}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  {(fieldType === 'select' || fieldType === 'radio') && (
                    <div className="mt-4 sm:mt-6">
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">Options & Pricing</Label>
                      <div className="bg-white rounded-lg border p-3 sm:p-4 max-h-64 overflow-y-auto">
                        <div className="space-y-3">
                          {dropdownOptions.map((option, index) => (
                            <div key={index} className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-12 gap-3'} items-center p-3 bg-gray-50 rounded-lg`}>
                              {isMobile ? (
                                <>
                                  <Input
                                    value={option.option}
                                    onChange={(e) => handleOptionChange(index, 'option', e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="text-sm"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      value={option.price}
                                      onChange={(e) => handleOptionChange(index, 'price', e.target.value)}
                                      placeholder="Price (£)"
                                      type="number"
                                      step="0.01"
                                      className="text-sm"
                                    />
                                    <Input
                                      value={option.notes}
                                      onChange={(e) => handleOptionChange(index, 'notes', e.target.value)}
                                      placeholder="Notes"
                                      className="text-sm"
                                    />
                                  </div>
                                  {dropdownOptions.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeOption(index)}
                                      className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Remove
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <>
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
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-end gap-3'} pt-4 sm:pt-6 border-t mt-4 sm:mt-6`}>
                    <Button type="button" variant="outline" onClick={resetForm} className={isMobile ? 'w-full' : ''}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
                      className={`bg-blue-600 hover:bg-blue-700 ${isMobile ? 'w-full' : ''}`}
                    >
                      {editingField ? 'Update Field' : 'Create Field'}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Search Bar */}
              <div className="p-4 sm:p-6 border-b">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search fields..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Fields Grid */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24">
                {(!filteredFields || filteredFields.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <Plus className="h-8 w-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm ? 'No fields found' : 'No fields created yet'}
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md">
                      {searchTerm 
                        ? `No fields match "${searchTerm}". Try a different search term.`
                        : 'Create reusable form fields that you can use across multiple event questionnaires.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2 xl:grid-cols-3'} gap-4 sm:gap-6`}>
                    {filteredFields.map((field) => (
                      <Card key={field.id} className="hover:shadow-md transition-shadow border border-gray-200">
                        <CardContent className={`${isMobile ? 'p-4' : 'p-5'}`}>
                          {/* Header section */}
                          <div className="mb-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className={`font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'} truncate pr-2`}>{field.label}</h4>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
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

                          {/* Options preview */}
                          {field.options?.values && field.options.values.length > 0 && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-md">
                              <p className="text-xs font-medium text-gray-700 mb-2">Options:</p>
                              <div className="space-y-1">
                                {field.options.values.slice(0, 2).map((option: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className="text-gray-700 truncate">
                                      {typeof option === 'string' ? option : option.option}
                                    </span>
                                    {typeof option === 'object' && option.price && (
                                      <span className="text-green-600 font-medium ml-2 flex-shrink-0">£{option.price}</span>
                                    )}
                                  </div>
                                ))}
                                {field.options.values.length > 2 && (
                                  <p className="text-xs text-gray-500 italic">
                                    +{field.options.values.length - 2} more
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Action buttons */}
                          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-2'} pt-3 border-t`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => startEdit(field)}
                              className={`${isMobile ? 'w-full justify-center' : 'flex-1'} text-sm`}
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => deleteFieldMutation.mutate(field.id)}
                              disabled={deleteFieldMutation.isPending}
                              className={`${isMobile ? 'w-full justify-center' : 'flex-1'} text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300`}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Fixed New Field Button */}
              <div className={`absolute ${isMobile ? 'bottom-4 right-4' : 'bottom-6 right-6'}`}>
                <Button 
                  onClick={() => setIsCreating(true)} 
                  size={isMobile ? "default" : "lg"}
                  className={`bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 ${isMobile ? 'rounded-full h-12 w-12 p-0' : 'rounded-full h-14 w-14 p-0'}`}
                >
                  <Plus className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
