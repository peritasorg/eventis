import React, { useState } from 'react';
import { Plus, Search, Filter, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StandardFieldEditor } from './StandardFieldEditor';
import { toast } from 'sonner';

interface AdvancedFieldLibraryProps {
  formId: string;
  onFieldAdded: () => void;
}

const FIELD_CATEGORIES = [
  'Basic Information',
  'Event Details', 
  'Food & Catering',
  'Services',
  'Decorations',
  'Equipment',
  'Other'
];

export const AdvancedFieldLibrary: React.FC<AdvancedFieldLibraryProps> = ({ formId, onFieldAdded }) => {
  const { currentTenant } = useAuth();
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch field library with enhanced search
  const { data: fieldLibrary, refetch: refetchFieldLibrary } = useSupabaseQuery(
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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
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
            <Button size="sm" onClick={() => setIsFieldEditorOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Create Field
            </Button>
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
              <div 
                className="flex-1 min-w-0 cursor-pointer" 
                onClick={() => {
                  setEditingField(field);
                  setIsFieldEditorOpen(true);
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-medium text-sm truncate">{field.label}</div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {field.field_type === 'toggle' ? 'Toggle' : field.field_type === 'select' ? 'Dropdown' : field.field_type}
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
              
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingField(field);
                    setIsFieldEditorOpen(true);
                  }}
                  className="h-7 w-7 p-0"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    addFieldToFormMutation.mutate(field.id);
                  }}
                  disabled={addFieldToFormMutation.isPending}
                  className="h-7 w-7 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
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

      <StandardFieldEditor
        isOpen={isFieldEditorOpen}
        onClose={() => {
          setIsFieldEditorOpen(false);
          setEditingField(null);
        }}
        field={editingField}
        onSuccess={() => {
          refetchFieldLibrary();
          onFieldAdded();
        }}
        formId={formId}
      />
    </Card>
  );
};