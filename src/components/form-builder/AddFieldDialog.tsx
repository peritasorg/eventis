
import React, { useState } from 'react';
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
  const [fieldType, setFieldType] = useState<string>('');

  const createFieldMutation = useSupabaseMutation(
    async (fieldData: any) => {
      console.log('🔍 DEBUGGING: Field data received by mutation:', fieldData);
      console.log('🔍 DEBUGGING: Tenant ID:', currentTenant?.id);
      console.log('🔍 DEBUGGING: Field data type and keys:', typeof fieldData, Object.keys(fieldData));
      console.log('🔍 DEBUGGING: Name field specifically:', fieldData.name, typeof fieldData.name);
      
      // Validate that required fields are present
      if (!fieldData.name || !fieldData.label || !fieldData.field_type) {
        console.error('❌ VALIDATION FAILED: Missing required fields');
        console.error('Name:', fieldData.name);
        console.error('Label:', fieldData.label);
        console.error('Field Type:', fieldData.field_type);
        throw new Error(`Missing required fields: name=${fieldData.name}, label=${fieldData.label}, field_type=${fieldData.field_type}`);
      }
      
      // Prepare the exact data for insertion
      const insertData = {
        name: fieldData.name,
        label: fieldData.label,
        field_type: fieldData.field_type,
        help_text: fieldData.help_text,
        price_modifier: fieldData.price_modifier,
        affects_pricing: fieldData.affects_pricing,
        auto_add_price_field: fieldData.auto_add_price_field,
        auto_add_notes_field: fieldData.auto_add_notes_field,
        active: fieldData.active,
        tenant_id: currentTenant?.id
      };
      
      console.log('🔍 DEBUGGING: Exact data being sent to Supabase:', insertData);
      console.log('🔍 DEBUGGING: Insert data name field:', insertData.name, typeof insertData.name);
      
      // First create the field in the library
      const { data: newField, error: fieldError } = await supabase
        .from('field_library')
        .insert([insertData])
        .select()
        .single();
      
      if (fieldError) {
        console.error('❌ DATABASE INSERT ERROR:', fieldError);
        console.error('❌ Data that failed to insert:', insertData);
        throw fieldError;
      }
      
      console.log('✅ SUCCESS: Field created in library:', newField);

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
        setFieldType(''); // Reset field type
        onClose();
        refetchFields();
      }
    }
  );

  // Bulletproof name generation function
  const generateFieldName = (label: string): string => {
    // Start with the raw label
    let fieldName = label.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters but keep spaces and hyphens
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/-+/g, '_') // Replace hyphens with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .trim()
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
    
    // Fallback 1: Try using just letters and numbers
    if (!fieldName || fieldName.length === 0) {
      fieldName = label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    }
    
    // Fallback 2: Use field type + timestamp
    if (!fieldName || fieldName.length === 0) {
      fieldName = `${fieldType || 'field'}_${Date.now()}`;
    }
    
    // Final fallback: Guaranteed unique name
    if (!fieldName || fieldName.length === 0) {
      fieldName = `field_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }
    
    // Ensure the name is valid (no null/undefined/empty)
    return fieldName && typeof fieldName === 'string' && fieldName.trim() 
      ? fieldName 
      : `field_${Date.now()}`;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get raw inputs
    const rawLabel = formData.get('label') as string || '';
    const rawHelpText = formData.get('help_text') as string || '';
    const priceModifier = formData.get('price_modifier') as string || '';
    
    console.log('Raw inputs:', { rawLabel, rawHelpText, fieldType, priceModifier });
    
    // Validate required fields FIRST
    if (!rawLabel.trim()) {
      toast.error('Field label is required');
      return;
    }
    
    if (!fieldType || !['text', 'toggle', 'number', 'date'].includes(fieldType)) {
      toast.error('Please select a valid field type');
      return;
    }
    
    // Sanitize inputs (but only text inputs, not controlled components)
    const label = sanitizeInput(rawLabel);
    const helpText = rawHelpText ? sanitizeInput(rawHelpText) : '';
    
    console.log('Sanitized inputs:', { label, helpText, fieldType });
    
    // Validate sanitized inputs
    if (!label || label.trim() === '') {
      toast.error('Field label contains invalid characters. Please use only letters, numbers, and basic punctuation.');
      return;
    }
    
    if (!validateTextLength(label, 100)) {
      toast.error('Field label must be less than 100 characters');
      return;
    }
    
    if (helpText && !validateTextLength(helpText, 500)) {
      toast.error('Help text must be less than 500 characters');
      return;
    }
    
    // Validate price modifier
    const parsedPrice = parseFloat(priceModifier);
    if (priceModifier && (isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > 10000)) {
      toast.error('Price must be a valid number between 0 and 10,000');
      return;
    }
    
    // Generate bulletproof field name
    const fieldName = generateFieldName(rawLabel);
    
    console.log('Generated field name:', fieldName);
    
    // Final validation before database insertion
    const mutationData = {
      name: fieldName,
      label: label,
      field_type: fieldType,
      help_text: helpText || null,
      price_modifier: parsedPrice || 0,
      affects_pricing: formData.get('affects_pricing') === 'on',
      auto_add_price_field: formData.get('auto_add_price_field') === 'on',
      auto_add_notes_field: formData.get('auto_add_notes_field') === 'on',
      active: true
    };
    
    // CRITICAL: Final null check before mutation
    if (!mutationData.name || !mutationData.label || !mutationData.field_type) {
      toast.error('Critical error: Missing required field data. Please try again.');
      console.error('Missing required data:', mutationData);
      return;
    }
    
    console.log('Final mutation data:', mutationData);
    
    createFieldMutation.mutate(mutationData);
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
            <Select value={fieldType} onValueChange={setFieldType} required>
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
