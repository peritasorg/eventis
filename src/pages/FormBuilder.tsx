import React, { useState } from 'react';
import { Plus, Edit, Eye, Copy, Trash2, Settings, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FormBuilderEditor } from '@/components/form-builder/FormBuilderEditor';

export const FormBuilder = () => {
  const { currentTenant } = useAuth();
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isFieldLibraryOpen, setIsFieldLibraryOpen] = useState(false);
  const [isCreateFieldOpen, setIsCreateFieldOpen] = useState(false);
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

  const { data: fieldLibrary, refetch: refetchFields } = useSupabaseQuery(
    ['field-library'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Field library error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const createFormMutation = useSupabaseMutation(
    async (formData: any) => {
      const { data, error } = await supabase
        .from('form_templates')
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
      invalidateQueries: [['form-templates']],
      onSuccess: () => {
        setIsCreateFormOpen(false);
      }
    }
  );

  const createFieldMutation = useSupabaseMutation(
    async (fieldData: any) => {
      const { data, error } = await supabase
        .from('field_library')
        .insert([{
          ...fieldData,
          tenant_id: currentTenant?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Field added to library successfully!',
      invalidateQueries: [['field-library']],
      onSuccess: () => {
        setIsCreateFieldOpen(false);
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
      invalidateQueries: [['form-templates']]
    }
  );

  const deleteFieldMutation = useSupabaseMutation(
    async (fieldId: string) => {
      const { error } = await supabase
        .from('field_library')
        .update({ active: false })
        .eq('id', fieldId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field removed from library!',
      invalidateQueries: [['field-library']]
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
      invalidateQueries: [['form-templates']]
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

  const handleCreateField = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const fieldData = {
      name: formData.get('name') as string,
      label: formData.get('label') as string,
      field_type: formData.get('field_type') as string,
      help_text: formData.get('help_text') as string,
      placeholder: formData.get('placeholder') as string,
      default_value: formData.get('default_value') as string,
      category: formData.get('category') as string,
      affects_pricing: formData.get('affects_pricing') === 'on',
      price_modifier: parseFloat(formData.get('price_modifier') as string) || 0,
      pricing_type: formData.get('pricing_type') as string || 'fixed',
      validation_rules: {},
      options: formData.get('options') ? JSON.parse(formData.get('options') as string) : null,
      active: true
    };

    createFieldMutation.mutate(fieldData);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Form Builder</h1>
          <p className="text-gray-600 text-sm">Create and manage your event inquiry forms</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isFieldLibraryOpen} onOpenChange={setIsFieldLibraryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Field Library
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Field Library</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Dialog open={isCreateFieldOpen} onOpenChange={setIsCreateFieldOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New Field</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateField} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="field_name" className="text-sm">Field Name *</Label>
                            <Input id="field_name" name="name" required className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="field_label" className="text-sm">Label *</Label>
                            <Input id="field_label" name="label" required className="h-9" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="field_type" className="text-sm">Field Type *</Label>
                            <Select name="field_type" required>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select field type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="textarea">Textarea</SelectItem>
                                <SelectItem value="select">Select</SelectItem>
                                <SelectItem value="radio">Radio</SelectItem>
                                <SelectItem value="checkbox">Checkbox</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="phone">Phone</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="field_category" className="text-sm">Category</Label>
                            <Select name="category">
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="basic">Basic Information</SelectItem>
                                <SelectItem value="event_details">Event Details</SelectItem>
                                <SelectItem value="catering">Catering</SelectItem>
                                <SelectItem value="services">Services</SelectItem>
                                <SelectItem value="contact">Contact</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="field_help_text" className="text-sm">Help Text</Label>
                          <Input id="field_help_text" name="help_text" className="h-9" />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="field_placeholder" className="text-sm">Placeholder</Label>
                          <Input id="field_placeholder" name="placeholder" className="h-9" />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch id="affects_pricing" name="affects_pricing" />
                          <Label htmlFor="affects_pricing" className="text-sm">Affects Pricing</Label>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="price_modifier" className="text-sm">Price Modifier</Label>
                            <Input id="price_modifier" name="price_modifier" type="number" step="0.01" className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="pricing_type" className="text-sm">Pricing Type</Label>
                            <Select name="pricing_type">
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select pricing type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed Amount</SelectItem>
                                <SelectItem value="per_guest">Per Guest</SelectItem>
                                <SelectItem value="percentage">Percentage</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setIsCreateFieldOpen(false)} size="sm">
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createFieldMutation.isPending} size="sm">
                            <Save className="h-4 w-4 mr-1" />
                            {createFieldMutation.isPending ? 'Creating...' : 'Create Field'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {fieldLibrary?.map((field) => (
                    <Card key={field.id} className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-sm">{field.label}</h4>
                          <p className="text-xs text-gray-600">{field.field_type}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFieldMutation.mutate(field.id)}
                          disabled={deleteFieldMutation.isPending}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                      {field.help_text && (
                        <p className="text-xs text-gray-500 mb-2">{field.help_text}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {field.category || 'Uncategorized'}
                        </span>
                        {field.affects_pricing && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            £{field.price_modifier}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Form
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
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="corporate">Corporate Event</SelectItem>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="anniversary">Anniversary</SelectItem>
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
                      onClick={() => setEditingForm(form)}
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

      {/* Form Builder Editor */}
      {editingForm && (
        <FormBuilderEditor
          form={editingForm}
          open={!!editingForm}
          onClose={() => setEditingForm(null)}
        />
      )}
    </div>
  );
};
