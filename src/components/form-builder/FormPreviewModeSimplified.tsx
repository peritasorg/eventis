import React from 'react';
import { CompactFieldDisplay } from './CompactFieldDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFormFields } from '@/hooks/useFormFields';
import { X, Plus } from 'lucide-react';

interface FormPreviewModeProps {
  formFields: any[];
  formResponses?: Record<string, any>;
  onResponseChange?: (fieldId: string, response: any) => void;
  readOnly?: boolean;
  removeFieldMutation?: any;
}

export const FormPreviewMode: React.FC<FormPreviewModeProps> = ({ 
  formFields, 
  formResponses = {}, 
  onResponseChange,
  readOnly = true,
  removeFieldMutation
}) => {
  const { formFields: availableFields } = useFormFields();

  const handleFieldChange = (fieldId: string, response: any) => {
    if (onResponseChange) {
      onResponseChange(fieldId, response);
    }
  };

  if (formFields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Plus className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No fields in this form yet.</p>
        <p className="text-xs mt-1">Add fields from the library to see the preview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        This preview shows exactly how fields will appear in event forms.
      </div>

      {formFields.map((fieldInstance) => {
        // Try to find the field from available fields or use the instance itself
        const fieldId = fieldInstance.id || fieldInstance.field_id;
        const field = availableFields.find(f => f.id === fieldId) || fieldInstance.field_library || fieldInstance;
        
        if (!field) {
          console.log('No field found for:', fieldId, fieldInstance);
          return null;
        }

        const response = formResponses[fieldId] || { 
          value: '', 
          notes: '', 
          price: field.default_price_gbp || 0, 
          quantity: field.default_quantity || 1,
          enabled: field.field_type?.includes('toggle') ? false : true
        };
        
        return (
          <div key={fieldId} className="relative">
            {!readOnly && (
              <div className="absolute top-2 right-2 z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFieldMutation?.mutate?.(fieldInstance.id)}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            <CompactFieldDisplay
              field={field}
              response={response}
              onChange={(response) => handleFieldChange(fieldId, response)}
              readOnly={readOnly}
            />
          </div>
        );
      })}
      
      {/* Form Total */}
      {!readOnly && (
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="text-lg font-semibold text-right">
            Form Total: £{Object.values(formResponses).reduce((total: number, response: any) => {
              if (response?.enabled !== false && response?.price) {
                return total + (response.price * (response.quantity || 1));
              }
              return total;
            }, 0).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};

export const FormPreviewModeSimplified = FormPreviewMode;