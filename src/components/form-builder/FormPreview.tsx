import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormSection } from '@/hooks/useForms';
import { FormField } from '@/hooks/useFormFields';

interface FormPreviewProps {
  formName: string;
  sections: FormSection[];
  fields: FormField[];
  open: boolean;
  onClose: () => void;
}

interface FormResponse {
  [fieldId: string]: {
    value: string | number;
    quantity?: number;
    notes?: string;
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
      if (!field || !field.has_pricing || !field.default_price_gbp) return total;

      if (field.field_type === 'price_fixed') {
        return total + field.default_price_gbp;
      } else if (field.field_type === 'price_per_person' && response.quantity) {
        return total + (field.default_price_gbp * response.quantity);
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

  const renderField = (field: FormField) => {
    const response = responses[field.id] || { value: '', quantity: 1, notes: '' };

    return (
      <div key={field.id} className="space-y-3">
        <div>
          <Label className="text-base font-medium">{field.name}</Label>
          {field.help_text && (
            <p className="text-sm text-muted-foreground mt-1">{field.help_text}</p>
          )}
        </div>

        {field.field_type === 'text' && (
          <Textarea
            value={response.value as string}
            onChange={(e) => updateResponse(field.id, { value: e.target.value })}
            placeholder={field.placeholder_text || ''}
            rows={3}
          />
        )}

        {field.field_type === 'counter' && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              value={response.value}
              onChange={(e) => updateResponse(field.id, { value: parseInt(e.target.value) || 0 })}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">people</span>
          </div>
        )}

        {field.field_type === 'price_fixed' && field.has_pricing && (
          <div className="space-y-2">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-lg font-semibold">£{field.default_price_gbp?.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Fixed Price</div>
            </div>
            {field.has_notes && (
              <Textarea
                value={response.notes}
                onChange={(e) => updateResponse(field.id, { notes: e.target.value })}
                placeholder="Notes (optional)"
                rows={2}
              />
            )}
          </div>
        )}

        {field.field_type === 'price_per_person' && field.has_pricing && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Quantity:</Label>
                <Input
                  type="number"
                  min="0"
                  value={response.quantity || 1}
                  onChange={(e) => updateResponse(field.id, { quantity: parseInt(e.target.value) || 0 })}
                  className="w-24"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                people × £{field.default_price_gbp?.toFixed(2)} = £{((response.quantity || 0) * (field.default_price_gbp || 0)).toFixed(2)}
              </div>
            </div>
            {field.has_notes && (
              <Textarea
                value={response.notes}
                onChange={(e) => updateResponse(field.id, { notes: e.target.value })}
                placeholder={field.placeholder_text || 'Notes (optional)'}
                rows={2}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
              <CardContent className="space-y-6">
                {section.field_ids.map((fieldId) => {
                  const field = getFieldById(fieldId);
                  return field ? renderField(field) : null;
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
            <Card className="border-primary">
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