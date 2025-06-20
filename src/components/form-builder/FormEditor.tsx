
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
      
      // First get form pages for this template
      const { data: pages, error: pagesError } = await supabase
        .from('form_pages')
        .select('id')
        .eq('form_template_id', form.id)
        .eq('tenant_id', currentTenant.id);
      
      if (pagesError) {
        console.error('Form pages error:', pagesError);
        return [];
      }

      if (!pages || pages.length === 0) {
        // Create a default page if none exists
        const { data: newPage, error: newPageError } = await supabase
          .from('form_pages')
          .insert([{
            form_template_id: form.id,
            page_title: 'Main Page',
            page_number: 1,
            tenant_id: currentTenant.id
          }])
          .select()
          .single();
        
        if (newPageError) {
          console.error('Error creating default page:', newPageError);
          return [];
        }
        
        pages.push(newPage);
      }

      // Get sections for these pages
      const pageIds = pages.map(p => p.id);
      const { data: sections, error: sectionsError } = await supabase
        .from('form_sections')
        .select('id')
        .in('form_page_id', pageIds)
        .eq('tenant_id', currentTenant.id);
      
      if (sectionsError) {
        console.error('Form sections error:', sectionsError);
        return [];
      }

      if (!sections || sections.length === 0) {
        // Create a default section if none exists
        const { data: newSection, error: newSectionError } = await supabase
          .from('form_sections')
          .insert([{
            form_page_id: pages[0].id,
            section_title: 'Main Section',
            section_order: 1,
            tenant_id: currentTenant.id
          }])
          .select()
          .single();
        
        if (newSectionError) {
          console.error('Error creating default section:', newSectionError);
          return [];
        }
        
        sections.push(newSection);
      }

      // Get field instances for these sections
      const sectionIds = sections.map(s => s.id);
      const { data, error } = await supabase
        .from('form_field_instances')
        .select(`
          *,
          field_library (*)
        `)
        .in('form_section_id', sectionIds)
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
