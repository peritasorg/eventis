import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, PoundSterling, Hash, Users, FileText, List, CheckSquare, Calendar, Clock, Utensils, Wrench } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalFieldEditor } from './UniversalFieldEditor';
import { useFieldTypes } from '@/hooks/useFieldTypes';

interface EnhancedFieldLibraryProps {
  formId: string;
  sectionId?: string | null;
  onFieldAdded: () => void;
}

const getFieldIcon = (type: string) => {
  const icons: Record<string, any> = {
    'price_field': PoundSterling,
    'menu_item': Utensils,
    'service_field': Wrench,
    'counter_field': Hash,
    'guest_count': Users,
    'text_field': FileText,
    'textarea_field': FileText,
    'select_field': List,
    'checkbox_field': CheckSquare,
    'date_field': Calendar,
    'time_field': Clock,
  };
  return icons[type] || FileText;
};

const getCategoryDisplayName = (category: string) => {
  const names: Record<string, string> = {
    pricing: '💰 Pricing',
    menu: '🍽️ Menu Items',
    services: '🎭 Services',
    counts: '👥 Guest Info',
    guests: '👥 Guest Info',
    information: '📝 Information',
    selection: '📋 Selection',
  };
  return names[category] || category;
};

export const EnhancedFieldLibrary: React.FC<EnhancedFieldLibraryProps> = ({
  formId,
  sectionId,
  onFieldAdded
}) => {
  const { currentTenant } = useAuth();
  const { fieldTypesByCategory } = useFieldTypes();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);

  // Get available fields from library
  const { data: availableFields, refetch: refetchFields } = useSupabaseQuery(
    ['field-library', currentTenant?.id, search, activeCategory],
    async () => {
      if (!currentTenant?.id) return [];
      
      let query = supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);
      
      if (search) {
        query = query.ilike('label', `%${search}%`);
      }
      
      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory);
      }
      
      const { data, error } = await query.order('usage_count', { ascending: false });
      
      if (error) {
        console.error('Available fields error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  // Get fields already in the form
  const { data: formFieldIds } = useSupabaseQuery(
    ['form-field-instances', formId],
    async () => {
      if (!formId) return [];
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .select('field_library_id')
        .eq('form_template_id', formId);
      
      if (error) {
        console.error('Form field instances error:', error);
        return [];
      }
      
      return data?.map(item => item.field_library_id) || [];
    }
  );

  // Add field to form mutation
  const addFieldToFormMutation = useSupabaseMutation(
    async (fieldId: string) => {
      if (!currentTenant?.id) {
        throw new Error('No tenant found');
      }
      
      // Check if field is already in form
      if (formFieldIds?.includes(fieldId)) {
        throw new Error('This field is already in the form');
      }
      
      // Get next order number
      const { data: existingFields } = await supabase
        .from('form_field_instances')
        .select('field_order')
        .eq('form_template_id', formId)
        .order('field_order', { ascending: false })
        .limit(1);
      
      const nextOrder = (existingFields?.[0]?.field_order || 0) + 1;
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .insert({
          tenant_id: currentTenant.id,
          form_template_id: formId,
          field_library_id: fieldId,
          section_id: sectionId,
          field_order: nextOrder,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update usage count
      const { data: currentField } = await supabase
        .from('field_library')
        .select('usage_count')
        .eq('id', fieldId)
        .single();
      
      if (currentField) {
        await supabase
          .from('field_library')
          .update({ usage_count: (currentField.usage_count || 0) + 1 })
          .eq('id', fieldId);
      }
      
      return data;
    },
    {
      successMessage: 'Field added to form!',
      invalidateQueries: [['form-field-instances', formId], ['field-library']],
      onSuccess: () => {
        onFieldAdded();
      }
    }
  );

  const categories = Object.keys(fieldTypesByCategory);
  const filteredFields = availableFields?.filter(field => 
    !formFieldIds?.includes(field.id)
  ) || [];

  const handleCreateField = () => {
    setEditingField(null);
    setShowFieldEditor(true);
  };

  const handleEditField = (field: any) => {
    setEditingField(field);
    setShowFieldEditor(true);
  };

  const handleFieldEditorSuccess = () => {
    refetchFields();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Field Library</CardTitle>
          <Button onClick={handleCreateField} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </div>
        
        {sectionId && (
          <div className="p-2 bg-primary/10 rounded text-xs text-primary">
            Adding to selected section
          </div>
        )}
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="information">Info</TabsTrigger>
          </TabsList>
          
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {filteredFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No fields available</p>
                <p className="text-sm">Create a custom field or adjust your search</p>
              </div>
            ) : (
              filteredFields.map((field) => {
                const IconComponent = getFieldIcon(field.field_type);
                return (
                  <div
                    key={field.id}
                    className="border rounded-lg p-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">{field.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {field.category}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {field.affects_pricing && <PoundSterling className="w-3 h-3" />}
                        {field.show_quantity && <Hash className="w-3 h-3" />}
                        {field.show_notes && <FileText className="w-3 h-3" />}
                        <span>{field.unit_price > 0 ? `£${field.unit_price}` : 'No price'}</span>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditField(field)}
                          className="h-6 px-2 text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => addFieldToFormMutation.mutate(field.id)}
                          disabled={addFieldToFormMutation.isPending}
                          className="h-6 px-2 text-xs"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Tabs>
      </CardContent>
      
      <UniversalFieldEditor
        isOpen={showFieldEditor}
        onClose={() => setShowFieldEditor(false)}
        field={editingField}
        onSuccess={handleFieldEditorSuccess}
        formId={formId}
      />
    </Card>
  );
};