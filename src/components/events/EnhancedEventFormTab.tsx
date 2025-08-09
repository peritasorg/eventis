import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit, FileText, Calculator, Users, UtensilsCrossed } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CompactFieldDisplay } from '../form-builder/CompactFieldDisplay';
import { toast } from 'sonner';

interface EnhancedEventFormTabProps {
  eventId: string;
  eventForm: any;
}

export const EnhancedEventFormTab: React.FC<EnhancedEventFormTabProps> = ({
  eventId,
  eventForm
}) => {
  console.log('🐛 EnhancedEventFormTab Debug - eventId:', eventId);
  console.log('🐛 EnhancedEventFormTab Debug - eventForm:', eventForm);
  console.log('🐛 EnhancedEventFormTab Debug - eventForm.form_template_id:', eventForm?.form_template_id);
  const { currentTenant } = useAuth();
  const [responses, setResponses] = useState(eventForm?.form_responses || {});
  const [isEditing, setIsEditing] = useState(false);

  // Fetch form fields with library data
  const { data: formFields } = useSupabaseQuery(
    ['event-form-fields', eventForm?.form_template_id],
    async () => {
      console.log('🐛 EnhancedEventFormTab Debug - fetching fields for template_id:', eventForm?.form_template_id);
      if (!eventForm?.form_template_id) return [];
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .select(`
          *,
          field_library (*)
        `)
        .eq('form_template_id', eventForm.form_template_id)
        .order('field_order');
      
      if (error) {
        console.error('🐛 Event form fields error:', error);
        return [];
      }
      
      console.log('🐛 EnhancedEventFormTab Debug - fetched form fields:', data);
      return data || [];
    }
  );

  // Update form responses mutation
  const updateResponsesMutation = useSupabaseMutation(
    async (newResponses: any) => {
      const { data, error } = await supabase
        .from('event_forms')
        .update({ 
          form_responses: newResponses,
          form_total: calculateFormTotal(newResponses)
        })
        .eq('id', eventForm.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Form responses saved!',
      invalidateQueries: [['event-forms', eventId]],
    }
  );

  const calculateFormTotal = (responseData: any) => {
    if (!formFields) return 0;
    
    return formFields.reduce((total, fieldInstance) => {
      const field = fieldInstance.field_library;
      const response = responseData[fieldInstance.id];
      
      if (!field?.affects_pricing || !response) return total;
      
      const finalPrice = response.manual_override || response.calculated_total || 
        (response.price && response.quantity ? response.price * response.quantity : 
         (field.unit_price && response.quantity ? field.unit_price * response.quantity : 0));
      
      return total + (finalPrice || 0);
    }, 0);
  };

  const handleResponseChange = (fieldInstanceId: string, response: any) => {
    const newResponses = {
      ...responses,
      [fieldInstanceId]: response
    };
    setResponses(newResponses);
  };

  const handleSave = () => {
    updateResponsesMutation.mutate(responses);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setResponses(eventForm?.form_responses || {});
    setIsEditing(false);
  };

  // Group fields by category for better organization
  const groupedFields = formFields?.reduce((acc, fieldInstance) => {
    const category = fieldInstance.field_library?.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(fieldInstance);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'menu': return UtensilsCrossed;
      case 'pricing': return Calculator;
      case 'guests': 
      case 'counts': return Users;
      default: return FileText;
    }
  };

  const getCategoryDisplayName = (category: string) => {
    const names: Record<string, string> = {
      pricing: '💰 Pricing & Services',
      menu: '🍽️ Food & Beverages',
      services: '🎭 Services & Extras',
      counts: '👥 Guest Information',
      guests: '👥 Guest Information',
      information: '📝 Additional Information',
      selection: '📋 Selections',
      other: '📄 Other'
    };
    return names[category] || category;
  };

  const formTotal = calculateFormTotal(responses);
  const hasChanges = JSON.stringify(responses) !== JSON.stringify(eventForm?.form_responses || {});

  if (!formFields || formFields.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No form associated with this event</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {eventForm.form_label || 'Event Form'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Complete the questionnaire details for this event
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                £{formTotal.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Form Total</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Badge variant={isEditing ? 'default' : 'secondary'}>
                {isEditing ? 'Editing' : 'View Mode'}
              </Badge>
              {hasChanges && (
                <Badge variant="destructive">Unsaved Changes</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={updateResponsesMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Form
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Form Sections */}
      <div className="space-y-6">
        {Object.entries(groupedFields).map(([category, fields]) => {
          const IconComponent = getCategoryIcon(category);
          
          return (
            <Card key={category}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IconComponent className="w-5 h-5" />
                  {getCategoryDisplayName(category)}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {Array.isArray(fields) && fields.map((fieldInstance) => (
                  <CompactFieldDisplay
                    key={fieldInstance.id}
                    field={fieldInstance.field_library}
                    response={responses[fieldInstance.id] || {}}
                    onChange={(response) => handleResponseChange(fieldInstance.id, response)}
                    readOnly={!isEditing}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Form completed with {formFields.length} field{formFields.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                Last updated: {eventForm.updated_at ? new Date(eventForm.updated_at).toLocaleDateString() : 'Never'}
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold">
                Total: £{formTotal.toFixed(2)}
              </div>
              {formTotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  Excluding taxes and additional charges
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};