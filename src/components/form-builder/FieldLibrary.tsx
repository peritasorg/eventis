import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const FieldLibrary = () => {
  const { currentTenant } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: fields, refetch } = useSupabaseQuery(
    ['field-library'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Field library error:', error);
        return [];
      }
      
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
        setIsCreateOpen(false);
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

  const handleCreateField = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createFieldMutation.mutate({
      name: formData.get('label') as string,
      label: formData.get('label') as string,
      field_type: formData.get('field_type') as string,
      help_text: formData.get('help_text') as string || null,
      price_modifier: parseFloat(formData.get('price_modifier') as string) || 0,
      affects_pricing: formData.get('affects_pricing') === 'on',
      auto_add_price_field: formData.get('auto_add_price_field') === 'on',
      auto_add_notes_field: formData.get('auto_add_notes_field') === 'on',
      active: true
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Field Library</h2>
          <p className="text-gray-600 text-sm">Manage your reusable form fields</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Field
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Field</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateField} className="space-y-4">
              <div>
                <Label htmlFor="label">Field Label *</Label>
                <Input 
                  id="label" 
                  name="label" 
                  placeholder="e.g., Cake, Photography, DJ"
                  required 
                />
              </div>
              
              <div>
                <Label htmlFor="field_type">Field Type *</Label>
                <Select name="field_type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Box</SelectItem>
                    <SelectItem value="toggle">Toggle (Yes/No)</SelectItem>
                    <SelectItem value="number">Price Field</SelectItem>
                    <SelectItem value="date">Date Field</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="help_text">Help Text (Optional)</Label>
                <Input 
                  id="help_text" 
                  name="help_text" 
                  placeholder="Additional instructions for this field"
                />
              </div>
              
              <div>
                <Label htmlFor="price_modifier">Default Price (£)</Label>
                <Input 
                  id="price_modifier" 
                  name="price_modifier" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch id="affects_pricing" name="affects_pricing" />
                  <Label htmlFor="affects_pricing">This field affects pricing</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="auto_add_price_field" name="auto_add_price_field" defaultChecked />
                  <Label htmlFor="auto_add_price_field">Auto-add price field</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="auto_add_notes_field" name="auto_add_notes_field" defaultChecked />
                  <Label htmlFor="auto_add_notes_field">Auto-add notes field</Label>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createFieldMutation.isPending}>
                  {createFieldMutation.isPending ? 'Creating...' : 'Create Field'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields?.map((field) => (
          <Card key={field.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{field.label}</span>
                {field.affects_pricing && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    £{field.price_modifier}
                  </span>
                )}
              </CardTitle>
              <div className="text-sm text-gray-600">{field.field_type}</div>
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
                
                <div className="flex justify-end pt-2 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteFieldMutation.mutate(field.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {(!fields || fields.length === 0) && (
          <div className="col-span-full text-center py-12">
            <Plus className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No fields yet</h3>
            <p className="text-gray-600 mb-4">Create your first reusable field</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Field
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
