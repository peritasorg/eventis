
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FieldLibraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  refetchFields: () => void;
}

export const FieldLibraryDialog: React.FC<FieldLibraryDialogProps> = ({ 
  isOpen, 
  onClose, 
  formId, 
  refetchFields 
}) => {
  const { currentTenant } = useAuth();

  const { data: availableFields } = useSupabaseQuery(
    ['available-fields', formId],
    async () => {
      if (!currentTenant?.id || !formId) return [];
      
      // Get all fields in library
      const { data: libraryFields, error: libraryError } = await supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);
        
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

  const addFieldToFormMutation = useSupabaseMutation(
    async (fieldId: string) => {
      const { data: maxOrder } = await supabase
        .from('form_field_instances')
        .select('field_order')
        .eq('form_template_id', formId)
        .order('field_order', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxOrder?.field_order || 0) + 1;

      const { error } = await supabase
        .from('form_field_instances')
        .insert([{
          form_template_id: formId,
          field_library_id: fieldId,
          field_order: nextOrder,
          tenant_id: currentTenant?.id
        }]);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field added to form!',
      onSuccess: refetchFields
    }
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Fields from Library</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {availableFields?.map((field) => (
            <div key={field.id} className="flex items-center justify-between p-3 border rounded">
              <div className="flex-1">
                <div className="font-medium">{field.label}</div>
                <div className="text-sm text-gray-600">{field.field_type}</div>
                {field.affects_pricing && (
                  <div className="text-sm text-green-600">£{field.price_modifier}</div>
                )}
                {field.help_text && (
                  <div className="text-xs text-gray-500 mt-1">{field.help_text}</div>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => addFieldToFormMutation.mutate(field.id)}
                disabled={addFieldToFormMutation.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {(!availableFields || availableFields.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <p>No available fields in your library.</p>
              <p className="text-sm">Create new fields using the "Add Field" button.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
