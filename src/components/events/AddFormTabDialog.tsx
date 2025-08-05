import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AddFormTabDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  nextTabOrder: number;
  onSuccess: () => void;
}

export const AddFormTabDialog: React.FC<AddFormTabDialogProps> = ({
  open,
  onOpenChange,
  eventId,
  nextTabOrder,
  onSuccess
}) => {
  const { currentTenant } = useAuth();
  const [formLabel, setFormLabel] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const { data: formTemplates } = useSupabaseQuery(
    ['form-templates'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');
      
      if (error) {
        console.error('Form templates error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const addFormTabMutation = useSupabaseMutation(
    async () => {
      if (!selectedTemplateId || !formLabel.trim() || !currentTenant?.id || !eventId) {
        throw new Error('Please fill in all required fields');
      }
      
      // Use the database function to get the correct tab order
      const { data: nextOrder, error: orderError } = await supabase
        .rpc('get_next_tab_order', {
          p_event_id: eventId,
          p_tenant_id: currentTenant.id
        });
      
      if (orderError) {
        console.error('Error getting next tab order:', orderError);
        throw new Error('Failed to calculate tab order');
      }
      
      const { data, error } = await supabase
        .from('event_forms')
        .insert({
          tenant_id: currentTenant.id,
          event_id: eventId,
          form_template_id: selectedTemplateId,
          form_label: formLabel.trim(),
          tab_order: nextOrder || 1,
          form_responses: {},
          form_total: 0,
          is_active: true
        })
        .select()
        .single();
      
      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      return data;
    },
    {
      successMessage: 'Form tab added successfully!',
      onSuccess: () => {
        onSuccess();
        resetForm();
      }
    }
  );

  const resetForm = () => {
    setFormLabel('');
    setSelectedTemplateId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTemplateId) {
      toast.error('Please select a form template');
      return;
    }
    
    if (!formLabel.trim()) {
      toast.error('Please enter a tab label');
      return;
    }
    
    addFormTabMutation.mutate(undefined);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Form Tab</DialogTitle>
          <DialogDescription>
            Add a new form tab to this event. You can select from your existing form templates.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">Form Template *</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a form template..." />
              </SelectTrigger>
              <SelectContent>
                {formTemplates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.description && (
                      <span className="text-muted-foreground ml-2">- {template.description}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="label">Tab Label *</Label>
            <Input
              id="label"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              placeholder="e.g., Catering Form, Equipment Form..."
              required
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={addFormTabMutation.isPending || !selectedTemplateId || !formLabel.trim()}
            >
              {addFormTabMutation.isPending ? 'Adding...' : 'Add Form Tab'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};