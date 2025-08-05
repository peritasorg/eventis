import React, { useState } from 'react';
import { FormPreviewMode } from './FormPreviewMode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Calculator } from 'lucide-react';
import { toast } from 'sonner';

interface EnhancedFormPreviewProps {
  formFields: any[];
  formName: string;
  eventContext?: {
    eventName: string;
    eventDate: string;
    guestCount: number;
  };
}

export const EnhancedFormPreview: React.FC<EnhancedFormPreviewProps> = ({
  formFields,
  formName,
  eventContext
}) => {
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const handleResponseChange = (fieldId: string, field: string, value: any) => {
    setFormResponses(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const calculateTotal = () => {
    return formFields.reduce((total, fieldInstance) => {
      const field = fieldInstance.field_library || fieldInstance;
      const response = formResponses[field.id];
      
      if (response?.enabled) {
        const price = parseFloat(response.price) || 0;
        return total + price;
      }
      
      return total;
    }, 0);
  };

  const getEnabledFields = () => {
    return formFields.filter(fieldInstance => {
      const field = fieldInstance.field_library || fieldInstance;
      return formResponses[field.id]?.enabled;
    });
  };

  const handleSave = () => {
    // In real implementation, this would save to the event
    toast.success('Form responses saved to event!');
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Event Context Header */}
      {eventContext && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">{eventContext.eventName}</h3>
                <p className="text-sm text-blue-700">
                  {eventContext.eventDate} • {eventContext.guestCount} guests
                </p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Using: {formName}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Event Form Configuration</CardTitle>
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-green-600">
                Total: £{calculateTotal().toFixed(2)}
              </div>
              {hasChanges && (
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FormPreviewMode
            formFields={formFields}
            formResponses={formResponses}
            onResponseChange={handleResponseChange}
            readOnly={false}
          />
        </CardContent>
      </Card>

      {/* Summary */}
      {getEnabledFields().length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-green-800 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Selected Options Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getEnabledFields().map(fieldInstance => {
                const field = fieldInstance.field_library || fieldInstance;
                const response = formResponses[field.id];
                return (
                  <div key={field.id} className="flex justify-between items-center py-2 border-b border-green-200 last:border-0">
                    <div>
                      <span className="font-medium text-sm text-green-900">{field.label}</span>
                      {response.notes && (
                        <div className="text-xs text-green-700 mt-1">{response.notes}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-800">
                        £{(parseFloat(response.price) || 0).toFixed(2)}
                      </div>
                      {response.pricing_type === 'per_person' && (
                        <div className="text-xs text-green-600">
                          {response.quantity || 1} × £{response.unit_price || 0}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-2 border-t-2 border-green-300">
                <span className="font-semibold text-green-900">Total Amount</span>
                <span className="font-bold text-lg text-green-800">
                  £{calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};