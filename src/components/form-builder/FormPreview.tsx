import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormSection } from '@/hooks/useForms';
import { FormField } from '@/hooks/useFormFields';
import { UnifiedFieldRenderer } from './UnifiedFieldRenderer';

interface FormPreviewProps {
  formName: string;
  sections: FormSection[];
  fields: FormField[];
  open: boolean;
  onClose: () => void;
}

interface FormResponse {
  [fieldId: string]: {
    value?: string | number;
    quantity?: number;
    price?: number;
    notes?: string;
    enabled?: boolean;
  };
}

export const FormPreview: React.FC<FormPreviewProps> = ({
  formName,
  sections,
  fields,
  open,
  onClose
}) => {
  const [responses, setResponses] = useState<FormResponse>({});

  const getFieldById = (fieldId: string) => fields.find(f => f.id === fieldId);

  const updateResponse = (fieldId: string, updates: Partial<FormResponse[string]>) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], ...updates }
    }));
  };

  const calculateTotal = useMemo(() => {
    return Object.entries(responses).reduce((total, [fieldId, response]) => {
      const field = getFieldById(fieldId);
      if (!field || !field.has_pricing) return total;

      if (field.field_type === 'fixed_price_notes') {
        return total + (response.price || 0);
      } else if (field.field_type === 'per_person_price_notes') {
        return total + ((response.quantity || 0) * (response.price || 0));
      }
      return total;
    }, 0);
  }, [responses, fields]);

  const getSectionIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('guest') || lower.includes('information')) return '👥';
    if (lower.includes('menu') || lower.includes('food')) return '🍽️';
    if (lower.includes('note') || lower.includes('additional')) return '📝';
    return '📋';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{formName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">{getSectionIcon(section.title)}</span>
                  {section.title.toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.field_ids.map((fieldId) => {
                  const field = getFieldById(fieldId);
                  return field ? (
                    <UnifiedFieldRenderer
                      key={fieldId}
                      field={field}
                      response={responses[fieldId]}
                      onChange={updateResponse}
                      showInCard={false}
                    />
                  ) : null;
                })}
                {section.field_ids.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No fields in this section
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {calculateTotal > 0 && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center text-xl font-semibold">
                  <span>Estimated Total:</span>
                  <span>£{calculateTotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close Preview</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};