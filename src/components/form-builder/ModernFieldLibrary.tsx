
import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const ModernFieldLibrary = () => {
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
      placeholder: formData.get('placeholder') as string || null,
      help_text: formData.get('help_text') as string || null,
      category: formData.get('category') as string || null,
      price_modifier: parseFloat(formData.get('price_modifier') as string) || 0,
      affects_pricing: formData.get('affects_pricing') === 'on',
      auto_add_price_field: formData.get('auto_add_price_field') === 'on',
      auto_add_notes_field: formData.get('auto_add_notes_field') === 'on',
      active: true
    });
  };

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return '📝';
      case 'textarea': return '📄';
      case 'number': return '🔢';
      case 'select': return '📋';
      case 'checkbox': return '☑️';
      case 'radio': return '🔘';
      case 'date': return '📅';
      default: return '📝';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-full mb-4">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold">Field Library</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Build Amazing Forms</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create reusable form fields that make building questionnaires quick and easy
          </p>
        </div>

        {/* Create Field Button */}
        <div className="flex justify-center mb-8">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                <Plus className="h-5 w-5 mr-2" />
                Create New Field
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Create New Field
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateField} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="label" className="text-sm font-medium">Field Label *</Label>
                    <Input 
                      id="label" 
                      name="label" 
                      placeholder="e.g., Guest Count, Special Requests"
                      required 
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="field_type" className="text-sm font-medium">Field Type *</Label>
                    <Select name="field_type" required>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose field type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">📝 Text Input</SelectItem>
                        <SelectItem value="textarea">📄 Text Area</SelectItem>
                        <SelectItem value="number">🔢 Number</SelectItem>
                        <SelectItem value="select">📋 Dropdown</SelectItem>
                        <SelectItem value="checkbox">☑️ Checkbox</SelectItem>
                        <SelectItem value="radio">🔘 Radio Buttons</SelectItem>
                        <SelectItem value="date">📅 Date Picker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="placeholder" className="text-sm font-medium">Placeholder Text</Label>
                    <Input 
                      id="placeholder" 
                      name="placeholder" 
                      placeholder="Enter placeholder text..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                    <Input 
                      id="category" 
                      name="category" 
                      placeholder="e.g., Catering, Decoration"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="help_text" className="text-sm font-medium">Help Text</Label>
                  <Textarea 
                    id="help_text" 
                    name="help_text" 
                    placeholder="Additional instructions for users..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-gray-900">Pricing Options</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price_modifier" className="text-sm font-medium">Default Price (£)</Label>
                      <Input 
                        id="price_modifier" 
                        name="price_modifier" 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    <div className="space-y-3 pt-6">
                      <div className="flex items-center space-x-2">
                        <Switch id="affects_pricing" name="affects_pricing" />
                        <Label htmlFor="affects_pricing" className="text-sm">Affects pricing</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="auto_add_price_field" name="auto_add_price_field" defaultChecked />
                      <Label htmlFor="auto_add_price_field" className="text-sm">Auto-add price field</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="auto_add_notes_field" name="auto_add_notes_field" defaultChecked />
                      <Label htmlFor="auto_add_notes_field" className="text-sm">Auto-add notes field</Label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createFieldMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {createFieldMutation.isPending ? 'Creating...' : 'Create Field'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Fields Grid */}
        {(!fields || fields.length === 0) ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
              <Zap className="h-12 w-12 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No fields yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Get started by creating your first reusable form field. It's quick and easy!
            </p>
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Field
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {fields.map((field) => (
              <Card 
                key={field.id} 
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getFieldIcon(field.field_type)}</div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900">
                          {field.label}
                        </CardTitle>
                        <p className="text-sm text-gray-500 capitalize">
                          {field.field_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    {field.affects_pricing && (
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        £{field.price_modifier}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {field.category && (
                      <div className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {field.category}
                      </div>
                    )}
                    
                    {field.help_text && (
                      <p className="text-xs text-gray-600 line-clamp-2">{field.help_text}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-1">
                      {field.auto_add_price_field && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Auto Price
                        </span>
                      )}
                      {field.auto_add_notes_field && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                          Auto Notes
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t">
                      <div className="text-xs text-gray-500">
                        Used {field.usage_count || 0} times
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteFieldMutation.mutate(field.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
