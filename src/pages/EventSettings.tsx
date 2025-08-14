import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { toast } from 'sonner';

export const EventSettings: React.FC = () => {
  const { currentTenant } = useAuth();
  
  // Ethnicity Options Management
  const [isEthnicityDialogOpen, setIsEthnicityDialogOpen] = useState(false);
  const [ethnicityName, setEthnicityName] = useState('');
  const [editingEthnicity, setEditingEthnicity] = useState<any>(null);

  // Fetch ethnicity options
  const { data: ethnicityOptions, refetch: refetchEthnicityOptions } = useSupabaseQuery(
    ['event_ethnicity_options', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_ethnicity_options')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('ethnicity_name');
      
      if (error) throw error;
      return data || [];
    }
  );

  // Ethnicity mutations
  const saveEthnicityMutation = useSupabaseMutation(
    async () => {
      if (!currentTenant?.id || !ethnicityName.trim()) {
        throw new Error('Ethnicity name is required');
      }

      if (editingEthnicity) {
        const { error } = await supabase
          .from('event_ethnicity_options')
          .update({
            ethnicity_name: ethnicityName.trim()
          })
          .eq('id', editingEthnicity.id)
          .eq('tenant_id', currentTenant.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_ethnicity_options')
          .insert({
            tenant_id: currentTenant.id,
            ethnicity_name: ethnicityName.trim(),
            is_active: true
          });
        
        if (error) throw error;
      }
    },
    {
      onSuccess: () => {
        toast.success(editingEthnicity ? 'Ethnicity updated' : 'Ethnicity added');
        resetEthnicityForm();
        refetchEthnicityOptions();
      }
    }
  );

  const deleteEthnicityMutation = useSupabaseMutation(
    async (id: string) => {
      if (!currentTenant?.id) throw new Error('No tenant');
      
      const { error } = await supabase
        .from('event_ethnicity_options')
        .delete()
        .eq('id', id)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Ethnicity option deleted');
        refetchEthnicityOptions();
      }
    }
  );

  const resetEthnicityForm = () => {
    setEthnicityName('');
    setEditingEthnicity(null);
    setIsEthnicityDialogOpen(false);
  };

  const handleEditEthnicity = (ethnicity: any) => {
    setEditingEthnicity(ethnicity);
    setEthnicityName(ethnicity.ethnicity_name);
    setIsEthnicityDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Event Settings</h1>
      </div>

      {/* Ethnicity Options Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Ethnicity Options
            </CardTitle>
            <Dialog open={isEthnicityDialogOpen} onOpenChange={setIsEthnicityDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  resetEthnicityForm();
                  setIsEthnicityDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ethnicity
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingEthnicity ? 'Edit Ethnicity' : 'Add Ethnicity'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ethnicity_name">Ethnicity Name</Label>
                    <Input
                      id="ethnicity_name"
                      value={ethnicityName}
                      onChange={(e) => setEthnicityName(e.target.value)}
                      placeholder="e.g., Asian"
                    />
                  </div>
                  <Button
                    onClick={() => saveEthnicityMutation.mutate({})}
                    disabled={!ethnicityName.trim() || saveEthnicityMutation.isPending}
                    className="w-full"
                  >
                    {saveEthnicityMutation.isPending ? 'Saving...' : (editingEthnicity ? 'Update' : 'Add')} Ethnicity
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {ethnicityOptions && ethnicityOptions.length > 0 ? (
            <div className="space-y-3">
              {ethnicityOptions.map((option) => (
                <div key={option.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{option.ethnicity_name}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={option.is_active ? "default" : "secondary"}>
                      {option.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditEthnicity(option)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEthnicityMutation.mutate(option.id)}
                      disabled={deleteEthnicityMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No ethnicity options configured. Add your first option to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};