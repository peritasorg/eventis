
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const FieldLibraryManager = () => {
  const { currentTenant } = useAuth();
  const [isCreateFieldOpen, setIsCreateFieldOpen] = useState(false);

  const { data: fieldLibrary, refetch } = useSupabaseQuery(
    ['field-library'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('name');
      
      if (error) {
        console.error('Field library error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const createFieldMutation = useSupabaseMutation(
    async (fieldData: any) => {
      console.log('🚀 FieldLibraryManager: Creating field with data:', fieldData);
      
      // Ensure all required fields are present and valid
      if (!fieldData.name || !fieldData.label || !fieldData.field_type) {
        throw new Error('Missing required fields');
      }
      
      // Create the field with explicit required fields
      const insertData = {
        name: fieldData.name,
        label: fieldData.label,
        field_type: fieldData.field_type,
        placeholder: fieldData.placeholder || null,
        help_text: fieldData.help_text || null,
        category: fieldData.category || null,
        affects_pricing: fieldData.affects_pricing || false,
        auto_add_price_field: fieldData.auto_add_price_field || false,
        auto_add_notes_field: fieldData.auto_add_notes_field || false,
        price_modifier: fieldData.price_modifier || 0,
        active: true,
        tenant_id: currentTenant?.id
      };
      
      console.log('🚀 FieldLibraryManager: Inserting data:', insertData);
      
      const { data, error } = await supabase
        .from('field_library')
        .insert([insertData])
        .select()
        .single();
      
      if (error) {
        console.error('❌ FieldLibraryManager: Database error:', error);
        throw error;
      }
      
      console.log('✅ FieldLibraryManager: Field created successfully:', data);
      return data;
    },
    {
      successMessage: 'Field created successfully!',
      onSuccess: () => {
        setIsCreateFieldOpen(false);
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

  const generateFieldName = (label: string): string => {
    const baseName = label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    const timestamp = Date.now().toString().slice(-6);
    return baseName || `field_${timestamp}`;
  };

  const handleCreateField = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const label = formData.get('label') as string;
    const nameInput = formData.get('name') as string;
    
    // Generate name automatically if not provided or use provided name
    const fieldName = nameInput?.trim() || generateFieldName(label);
    
    console.log('🔍 FieldLibraryManager: Form data collected:', {
      nameInput,
      label,
      generatedName: fieldName
    });
    
    const fieldData = {
      name: fieldName,
      label: label,
      field_type: formData.get('field_type') as string,
      placeholder: formData.get('placeholder') as string,
      help_text: formData.get('help_text') as string,
      category: formData.get('category') as string,
      affects_pricing: formData.get('affects_pricing') === 'on',
      auto_add_price_field: formData.get('auto_add_price_field') === 'on',
      auto_add_notes_field: formData.get('auto_add_notes_field') === 'on',
      price_modifier: parseFloat(formData.get('price_modifier') as string) || 0,
      active: true
    };

    console.log('🔍 FieldLibraryManager: Final field data:', fieldData);
    createFieldMutation.mutate(fieldData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Field Library</h2>
          <p className="text-gray-600 text-sm">Manage your reusable form fields</p>
        </div>
        
        <Dialog open={isCreateFieldOpen} onOpenChange={setIsCreateFieldOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Field
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Field</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateField} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="field_name" className="text-sm">Field Name *</Label>
                  <Input id="field_name" name="name" required className="h-9" />
                </div>
                <div>
                  <Label htmlFor="field_label" className="text-sm">Display Label *</Label>
                  <Input id="field_label" name="label" required className="h-9" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="field_type" className="text-sm">Field Type *</Label>
                  <Select name="field_type" required>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select field type" />
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
                <div>
                  <Label htmlFor="category" className="text-sm">Category</Label>
                  <Input id="category" name="category" placeholder="e.g., Catering, Decoration" className="h-9" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="placeholder" className="text-sm">Placeholder Text</Label>
                <Input id="placeholder" name="placeholder" className="h-9" />
              </div>
              
              <div>
                <Label htmlFor="help_text" className="text-sm">Help Text</Label>
                <Textarea id="help_text" name="help_text" rows={2} />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch id="affects_pricing" name="affects_pricing" />
                  <Label htmlFor="affects_pricing" className="text-sm">Affects Pricing</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="auto_add_price_field" name="auto_add_price_field" defaultChecked />
                  <Label htmlFor="auto_add_price_field" className="text-sm">Auto-add Price Field</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="auto_add_notes_field" name="auto_add_notes_field" defaultChecked />
                  <Label htmlFor="auto_add_notes_field" className="text-sm">Auto-add Notes Field</Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="price_modifier" className="text-sm">Default Price (£)</Label>
                <Input 
                  id="price_modifier" 
                  name="price_modifier" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  className="h-9" 
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateFieldOpen(false)} size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createFieldMutation.isPending} size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  {createFieldMutation.isPending ? 'Creating...' : 'Create Field'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fieldLibrary?.map((field) => (
          <Card key={field.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="truncate">{field.label}</span>
                {field.affects_pricing && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    £{field.price_modifier}
                  </span>
                )}
              </CardTitle>
              <div className="text-sm text-gray-600">
                <div>{field.field_type}</div>
                {field.category && (
                  <div className="text-xs text-blue-600">{field.category}</div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {field.help_text && (
                  <p className="text-xs text-gray-500">{field.help_text}</p>
                )}
                
                <div className="flex flex-wrap gap-1">
                  {field.auto_add_price_field && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      Auto Price
                    </span>
                  )}
                  {field.auto_add_notes_field && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                      Auto Notes
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between pt-2 border-t">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" title="Edit" className="h-7 w-7 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    title="Delete"
                    onClick={() => deleteFieldMutation.mutate(field.id)}
                    disabled={deleteFieldMutation.isPending}
                    className="h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {(!fieldLibrary || fieldLibrary.length === 0) && (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 mb-4">
              <Plus className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No fields yet</h3>
            <p className="text-gray-600 mb-4">Create your first field to get started</p>
            <Button onClick={() => setIsCreateFieldOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Field
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
