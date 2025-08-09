import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { PoundSterling, Hash, FileText, Calendar, Clock } from 'lucide-react';

interface FieldResponse {
  value?: any;
  notes?: string;
  price?: number;
  quantity?: number;
  calculated_total?: number;
  manual_override?: number;
  unit_type?: string;
}

interface CompactFieldDisplayProps {
  field: any;
  response: FieldResponse;
  onChange: (response: FieldResponse) => void;
  readOnly?: boolean;
}

export const CompactFieldDisplay: React.FC<CompactFieldDisplayProps> = ({
  field,
  response,
  onChange,
  readOnly = false
}) => {
  const updateResponse = (updates: Partial<FieldResponse>) => {
    const newResponse = { ...response, ...updates };
    
    // Auto-calculate total if pricing is enabled
    if (field.affects_pricing && field.show_quantity && newResponse.quantity && newResponse.price) {
      newResponse.calculated_total = newResponse.quantity * newResponse.price;
    }
    
    onChange(newResponse);
  };

  const renderMainInput = () => {
    switch (field.field_type) {
      case 'price_field':
      case 'menu_item':
      case 'service_field':
        return (
          <div className="space-y-2">
            {field.show_quantity && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={response.quantity || ''}
                  onChange={(e) => updateResponse({ quantity: parseInt(e.target.value) || 0 })}
                  disabled={readOnly}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {field.unit_type}s × £{response.price || field.unit_price || 0}
                </span>
                {response.calculated_total && (
                  <span className="font-medium">= £{response.calculated_total.toFixed(2)}</span>
                )}
              </div>
            )}
            
            {field.allow_price_override && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">Override:</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Custom price"
                  value={response.manual_override || ''}
                  onChange={(e) => updateResponse({ manual_override: parseFloat(e.target.value) || undefined })}
                  disabled={readOnly}
                  className="w-24"
                />
              </div>
            )}
          </div>
        );
        
      case 'counter_field':
      case 'guest_count':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={field.min_quantity || 0}
              max={field.max_quantity || undefined}
              value={response.value || ''}
              onChange={(e) => updateResponse({ value: parseInt(e.target.value) || 0 })}
              disabled={readOnly}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">{field.unit_type}s</span>
          </div>
        );
        
      case 'text_field':
        return (
          <Input
            value={response.value || ''}
            onChange={(e) => updateResponse({ value: e.target.value })}
            placeholder={field.placeholder}
            disabled={readOnly}
          />
        );
        
      case 'textarea_field':
        return (
          <Textarea
            value={response.value || ''}
            onChange={(e) => updateResponse({ value: e.target.value })}
            placeholder={field.placeholder}
            disabled={readOnly}
            rows={3}
          />
        );
        
      case 'select_field':
        return (
          <Select
            value={response.value || ''}
            onValueChange={(value) => updateResponse({ value })}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string, index: number) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'checkbox_field':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={response.value || false}
              onCheckedChange={(checked) => updateResponse({ value: checked })}
              disabled={readOnly}
            />
            <Label>{response.value ? 'Yes' : 'No'}</Label>
          </div>
        );
        
      case 'date_field':
        return (
          <Input
            type="date"
            value={response.value || ''}
            onChange={(e) => updateResponse({ value: e.target.value })}
            disabled={readOnly}
          />
        );
        
      case 'time_field':
        return (
          <Input
            type="time"
            value={response.value || ''}
            onChange={(e) => updateResponse({ value: e.target.value })}
            disabled={readOnly}
          />
        );
        
      default:
        return (
          <Input
            value={response.value || ''}
            onChange={(e) => updateResponse({ value: e.target.value })}
            placeholder={field.placeholder}
            disabled={readOnly}
          />
        );
    }
  };

  // Determine if this is a simple inline field (counters, simple inputs)
  const isInlineField = ['counter_field', 'guest_count'].includes(field.field_type) && !field.show_notes;

  if (isInlineField) {
    return (
      <div className="flex items-center gap-3 py-2">
        <Label className="min-w-0 flex-1 font-medium">{field.label}:</Label>
        {renderMainInput()}
      </div>
    );
  }

  // Complex field with card layout
  const finalTotal = response.manual_override || response.calculated_total || (response.price && response.quantity ? response.price * response.quantity : null);

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium flex items-center gap-2">
              {field.label}
              {field.affects_pricing && <PoundSterling className="w-4 h-4 text-primary" />}
              {field.show_quantity && <Hash className="w-4 h-4 text-muted-foreground" />}
            </h4>
            {field.help_text && (
              <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
            )}
          </div>
          
          {field.affects_pricing && finalTotal && (
            <div className="text-right">
              <div className="text-lg font-bold text-primary">£{finalTotal.toFixed(2)}</div>
              {response.manual_override && (
                <Badge variant="secondary" className="text-xs">Override</Badge>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {renderMainInput()}
          
          {field.show_notes && (
            <div>
              <Label className="text-xs text-muted-foreground">Notes:</Label>
              <Textarea
                value={response.notes || ''}
                onChange={(e) => updateResponse({ notes: e.target.value })}
                placeholder="Additional notes or requirements..."
                disabled={readOnly}
                rows={2}
                className="mt-1"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};