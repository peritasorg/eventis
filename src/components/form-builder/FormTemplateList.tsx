
import React, { useState } from 'react';
import { Plus, Edit, Eye, Copy, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';

interface FormTemplateListProps {
  formTemplates: any[];
  onEditForm: (form: any) => void;
  refetchForms: () => void;
}

export const FormTemplateList: React.FC<FormTemplateListProps> = ({ 
  formTemplates, 
  onEditForm, 
  refetchForms 
}) => {
  const { currentTenant } = useAuth();
  const { data: eventTypeConfigs } = useEventTypeConfigs();
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  const createFormMutation = useSupabaseMutation(
    async (formData: any) => {
      const { data, error } = await supabase
        .from('forms')
        .insert([{
          ...formData,
          tenant_id: currentTenant?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Form template created successfully!',
      onSuccess: () => {
        setIsCreateFormOpen(false);
        refetchForms();
      }
    }
  );

  const deleteFormMutation = useSupabaseMutation(
    async (formId: string) => {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', formId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Form template deleted successfully!',
      onSuccess: refetchForms
    }
  );

  const cloneFormMutation = useSupabaseMutation(
    async (formId: string) => {
      const { data: originalForm, error: fetchError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', formId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { data, error } = await supabase
        .from('form_templates')
        .insert([{
          ...originalForm,
          id: undefined,
          name: `${originalForm.name} (Copy)`,
          created_at: undefined,
          updated_at: undefined,
          usage_count: 0,
          last_used_at: null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Form template cloned successfully!',
      onSuccess: refetchForms
    }
  );

  const handleCreateForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const templateData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      event_types: [formData.get('event_type') as string].filter(Boolean),
      show_progress_bar: formData.get('show_progress_bar') === 'on',
      require_all_pages: formData.get('require_all_pages') === 'on',
      allow_save_and_resume: formData.get('allow_save_and_resume') === 'on',
      is_default: formData.get('is_default') === 'on',
      active: true
    };

    createFormMutation.mutate(templateData);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Form Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Form Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateForm} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="form_name" className="text-sm">Form Name *</Label>
                <Input id="form_name" name="name" required className="h-9" />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="form_description" className="text-sm">Description</Label>
                <Textarea id="form_description" name="description" rows={2} />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="event_type" className="text-sm">Event Type</Label>
                <Select name="event_type">
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeConfigs?.map(config => (
                      <SelectItem key={config.id} value={config.event_type}>
                        {config.display_name}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch id="show_progress_bar" name="show_progress_bar" defaultChecked />
                  <Label htmlFor="show_progress_bar" className="text-sm">Show Progress Bar</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="require_all_pages" name="require_all_pages" defaultChecked />
                  <Label htmlFor="require_all_pages" className="text-sm">Require All Pages</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="allow_save_and_resume" name="allow_save_and_resume" defaultChecked />
                  <Label htmlFor="allow_save_and_resume" className="text-sm">Allow Save and Resume</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="is_default" name="is_default" />
                  <Label htmlFor="is_default" className="text-sm">Set as Default Template</Label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateFormOpen(false)} size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createFormMutation.isPending} size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  {createFormMutation.isPending ? 'Creating...' : 'Create Form'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {formTemplates?.map((form) => (
          <Card key={form.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="truncate">{form.name}</span>
                {form.is_default && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Default
                  </span>
                )}
              </CardTitle>
              {form.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{form.description}</p>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Usage: {form.usage_count || 0}</span>
                  <span>
                    {form.last_used_at 
                      ? `Last used: ${new Date(form.last_used_at).toLocaleDateString()}`
                      : 'Never used'
                    }
                  </span>
                </div>
                
                {form.event_types && form.event_types.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.event_types.map((type: string, index: number) => (
                      <span key={index} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {type}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-between pt-2 border-t">
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Edit"
                      onClick={() => onEditForm(form)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Preview" className="h-7 w-7 p-0">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Clone"
                      onClick={() => cloneFormMutation.mutate(form.id)}
                      disabled={cloneFormMutation.isPending}
                      className="h-7 w-7 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    title="Delete"
                    onClick={() => deleteFormMutation.mutate(form.id)}
                    disabled={deleteFormMutation.isPending}
                    className="h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {(!formTemplates || formTemplates.length === 0) && (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 mb-4">
              <Plus className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No form templates yet</h3>
            <p className="text-gray-600 mb-4">Create your first form template to get started</p>
            <Button onClick={() => setIsCreateFormOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Form
            </Button>
          </div>
        )}
      </div>
    </>
  );
};
