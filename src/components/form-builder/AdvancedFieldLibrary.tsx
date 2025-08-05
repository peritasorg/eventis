import React, { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AdvancedFieldLibraryProps {
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

export const AdvancedFieldLibrary: React.FC<AdvancedFieldLibraryProps> = ({ formId, onFieldAdded }) => {
  const { currentTenant } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [newField, setNewField] = useState({
    label: '',
    field_type: 'text',
    category: '',
    options: [] as string[],
    toggle_true_value: 'Yes',
    toggle_false_value: 'No'
  });

  const [newOption, setNewOption] = useState('');

  // Fetch field library with enhanced search
  const { data: fieldLibrary } = useSupabaseQuery(
    ['field-library-advanced', searchTerm, selectedCategory],
    async () => {
      if (!currentTenant?.id) return [];
      
      let query = supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);

      // Apply search filter
      if (searchTerm) {
        query = query.ilike('label', `%${searchTerm}%`);
      }

      // Apply category filter
      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      query = query.order('label');
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  );

  // Fetch fields already in this form
  const { data: formFieldIds } = useSupabaseQuery(
    ['form-field-ids', formId],
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
      const name = fieldData.label
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 50) + '_' + Date.now();

      let options = null;
      
      // Set options based on field type
      if (fieldData.field_type === 'select') {
        options = fieldData.options;
      } else if (fieldData.field_type === 'checkbox') {
        options = [fieldData.toggle_false_value, fieldData.toggle_true_value];
      }

      const { data, error } = await supabase
        .from('field_library')
        .insert([{
          name: name,
          label: fieldData.label,
          field_type: fieldData.field_type,
          category: fieldData.category || null,
          options: options,
          tenant_id: currentTenant?.id,
          active: true
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Field created successfully!',
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        resetNewField();
      }
    }
  );

  // Add field to form mutation
  const addFieldToFormMutation = useSupabaseMutation(
    async (fieldLibraryId: string) => {
      // Check if field already exists in form
      if (formFieldIds?.includes(fieldLibraryId)) {
        throw new Error('Field is already in this form');
      }

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

  const resetNewField = () => {
    setNewField({
      label: '',
      field_type: 'text',
      category: '',
      options: [],
      toggle_true_value: 'Yes',
      toggle_false_value: 'No'
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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
  };

  const availableFields = fieldLibrary?.filter(field => 
    !formFieldIds?.includes(field.id)
  ) || [];

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOption();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Field Library</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8"
            >
              <Filter className="h-3 w-3 mr-1" />
              Filter
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8">
                  <Plus className="h-3 w-3 mr-1" />
                  Create Field
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
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
                    <Label>Type *</Label>
                    <Select value={newField.field_type} onValueChange={(value) => setNewField({ ...newField, field_type: value, options: [] })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="checkbox">Toggle</SelectItem>
                        <SelectItem value="select">Dropdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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

                  {/* Dropdown Options */}
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

                  {/* Toggle Values */}
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

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleCreateField} disabled={createFieldMutation.isPending} className="flex-1">
                      {createFieldMutation.isPending ? 'Creating...' : 'Create Field'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search fields by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-3 p-3 bg-muted rounded-md">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {FIELD_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full h-6">
              Clear Filters
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-2">
        {availableFields.map((field) => (
          <div key={field.id} className="p-3 border rounded-md hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-medium text-sm truncate">{field.label}</div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {field.field_type === 'checkbox' ? 'Toggle' : field.field_type === 'select' ? 'Dropdown' : 'Text'}
                  </Badge>
                </div>
                
                {field.category && (
                  <Badge variant="secondary" className="text-xs mb-1">
                    {field.category}
                  </Badge>
                )}

                {field.options && field.options.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Options: {Array.isArray(field.options) ? field.options.join(', ') : field.options}
                  </div>
                )}
              </div>
              
              <Button
                size="sm"
                onClick={() => addFieldToFormMutation.mutate(field.id)}
                disabled={addFieldToFormMutation.isPending}
                className="h-7 w-7 p-0 shrink-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        {availableFields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchTerm || selectedCategory 
                ? 'No fields match your filters' 
                : 'No available fields'
              }
            </p>
            <p className="text-xs mt-1">
              {searchTerm || selectedCategory
                ? 'Try adjusting your search or filters'
                : 'Create your first field to get started'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};