
import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

interface FormFieldsListProps {
  formFields: any[];
  formId: string;
  refetchFields: () => void;
}

export const FormFieldsList: React.FC<FormFieldsListProps> = ({ 
  formFields, 
  formId, 
  refetchFields 
}) => {
  const removeFieldMutation = useSupabaseMutation(
    async (fieldInstanceId: string) => {
      const { error } = await supabase
        .from('form_field_instances')
        .delete()
        .eq('id', fieldInstanceId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field removed!',
      onSuccess: refetchFields
    }
  );

  if (!formFields || formFields.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <p className="text-lg mb-2">No fields yet</p>
            <p className="text-sm">Add fields to start building your questionnaire</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Fields ({formFields.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {formFields.map((fieldInstance, index) => {
            const field = fieldInstance.field_library;
            return (
              <div key={fieldInstance.id} className="flex items-center gap-3 p-4 border rounded-lg">
                <GripVertical className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{field.label}</h4>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {field.field_type}
                    </span>
                  </div>
                  
                  {field.help_text && (
                    <p className="text-sm text-gray-600 mb-2">{field.help_text}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {field.affects_pricing && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        Affects Pricing: £{field.price_modifier}
                      </span>
                    )}
                    {field.auto_add_price_field && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Auto Price Field
                      </span>
                    )}
                    {field.auto_add_notes_field && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Auto Notes Field
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFieldMutation.mutate(fieldInstance.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
