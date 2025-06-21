
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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

  // Show mobile restriction message
  if (isMobile) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <Tablet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl text-gray-900 dark:text-white">Form Builder Not Available</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              The Form Builder requires a larger screen for the best experience. Please use a tablet or desktop device to access this feature.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              <p>Minimum screen width: 768px</p>
              <p>Your current width: {window.innerWidth}px</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="flex-shrink-0 p-4 sm:p-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
          <Button variant="outline" onClick={() => setViewMode('forms')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <FieldLibrary />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-shrink-0 p-4 sm:p-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Form Builder</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Create questionnaire forms for your events</p>
            </div>
            
            <Button onClick={() => setViewMode('field-library')} className="w-full sm:w-auto">
              Field Library
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <FormList 
            forms={forms}
            onEditForm={handleEditForm}
            refetchForms={refetchForms}
          />
        </div>
      </div>
    </div>
  );
};
