import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Copy, Eye, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForms } from '@/hooks/useForms';
import { FormPreview } from '@/components/form-builder/FormPreview';
import { useFormFields } from '@/hooks/useFormFields';
import { formatDistanceToNow } from 'date-fns';

export const Forms = () => {
  const navigate = useNavigate();
  const { forms, deleteForm, duplicateForm, isDeleting, isDuplicating } = useForms();
  const { formFields } = useFormFields();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewForm, setPreviewForm] = useState<any>(null);

  const filteredForms = forms.filter(form =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (form.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteForm = async (formId: string, formName: string) => {
    if (window.confirm(`Are you sure you want to delete "${formName}"? This action cannot be undone.`)) {
      deleteForm(formId);
    }
  };

  const getFormStats = (form: any) => {
    const sections = Array.isArray(form.sections) ? form.sections : [];
    const fieldCount = sections.reduce((total: number, section: any) => total + (section.field_ids?.length || 0), 0);
    return {
      sections: sections.length,
      fields: fieldCount
    };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forms</h1>
          <p className="text-muted-foreground">Create and manage your event forms</p>
        </div>
        <Button onClick={() => navigate('/form-builder')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Form
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search forms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Forms Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredForms.map((form) => {
          const stats = getFormStats(form);
          return (
            <Card key={form.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{form.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{stats.sections} sections</Badge>
                      <Badge variant="outline">{stats.fields} fields</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/form-builder/${form.id}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {form.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {form.description}
                  </p>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Last updated: {formatDistanceToNow(new Date(form.updated_at))} ago
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/form-builder/${form.id}`)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => duplicateForm(form.id)}
                    disabled={isDuplicating}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewForm(form)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteForm(form.id, form.name)}
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredForms.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No forms found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'No forms match your search.' : 'Create your first form to get started.'}
          </p>
          {!searchQuery && (
            <Button onClick={() => navigate('/form-builder')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Form
            </Button>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewForm && (
        <FormPreview
          formName={previewForm.name}
          sections={previewForm.sections || []}
          fields={formFields}
          open={!!previewForm}
          onClose={() => setPreviewForm(null)}
        />
      )}
    </div>
  );
};