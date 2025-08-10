import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Edit2, Trash2 } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const FormsList: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();

  const { data: forms = [], isLoading, refetch } = useSupabaseQuery(
    ['new-forms', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('new_forms')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  );

  const deleteFormMutation = useSupabaseMutation(
    async (formId: string) => {
      const { error } = await supabase
        .from('new_forms')
        .update({ is_active: false })
        .eq('id', formId);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Form deleted successfully');
        refetch();
      },
      onError: (error) => {
        toast.error('Failed to delete form: ' + error.message);
      }
    }
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Forms</h1>
            <p className="text-muted-foreground">Manage your event form templates</p>
          </div>
          <Button onClick={() => navigate('/forms/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Form
          </Button>
        </div>

        {/* Forms Grid */}
        {forms.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first form template to streamline event management
              </p>
              <Button onClick={() => navigate('/forms/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Form
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <Card key={form.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">{form.name}</CardTitle>
                      {form.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {form.description}
                        </p>
                      )}
                    </div>
                    <FileText className="h-5 w-5 text-muted-foreground ml-2" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {form.sections?.length || 0} sections • Created {new Date(form.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/forms/${form.id}/edit`)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/forms/${form.id}/preview`)}
                      >
                        Preview
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteFormMutation.mutate(form.id)}
                        disabled={deleteFormMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};