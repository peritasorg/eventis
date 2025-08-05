import React, { useState } from 'react';
import { Plus, Search, Tag, Filter, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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

const COMMON_TAGS = [
  'premium', 'basic', 'seasonal', 'wedding', 'corporate', 'birthday', 
  'anniversary', 'halal', 'vegetarian', 'alcohol', 'setup', 'cleanup',
  'audio', 'visual', 'lighting', 'furniture', 'security'
];

export const AdvancedFieldLibrary: React.FC<AdvancedFieldLibraryProps> = ({ formId, onFieldAdded }) => {
  const { currentTenant } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const [newField, setNewField] = useState({
    label: '',
    field_type: 'text',
    help_text: '',
    category: '',
    tags: [] as string[],
    price_modifier: 0,
    affects_pricing: false,
    pricing_type: 'fixed'
  });

  // Fetch field library with enhanced search
  const { data: fieldLibrary } = useSupabaseQuery(
    ['field-library-advanced', searchTerm, selectedCategory, selectedTags.join(',')],
    async () => {
      if (!currentTenant?.id) return [];
      
      let query = supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);

      // Apply search filter
      if (searchTerm) {
        query = query.or(`label.ilike.%${searchTerm}%,help_text.ilike.%${searchTerm}%`);
      }

      // Apply category filter
      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      // Apply tag filters - convert to array format for Supabase
      if (selectedTags.length > 0) {
        query = query.contains('tags', selectedTags);
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

      const { data, error } = await supabase
        .from('field_library')
        .insert([{
          name: name,
          label: fieldData.label,
          field_type: fieldData.field_type,
          help_text: fieldData.help_text || null,
          category: fieldData.category || null,
          tags: fieldData.tags || [],
          price_modifier: fieldData.affects_pricing ? fieldData.price_modifier : 0,
          pricing_type: fieldData.affects_pricing ? fieldData.pricing_type : null,
          affects_pricing: fieldData.affects_pricing,
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
      help_text: '',
      category: '',
      tags: [],
      price_modifier: 0,
      affects_pricing: false,
      pricing_type: 'fixed'
    });
  };

  const handleCreateField = () => {
    if (!newField.label.trim()) {
      toast.error('Field label is required');
      return;
    }
    createFieldMutation.mutate(newField);
  };

  const addTag = (tag: string) => {
    if (!newField.tags.includes(tag)) {
      setNewField(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewField(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleFilterTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedTags([]);
  };

  const availableFields = fieldLibrary?.filter(field => 
    !formFieldIds?.includes(field.id)
  ) || [];

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
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Field</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
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
                          <SelectItem value="radio">Radio Buttons</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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

                  <div>
                    <Label>Help Text</Label>
                    <Textarea
                      value={newField.help_text}
                      onChange={(e) => setNewField({ ...newField, help_text: e.target.value })}
                      placeholder="Optional help text for users"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {newField.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {COMMON_TAGS.filter(tag => !newField.tags.includes(tag)).map(tag => (
                          <Button
                            key={tag}
                            variant="outline"
                            size="sm"
                            onClick={() => addTag(tag)}
                            className="h-6 text-xs"
                          >
                            {tag}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newField.affects_pricing}
                        onCheckedChange={(checked) => setNewField({ ...newField, affects_pricing: checked })}
                      />
                      <Label>Affects Pricing</Label>
                    </div>
                    
                    {newField.affects_pricing && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <div>
                          <Label>Pricing Type</Label>
                          <Select value={newField.pricing_type} onValueChange={(value) => setNewField({ ...newField, pricing_type: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed Price</SelectItem>
                              <SelectItem value="per_person">Per Person</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Price/Rate (£)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newField.price_modifier}
                            onChange={(e) => setNewField({ ...newField, price_modifier: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

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
            placeholder="Search fields by name or description..."
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
            
            <div>
              <Label className="text-xs">Tags</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {COMMON_TAGS.map(tag => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFilterTag(tag)}
                    className="h-6 text-xs"
                  >
                    {tag}
                  </Button>
                ))}
              </div>
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
                    {field.field_type.replace('_', ' ')}
                  </Badge>
                </div>
                
                {field.category && (
                  <Badge variant="secondary" className="text-xs mb-1">
                    {field.category}
                  </Badge>
                )}
                
                {field.tags && field.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {field.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="h-2 w-2 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {field.affects_pricing && (
                  <div className="text-xs text-green-600 font-medium">
                    {field.pricing_type === 'fixed' && `Fixed: £${field.price_modifier}`}
                    {field.pricing_type === 'per_person' && `Per Person: £${field.price_modifier}`}
                    {field.pricing_type === 'percentage' && `${field.price_modifier}%`}
                  </div>
                )}

                {field.help_text && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {field.help_text}
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
            <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchTerm || selectedCategory || selectedTags.length > 0 
                ? 'No fields match your filters' 
                : 'No available fields'
              }
            </p>
            <p className="text-xs mt-1">
              {searchTerm || selectedCategory || selectedTags.length > 0
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