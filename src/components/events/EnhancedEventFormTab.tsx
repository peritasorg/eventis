import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EventFormTabProps {
  eventId: string;
}

interface FormResponse {
  [key: string]: {
    value: any;
    enabled: boolean;
    price: number;
    quantity?: number;
    notes?: string;
  };
}

export const EnhancedEventFormTab: React.FC<EventFormTabProps> = ({ eventId }) => {
  const { currentTenant } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [formTemplate, setFormTemplate] = useState<any>(null);
  const [formResponses, setFormResponses] = useState<FormResponse>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEventFormData = async () => {
      if (!eventId || !currentTenant?.id) return;

      try {
        // Fetch event data with form template
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .eq('tenant_id', currentTenant.id)
          .single();

        if (eventError) {
          console.error('Error fetching event:', eventError);
          return;
        }

        setEvent(eventData);
        
        // Parse form responses from event data
        if (eventData.form_responses) {
          if (typeof eventData.form_responses === 'string') {
            try {
              setFormResponses(JSON.parse(eventData.form_responses));
            } catch (e) {
              console.error('Error parsing form responses:', e);
              setFormResponses({});
            }
          } else if (typeof eventData.form_responses === 'object') {
            setFormResponses(eventData.form_responses as FormResponse);
          }
        }

        // If event has a form template, fetch it
        if (eventData.form_template_used) {
          const { data: templateData, error: templateError } = await supabase
            .from('form_templates')
            .select('*')
            .eq('id', eventData.form_template_used)
            .eq('tenant_id', currentTenant.id)
            .single();

          if (!templateError) {
            setFormTemplate(templateData);
          }
        }
      } catch (error) {
        console.error('Error fetching event form data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventFormData();
  }, [eventId, currentTenant?.id]);

  const updateFormResponse = (fieldKey: string, updates: Partial<FormResponse[string]>) => {
    setFormResponses(prev => {
      const current = prev[fieldKey] || { value: '', enabled: false, price: 0 };
      const updated = { ...current, ...updates };
      
      // Calculate price based on updates
      if (updates.enabled !== undefined) {
        if (updates.enabled) {
          // Enable with default pricing logic
          updated.price = (updated.quantity || 1) * 10; // Example pricing
        } else {
          updated.price = 0;
        }
      }

      return { ...prev, [fieldKey]: updated };
    });
  };

  const calculateTotalPrice = () => {
    return Object.values(formResponses).reduce((total, response) => {
      return total + (response.enabled ? response.price : 0);
    }, 0);
  };

  const saveFormResponses = async () => {
    if (!eventId || !currentTenant?.id) return;

    setSaving(true);
    try {
      const totalPrice = calculateTotalPrice();
      
      const { error } = await supabase
        .from('events')
        .update({
          form_responses: formResponses,
          form_total: totalPrice,
          total_amount: (event?.total_guest_price || 0) + totalPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id);

      if (error) {
        console.error('Error saving form responses:', error);
        toast.error('Failed to save form responses');
      } else {
        toast.success('Form responses saved successfully');
        // Update local event state
        setEvent(prev => ({
          ...prev,
          form_total: totalPrice,
          total_amount: (prev?.total_guest_price || 0) + totalPrice
        }));
      }
    } catch (error) {
      console.error('Error saving form responses:', error);
      toast.error('Failed to save form responses');
    } finally {
      setSaving(false);
    }
  };

  // Sample form fields for demonstration
  const sampleFields = [
    {
      id: 'catering',
      label: 'Catering Package',
      type: 'checkbox',
      pricing: true,
      basePrice: 25
    },
    {
      id: 'decoration',
      label: 'Decoration Service',
      type: 'checkbox',
      pricing: true,
      basePrice: 15
    },
    {
      id: 'music',
      label: 'Music & Entertainment',
      type: 'checkbox',
      pricing: true,
      basePrice: 20
    },
    {
      id: 'photography',
      label: 'Photography Service',
      type: 'checkbox',
      pricing: true,
      basePrice: 50
    },
    {
      id: 'special_requests',
      label: 'Special Requests',
      type: 'textarea',
      pricing: false
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading form data...</div>
      </div>
    );
  }

  const totalPrice = calculateTotalPrice();

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Form</h2>
          <p className="text-muted-foreground">
            Configure additional services and options for this event
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              £{totalPrice.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Form Total</div>
          </div>
          <Button onClick={saveFormResponses} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Form
          </Button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {sampleFields.map((field) => {
          const response = formResponses[field.id] || { 
            value: field.type === 'checkbox' ? false : '', 
            enabled: false, 
            price: 0 
          };
          
          return (
            <Card key={field.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {field.pricing && (
                      <Checkbox
                        checked={response.enabled}
                        onCheckedChange={(checked) => {
                          const enabled = checked as boolean;
                          updateFormResponse(field.id, { 
                            enabled,
                            price: enabled ? (field.basePrice || 0) * (event?.estimated_guests || 1) : 0
                          });
                        }}
                      />
                    )}
                    <div>
                      <div className="font-medium text-lg">{field.label}</div>
                      <div className="text-sm text-muted-foreground">
                        <Badge variant="outline" className="mr-2">
                          {field.type}
                        </Badge>
                        {field.pricing && (
                          <Badge variant="secondary">
                            Pricing Enabled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {field.pricing && response.enabled && (
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        £{response.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        £{field.basePrice} per person
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {field.type === 'checkbox' ? (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={response.value || false}
                        onCheckedChange={(checked) => updateFormResponse(field.id, { value: checked })}
                      />
                      <span>Include {field.label}</span>
                    </div>
                  ) : field.type === 'textarea' ? (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {field.label}
                      </label>
                      <Textarea
                        value={response.value || ''}
                        onChange={(e) => updateFormResponse(field.id, { value: e.target.value })}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        rows={3}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {field.label}
                      </label>
                      <Input
                        value={response.value || ''}
                        onChange={(e) => updateFormResponse(field.id, { value: e.target.value })}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    </div>
                  )}

                  {response.enabled && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Notes
                      </label>
                      <Textarea
                        value={response.notes || ''}
                        onChange={(e) => updateFormResponse(field.id, { notes: e.target.value })}
                        placeholder="Add any additional notes..."
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Form Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(formResponses).map(([fieldId, response]) => {
              const field = sampleFields.find(f => f.id === fieldId);
              if (!field || !response.enabled) return null;
              
              return (
                <div key={fieldId} className="flex justify-between items-center">
                  <span>{field.label}</span>
                  <span className="font-medium">£{response.price.toFixed(2)}</span>
                </div>
              );
            })}
            <div className="border-t pt-2 mt-4">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total</span>
                <span className="text-green-600">£{totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};