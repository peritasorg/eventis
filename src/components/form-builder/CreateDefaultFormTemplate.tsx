import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreateDefaultFormTemplateProps {
  onSuccess: () => void;
}

export const CreateDefaultFormTemplate: React.FC<CreateDefaultFormTemplateProps> = ({ onSuccess }) => {
  const { currentTenant } = useAuth();

  const createDefaultTemplateMutation = useSupabaseMutation(
    async () => {
      if (!currentTenant?.id) {
        throw new Error('No tenant found');
      }

      // Create a basic form template
      const { data: template, error: templateError } = await supabase
        .from('form_templates')
        .insert({
          tenant_id: currentTenant.id,
          name: 'Basic Event Form',
          description: 'A simple form template for basic event information',
          active: true,
          is_default: true,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create some basic fields in the field library
      const basicFields = [
        {
          tenant_id: currentTenant.id,
          name: 'guest_count',
          label: 'Number of Guests',
          field_type: 'counter_field',
          category: 'guests',
          pricing_behavior: 'none',
          show_quantity: false,
          show_notes: false,
          active: true,
        },
        {
          tenant_id: currentTenant.id,
          name: 'special_requirements',
          label: 'Special Requirements',
          field_type: 'textarea_field',
          category: 'information',
          pricing_behavior: 'none',
          show_quantity: false,
          show_notes: true,
          placeholder: 'Any special dietary requirements, accessibility needs, etc.',
          active: true,
        },
        {
          tenant_id: currentTenant.id,
          name: 'catering_required',
          label: 'Catering Required',
          field_type: 'checkbox_field',
          category: 'services',
          pricing_behavior: 'none',
          show_quantity: false,
          show_notes: true,
          active: true,
        }
      ];

      const { data: fields, error: fieldsError } = await supabase
        .from('field_library')
        .insert(basicFields)
        .select();

      if (fieldsError) throw fieldsError;

      // Add fields to the template
      const fieldInstances = fields.map((field, index) => ({
        tenant_id: currentTenant.id,
        form_template_id: template.id,
        field_library_id: field.id,
        field_order: index + 1,
      }));

      const { error: instancesError } = await supabase
        .from('form_field_instances')
        .insert(fieldInstances);

      if (instancesError) throw instancesError;

      return template;
    },
    {
      successMessage: 'Default form template created successfully!',
      onSuccess: () => {
        onSuccess();
      }
    }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          No Form Templates Available
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          You need to create a form template before you can add forms to events. 
          Let's create a basic template to get you started.
        </p>
        <Button 
          onClick={() => createDefaultTemplateMutation.mutate(undefined)}
          disabled={createDefaultTemplateMutation.isPending}
        >
          <Plus className="w-4 h-4 mr-2" />
          {createDefaultTemplateMutation.isPending ? 'Creating...' : 'Create Basic Form Template'}
        </Button>
      </CardContent>
    </Card>
  );
};