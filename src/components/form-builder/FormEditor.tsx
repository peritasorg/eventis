
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, Save, Edit2, FolderPlus } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FormSectionEditor } from './FormSectionEditor';

interface FormEditorProps {
  form: any;
  onBack: () => void;
}

export const FormEditor: React.FC<FormEditorProps> = ({ form, onBack }) => {
  const { currentTenant } = useAuth();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { data: fieldLibrary } = useSupabaseQuery(
    ['field-library'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');
      
      if (error) {
        console.error('Field library error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const { data: formSections } = useSupabaseQuery(
    ['form-sections', form.id],
    async () => {
      if (!form.id || !currentTenant?.id) return [];
      
      // First get form pages, then sections for those pages
      const { data: pages, error: pagesError } = await supabase
        .from('form_pages')
        .select('*')
        .eq('form_template_id', form.id)
        .eq('tenant_id', currentTenant.id)
        .order('page_number');
      
      if (pagesError) {
        console.error('Form pages error:', pagesError);
        return [];
      }

      if (!pages || pages.length === 0) {
        // Create a default page if none exists
        const { data: newPage, error: createPageError } = await supabase
          .from('form_pages')
          .insert([{
            form_template_id: form.id,
            tenant_id: currentTenant.id,
            page_number: 1,
            page_title: 'Main Page',
            page_description: 'Primary form page'
          }])
          .select()
          .single();
        
        if (createPageError) {
          console.error('Create page error:', createPageError);
          return [];
        }
        
        pages.push(newPage);
      }

      const { data: sections, error: sectionsError } = await supabase
        .from('form_sections')
        .select('*')
        .in('form_page_id', pages.map(p => p.id))
        .eq('tenant_id', currentTenant.id)
        .order('section_order');
      
      if (sectionsError) {
        console.error('Form sections error:', sectionsError);
        return [];
      }
      
      return sections || [];
    }
  );

  const createSectionMutation = useSupabaseMutation(
    async (sectionData: any) => {
      // First, get the first page for this form
      const { data: pages } = await supabase
        .from('form_pages')
        .select('id')
        .eq('form_template_id', form.id)
        .eq('tenant_id', currentTenant.id)
        .order('page_number')
        .limit(1);

      if (!pages || pages.length === 0) {
        throw new Error('No pages found for this form');
      }

      const maxOrder = Math.max(...(formSections?.map(s => s.section_order) || [0]), 0);
      
      const { data, error } = await supabase
        .from('form_sections')
        .insert([{
          ...sectionData,
          form_page_id: pages[0].id,
          tenant_id: currentTenant?.id,
          section_order: maxOrder + 1
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Section created successfully!',
      invalidateQueries: [['form-sections', form.id]]
    }
  );

  const deleteSectionMutation = useSupabaseMutation(
    async (sectionId: string) => {
      const { error } = await supabase
        .from('form_sections')
        .delete()
        .eq('id', sectionId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Section deleted successfully!',
      invalidateQueries: [['form-sections', form.id]]
    }
  );

  const handleCreateSection = () => {
    const sectionName = prompt('Enter section name:');
    if (sectionName) {
      createSectionMutation.mutate({
        section_title: sectionName,
        section_description: '',
        layout_type: 'single_column'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{form.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{form.description}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
              <Button size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Form
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Form Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sections List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Form Sections
                <Button 
                  size="sm" 
                  onClick={handleCreateSection}
                  className="h-7"
                >
                  <FolderPlus className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {formSections?.map((section) => (
                  <div
                    key={section.id}
                    className={`p-2 border rounded cursor-pointer transition-colors ${
                      activeSection === section.id 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{section.section_title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSectionMutation.mutate(section.id);
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {(!formSections || formSections.length === 0) && (
                  <div className="text-center py-4 text-gray-500">
                    <FolderPlus className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No sections yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Editor */}
        <div className="lg:col-span-3">
          {activeSection ? (
            <FormSectionEditor 
              sectionId={activeSection}
              formId={form.id}
              fieldLibrary={fieldLibrary || []}
            />
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Edit2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select a section to edit its fields</p>
                  <p className="text-sm mt-1">Or create a new section to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
