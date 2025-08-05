
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeInput, validateTextLength } from '@/utils/security';
import { toast } from 'sonner';

interface AddFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  refetchFields: () => void;
}

export const AddFieldDialog: React.FC<AddFieldDialogProps> = ({ 
  isOpen, 
  onClose, 
  formId, 
  refetchFields 
}) => {
  const { currentTenant } = useAuth();

  const createFieldMutation = useSupabaseMutation(
    async (fieldData: any) => {
      // First create the field in the library
      const { data: newField, error: fieldError } = await supabase
        .from('field_library')
        .insert([{
          ...fieldData,
          tenant_id: currentTenant?.id
        }])
        .select()
        .single();
      
      if (fieldError) throw fieldError;

      // Get the default form section for this form template
      // First, let's find or create a default section for this form
      let { data: existingSections, error: sectionsError } = await supabase
        .from('form_sections')
        .select('*')
        .eq('form_page_id', formId) // Assuming formId is actually a page ID
        .eq('tenant_id', currentTenant?.id)
        .limit(1);

      if (sectionsError) throw sectionsError;

      let sectionId;
      if (!existingSections || existingSections.length === 0) {
        // Create a default section
        const { data: newSection, error: newSectionError } = await supabase
          .from('form_sections')
          .insert([{
            form_page_id: formId,
            section_title: 'Main Section',
            section_order: 1,
            tenant_id: currentTenant?.id
          }])
          .select()
          .single();
        
        if (newSectionError) throw newSectionError;
        sectionId = newSection.id;
      } else {
        sectionId = existingSections[0].id;
      }

      // Get the next field order
      const { data: maxOrder } = await supabase
        .from('form_field_instances')
        .select('field_order')
        .eq('form_section_id', sectionId)
        .order('field_order', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxOrder?.field_order || 0) + 1;

      // Add the field to the form section
      const { error: instanceError } = await supabase
        .from('form_field_instances')
        .insert([{
          form_section_id: sectionId,
          field_library_id: newField.id,
          field_order: nextOrder,
          tenant_id: currentTenant?.id
        }]);
      
      if (instanceError) throw instanceError;
      
      return newField;
    },
    {
      successMessage: 'Field created and added to form!',
      onSuccess: () => {
        onClose();
        refetchFields();
      }
    }
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Sanitize and validate inputs
    const rawLabel = formData.get('label') as string;
    const label = sanitizeInput(rawLabel || '');
    const helpText = sanitizeInput(formData.get('help_text') as string || '');
    const fieldType = sanitizeInput(formData.get('field_type') as string || '');
    const priceModifier = formData.get('price_modifier') as string || '';
    
    // Validation
    if (!label || label.trim() === '' || !validateTextLength(label, 100)) {
      toast.error('Field label is required and must be less than 100 characters');
      return;
    }
    
    if (helpText && !validateTextLength(helpText, 500)) {
      toast.error('Help text must be less than 500 characters');
      return;
    }
    
    if (!['text', 'toggle', 'number', 'date'].includes(fieldType)) {
      toast.error('Invalid field type selected');
      return;
    }
    
    // Validate price modifier
    const parsedPrice = parseFloat(priceModifier);
    if (priceModifier && (isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > 10000)) {
      toast.error('Price must be a valid number between 0 and 10,000');
      return;
    }
    
    // Create a unique name from label (slug-style)
    let fieldName = label.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .trim()
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
    
    // Ensure we have a valid name
    if (!fieldName || fieldName.length === 0) {
      fieldName = `field_${Date.now()}`;
    }
    
    createFieldMutation.mutate({
      name: fieldName,
      label: label,
      field_type: fieldType,
      help_text: helpText || null,
      price_modifier: parsedPrice || 0,
      affects_pricing: formData.get('affects_pricing') === 'on',
      auto_add_price_field: formData.get('auto_add_price_field') === 'on',
      auto_add_notes_field: formData.get('auto_add_notes_field') === 'on',
      active: true
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Field</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="label">Field Label *</Label>
            <Input 
              id="label" 
              name="label" 
              placeholder="e.g., Cake, Photography, DJ"
              required 
            />
          </div>
          
          <div>
            <Label htmlFor="field_type">Field Type *</Label>
            <Select name="field_type" required>
              <SelectTrigger>
                <SelectValue placeholder="Select field type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Box</SelectItem>
                <SelectItem value="toggle">Toggle (Yes/No)</SelectItem>
                <SelectItem value="number">Price Field</SelectItem>
                <SelectItem value="date">Date Field</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="help_text">Help Text (Optional)</Label>
            <Input 
              id="help_text" 
              name="help_text" 
              placeholder="Additional instructions for this field"
            />
          </div>
          
          <div>
            <Label htmlFor="price_modifier">Default Price (£)</Label>
            <Input 
              id="price_modifier" 
              name="price_modifier" 
              type="number" 
              step="0.01" 
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch id="affects_pricing" name="affects_pricing" />
              <Label htmlFor="affects_pricing">This field affects pricing</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch id="auto_add_price_field" name="auto_add_price_field" defaultChecked />
              <Label htmlFor="auto_add_price_field">Auto-add price field</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch id="auto_add_notes_field" name="auto_add_notes_field" defaultChecked />
              <Label htmlFor="auto_add_notes_field">Auto-add notes field</Label>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createFieldMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              {createFieldMutation.isPending ? 'Creating...' : 'Create & Add Field'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
