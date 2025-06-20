
import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FormList } from '@/components/form-builder/FormList';
import { FormEditor } from '@/components/form-builder/FormEditor';
import { FieldLibrary } from '@/components/form-builder/FieldLibrary';

type ViewMode = 'forms' | 'edit-form' | 'field-library';

export const FormBuilder = () => {
  const { currentTenant } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('forms');
  const [editingForm, setEditingForm] = useState<any>(null);

  const { data: forms, refetch: refetchForms } = useSupabaseQuery(
    ['form-templates'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Forms error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const handleEditForm = (form: any) => {
    setEditingForm(form);
    setViewMode('edit-form');
  };

  const handleBackToForms = () => {
    setEditingForm(null);
    setViewMode('forms');
  };

  if (viewMode === 'edit-form' && editingForm) {
    return (
      <FormEditor 
        form={editingForm}
        onBack={handleBackToForms}
      />
    );
  }

  if (viewMode === 'field-library') {
    return (
      <div>
        <div className="p-6 bg-white border-b">
          <Button variant="outline" onClick={() => setViewMode('forms')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Button>
        </div>
        <FieldLibrary />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
            <p className="text-gray-600 text-sm">Create questionnaire forms for your events</p>
          </div>
          
          <Button onClick={() => setViewMode('field-library')}>
            Field Library
          </Button>
        </div>

        {/* Content */}
        <FormList 
          forms={forms}
          onEditForm={handleEditForm}
          refetchForms={refetchForms}
        />
      </div>
    </div>
  );
};
