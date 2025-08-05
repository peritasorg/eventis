import React, { useState } from 'react';
import { Plus, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SimpleFieldSelectorProps {
  formId: string;
  onFieldAdded: () => void;
}

export const SimpleFieldSelector: React.FC<SimpleFieldSelectorProps> = ({ formId, onFieldAdded }) => {
  const { currentTenant } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch available fields (not already in form)
  const { data: availableFields } = useSupabaseQuery(
    ['available-fields', formId, searchTerm],
    async () => {
      if (!currentTenant?.id || !formId) return [];
      
      // Get all fields in library
      const { data: libraryFields, error: libraryError } = await supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .ilike('label', `%${searchTerm}%`)
        .order('label');
        
      if (libraryError) throw libraryError;
      
      // Get fields already in this form
      const { data: usedFields, error: usedError } = await supabase
        .from('form_field_instances')
        .select('field_library_id')
        .eq('form_template_id', formId);
        
      if (usedError) throw usedError;
      
      const usedFieldIds = usedFields?.map(f => f.field_library_id) || [];
      
      // Return fields not already in the form
      return libraryFields?.filter(field => !usedFieldIds.includes(field.id)) || [];
    }
  );

  // Add field to form mutation
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

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add Fields</CardTitle>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search available fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-2">
        {availableFields?.map((field) => (
          <div key={field.id} className="p-3 border rounded-md hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">{field.label}</div>
                <div className="text-xs text-gray-500 capitalize">{field.field_type}</div>
                {field.affects_pricing && (
                  <div className="text-xs text-green-600 mt-1">
                    Pricing: £{field.price_modifier || 0}
                  </div>
                )}
                {field.help_text && (
                  <div className="text-xs text-gray-400 mt-1">{field.help_text}</div>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => addFieldToFormMutation.mutate(field.id)}
                disabled={addFieldToFormMutation.isPending}
                className="h-7 w-7 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        {(!availableFields || availableFields.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchTerm ? 'No fields match your search' : 'No available fields'}
            </p>
            <p className="text-xs mt-1">
              {searchTerm ? 'Try a different search term' : 'Create new fields to add them here'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};