
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FormListProps {
  forms: any[];
  onEditForm: (form: any) => void;
  refetchForms: () => void;
}

export const FormList: React.FC<FormListProps> = ({ forms, onEditForm, refetchForms }) => {
  const { currentTenant } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
      successMessage: 'Form created successfully!',
      onSuccess: () => {
        setIsCreateOpen(false);
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
      successMessage: 'Form deleted successfully!',
      onSuccess: refetchForms
    }
  );

  const handleCreateForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createFormMutation.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      active: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Create Form Button */}
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Form
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Form</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateForm} className="space-y-4">
              <div>
                <Label htmlFor="name">Form Name *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="e.g., Somali Wedding Form"
                  required 
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder="Describe what this form is for..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createFormMutation.isPending}>
                  {createFormMutation.isPending ? 'Creating...' : 'Create Form'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {forms?.map((form) => (
          <Card key={form.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{form.name}</CardTitle>
              {form.description && (
                <p className="text-sm text-gray-600">{form.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Used {form.usage_count || 0} times
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onEditForm(form)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteFormMutation.mutate(form.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {(!forms || forms.length === 0) && (
          <div className="col-span-full text-center py-12">
            <Plus className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
            <p className="text-gray-600 mb-4">Create your first questionnaire form</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Form
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
