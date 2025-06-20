
import React, { useState } from 'react';
import { Plus, Edit, Eye, Copy, Trash2, Settings, Save, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FormTemplateList } from '@/components/form-builder/FormTemplateList';
import { FormEditor } from '@/components/form-builder/FormEditor';
import { FieldLibraryManager } from '@/components/form-builder/FieldLibraryManager';

type ViewMode = 'templates' | 'edit-form' | 'field-library';

export const FormBuilder = () => {
  const { currentTenant } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('templates');
  const [editingForm, setEditingForm] = useState<any>(null);

  const { data: formTemplates, refetch: refetchForms } = useSupabaseQuery(
    ['form-templates'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Form templates error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const handleEditForm = (form: any) => {
    setEditingForm(form);
    setViewMode('edit-form');
  };

  const handleBackToTemplates = () => {
    setEditingForm(null);
    setViewMode('templates');
  };

  const renderBreadcrumb = () => {
    const items = [
      { label: 'Form Templates', active: viewMode === 'templates' },
    ];

    if (viewMode === 'edit-form' && editingForm) {
      items.push({ label: editingForm.name, active: true });
    } else if (viewMode === 'field-library') {
      items.push({ label: 'Field Library', active: true });
    }

    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ArrowRight className="h-4 w-4" />}
            <span className={item.active ? 'text-blue-600 font-medium' : 'hover:text-gray-800 cursor-pointer'}>
              {item.label}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Form Builder</h1>
            <p className="text-gray-600 text-sm">Create and manage your event inquiry forms</p>
          </div>
          
          <div className="flex gap-2">
            {viewMode !== 'templates' && (
              <Button variant="outline" size="sm" onClick={handleBackToTemplates}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Templates
              </Button>
            )}
            
            {viewMode === 'templates' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setViewMode('field-library')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Field Library
              </Button>
            )}
          </div>
        </div>

        {renderBreadcrumb()}

        {viewMode === 'templates' && (
          <FormTemplateList 
            formTemplates={formTemplates}
            onEditForm={handleEditForm}
            refetchForms={refetchForms}
          />
        )}

        {viewMode === 'edit-form' && editingForm && (
          <FormEditor 
            form={editingForm}
            onBack={handleBackToTemplates}
          />
        )}

        {viewMode === 'field-library' && (
          <FieldLibraryManager />
        )}
      </div>
    </div>
  );
};
