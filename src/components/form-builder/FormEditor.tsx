
import React, { useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FormFieldsList } from './FormFieldsList';
import { AddFieldDialog } from './AddFieldDialog';
import { FieldLibraryDialog } from './FieldLibraryDialog';

interface FormEditorProps {
  form: any;
  onBack: () => void;
}

export const FormEditor: React.FC<FormEditorProps> = ({ form, onBack }) => {
  const { currentTenant } = useAuth();
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [isFieldLibraryOpen, setIsFieldLibraryOpen] = useState(false);

  const { data: formFields, refetch: refetchFields } = useSupabaseQuery(
    ['form-fields', form.id],
    async () => {
      if (!form.id || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .select(`
          *,
          field_library (*)
        `)
        .eq('form_template_id', form.id)
        .eq('tenant_id', currentTenant.id)
        .order('field_order');
      
      if (error) {
        console.error('Form fields error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{form.name}</h2>
              {form.description && (
                <p className="text-sm text-gray-600 mt-1">{form.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsFieldLibraryOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Field Library
              </Button>
              <Button onClick={() => setIsAddFieldOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Form Fields */}
      <FormFieldsList 
        formFields={formFields}
        formId={form.id}
        refetchFields={refetchFields}
      />

      {/* Dialogs */}
      <AddFieldDialog
        isOpen={isAddFieldOpen}
        onClose={() => setIsAddFieldOpen(false)}
        formId={form.id}
        refetchFields={refetchFields}
      />

      <FieldLibraryDialog
        isOpen={isFieldLibraryOpen}
        onClose={() => setIsFieldLibraryOpen(false)}
        formId={form.id}
        refetchFields={refetchFields}
      />
    </div>
  );
};
