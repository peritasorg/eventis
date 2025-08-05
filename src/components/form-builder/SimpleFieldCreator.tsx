import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SimpleFieldCreatorProps {
  formId: string;
  onFieldAdded: () => void;
}

export const SimpleFieldCreator: React.FC<SimpleFieldCreatorProps> = ({ formId, onFieldAdded }) => {
  const { currentTenant } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newField, setNewField] = useState({
    label: '',
    field_type: 'text',
    help_text: '',
    price_modifier: 0,
    affects_pricing: false
  });

  // Fetch existing fields in library
  const { data: fieldLibrary } = useSupabaseQuery(
    ['field-library'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('label');
      
      if (error) throw error;
      return data || [];
    }
  );

  // Fetch fields already in this form
  const { data: formFields } = useSupabaseQuery(
    ['form-fields', formId],
    async () => {
      if (!formId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .select('field_library_id')
        .eq('form_template_id', formId);
      
      if (error) throw error;
      return data?.map(f => f.field_library_id) || [];
    }
  );

  // Create new field mutation
  const createFieldMutation = useSupabaseMutation(
    async (fieldData: any) => {
      // Generate a simple name from label
      const name = fieldData.label
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 50) + '_' + Date.now();

      console.log('🔵 Creating field with data:', { ...fieldData, name });

      const { data, error } = await supabase
        .from('field_library')
        .insert([{
          name: name,
          label: fieldData.label,
          field_type: fieldData.field_type,
          help_text: fieldData.help_text || null,
          price_modifier: fieldData.affects_pricing ? fieldData.price_modifier : 0,
          affects_pricing: fieldData.affects_pricing,
          tenant_id: currentTenant?.id,
          active: true
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Field creation error:', error);
        throw error;
      }

      console.log('✅ Field created successfully:', data);
      return data;
    },
    {
      successMessage: 'Field created!',
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        setNewField({
          label: '',
          field_type: 'text',
          help_text: '',
          price_modifier: 0,
          affects_pricing: false
        });
      }
    }
  );

  // Add existing field to form mutation
  const addFieldToFormMutation = useSupabaseMutation(
    async (fieldLibraryId: string) => {
      const { data: maxOrderResult } = await supabase
        .from('form_field_instances')
        .select('field_order')
        .eq('form_template_id', formId)
        .order('field_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (maxOrderResult?.field_order || 0) + 1;

      const { error } = await supabase
        .from('form_field_instances')
        .insert([{
          form_template_id: formId,
          field_library_id: fieldLibraryId,
          field_order: nextOrder,
          tenant_id: currentTenant?.id
        }]);

      if (error) throw error;
    },
    {
      successMessage: 'Field added to form!',
      onSuccess: onFieldAdded
    }
  );

  const handleCreateField = () => {
    if (!newField.label.trim()) {
      toast.error('Field label is required');
      return;
    }

    createFieldMutation.mutate(newField);
  };

  // Filter available fields (not already in form)
  const availableFields = fieldLibrary?.filter(field => 
    !formFields?.includes(field.id) &&
    field.label.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Fields</CardTitle>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1">
                <Plus className="h-3 w-3 mr-1" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Field</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Label *</Label>
                  <Input
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    placeholder="Field label"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={newField.field_type} onValueChange={(value) => setNewField({ ...newField, field_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                      <SelectItem value="checkbox">Toggle/Checkbox</SelectItem>
                      <SelectItem value="select">Select Dropdown</SelectItem>
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newField.affects_pricing}
                    onChange={(e) => setNewField({ ...newField, affects_pricing: e.target.checked })}
                    className="rounded"
                  />
                  <Label>Affects Pricing</Label>
                </div>
                {newField.affects_pricing && (
                  <div>
                    <Label>Price (£)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newField.price_modifier}
                      onChange={(e) => setNewField({ ...newField, price_modifier: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateField} disabled={createFieldMutation.isPending} className="flex-1">
                    {createFieldMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8"
          />
        </div>

        {/* Available Fields */}
        <div className="space-y-2">
          {availableFields.map((field) => (
            <div key={field.id} className="p-2 border rounded-md hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{field.label}</div>
                  <div className="text-xs text-gray-500 capitalize">{field.field_type}</div>
                  {field.affects_pricing && (
                    <div className="text-xs text-green-600">£{field.price_modifier}</div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => addFieldToFormMutation.mutate(field.id)}
                  disabled={addFieldToFormMutation.isPending}
                  className="h-6 w-6 p-0 ml-2"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {field.help_text && (
                <div className="text-xs text-gray-400 mt-1 truncate">{field.help_text}</div>
              )}
            </div>
          ))}

          {availableFields.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Plus className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchTerm ? 'No fields match your search' : 'No fields available'}
              </p>
              <p className="text-xs mt-1">Create your first field to get started</p>
            </div>
          )}
        </div>
      </CardContent>
    </div>
  );
};