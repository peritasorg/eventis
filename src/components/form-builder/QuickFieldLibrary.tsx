
import React, { useState } from 'react';
import { Plus, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QuickFieldLibraryProps {
  onAddField: (fieldId: string) => void;
}

export const QuickFieldLibrary: React.FC<QuickFieldLibraryProps> = ({ onAddField }) => {
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
        .eq('active', true)
        .order('name');
      
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
      successMessage: 'Field created!',
      onSuccess: (data) => {
        setIsCreateOpen(false);
        refetch();
        onAddField(data.id);
      }
    }
  );

  const handleCreateField = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createFieldMutation.mutate({
      name: formData.get('label') as string,
      label: formData.get('label') as string,
      field_type: formData.get('field_type') as string,
      placeholder: formData.get('placeholder') as string || null,
      price_modifier: parseFloat(formData.get('price_modifier') as string) || 0,
      affects_pricing: formData.get('affects_pricing') === 'on',
      auto_add_price_field: true,
      auto_add_notes_field: formData.get('field_type') === 'checkbox',
      active: true
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Field Library
        </h3>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {fields?.map((field) => (
          <div
            key={field.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={() => onAddField(field.id)}
          >
            <div>
              <div className="font-medium text-sm">{field.label}</div>
              <div className="text-xs text-gray-500 capitalize">{field.field_type}</div>
            </div>
            {field.affects_pricing && (
              <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                £{field.price_modifier}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Add Field</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateField} className="space-y-4">
            <div>
              <Label htmlFor="label">Field Label *</Label>
              <Input 
                id="label" 
                name="label" 
                placeholder="e.g., Cake, Photography"
                required 
              />
            </div>
            
            <div>
              <Label htmlFor="field_type">Type *</Label>
              <Select name="field_type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Input</SelectItem>
                  <SelectItem value="textarea">Text Area</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="checkbox">Toggle (Yes/No)</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input 
                id="placeholder" 
                name="placeholder" 
                placeholder="Enter placeholder..."
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
            
            <div className="flex items-center space-x-2">
              <Switch id="affects_pricing" name="affects_pricing" />
              <Label htmlFor="affects_pricing">Affects pricing</Label>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFieldMutation.isPending}>
                {createFieldMutation.isPending ? 'Creating...' : 'Create & Add'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
