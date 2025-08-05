import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SimpleAddFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  refetchFields: () => void;
}

export const SimpleAddFieldDialog: React.FC<SimpleAddFieldDialogProps> = ({ 
  isOpen, 
  onClose, 
  formId, 
  refetchFields 
}) => {
  const { currentTenant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    fieldType: '',
    helpText: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateSimpleName = (label: string): string => {
    // Simple, guaranteed name generation
    const baseName = label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    const timestamp = Date.now().toString().slice(-6);
    return baseName || `field_${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.label.trim()) {
      toast.error('Please enter a field label');
      return;
    }
    
    if (!formData.fieldType) {
      toast.error('Please select a field type');
      return;
    }
    
    if (!currentTenant?.id) {
      toast.error('No tenant found');
      return;
    }

    setLoading(true);
    
    try {
      // Generate name
      const fieldName = generateSimpleName(formData.label);
      
      console.log('🚀 Creating field with data:', {
        name: fieldName,
        label: formData.label,
        field_type: formData.fieldType,
        help_text: formData.helpText || null,
        tenant_id: currentTenant.id
      });

      // Step 1: Create field in library with minimal required data
      const { data: newField, error: fieldError } = await supabase
        .from('field_library')
        .insert({
          name: fieldName,
          label: formData.label,
          field_type: formData.fieldType,
          help_text: formData.helpText || null,
          tenant_id: currentTenant.id,
          active: true,
          affects_pricing: false,
          price_modifier: 0,
          auto_add_price_field: false,
          auto_add_notes_field: false
        })
        .select()
        .single();

      if (fieldError) {
        console.error('❌ Field creation failed:', fieldError);
        throw fieldError;
      }

      console.log('✅ Field created successfully:', newField);

      // Step 2: Find or create a default section
      let { data: sections, error: sectionsError } = await supabase
        .from('form_sections')
        .select('*')
        .eq('form_page_id', formId)
        .eq('tenant_id', currentTenant.id)
        .limit(1);

      if (sectionsError) throw sectionsError;

      let sectionId;
      if (!sections || sections.length === 0) {
        const { data: newSection, error: newSectionError } = await supabase
          .from('form_sections')
          .insert({
            form_page_id: formId,
            section_title: 'Main Section',
            section_order: 1,
            tenant_id: currentTenant.id
          })
          .select()
          .single();
        
        if (newSectionError) throw newSectionError;
        sectionId = newSection.id;
      } else {
        sectionId = sections[0].id;
      }

      // Step 3: Get next field order
      const { data: maxOrderResult } = await supabase
        .from('form_field_instances')
        .select('field_order')
        .eq('form_section_id', sectionId)
        .order('field_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (maxOrderResult?.field_order || 0) + 1;

      // Step 4: Add field instance
      const { error: instanceError } = await supabase
        .from('form_field_instances')
        .insert({
          form_section_id: sectionId,
          field_library_id: newField.id,
          field_order: nextOrder,
          tenant_id: currentTenant.id
        });

      if (instanceError) throw instanceError;

      toast.success('Field created and added to form!');
      setFormData({ label: '', fieldType: '', helpText: '' });
      onClose();
      refetchFields();

    } catch (error: any) {
      console.error('❌ Error creating field:', error);
      toast.error(error.message || 'Failed to create field');
    } finally {
      setLoading(false);
    }
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
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              placeholder="e.g., Cake, Photography, DJ"
              required 
            />
          </div>
          
          <div>
            <Label htmlFor="field_type">Field Type *</Label>
            <Select 
              value={formData.fieldType} 
              onValueChange={(value) => handleInputChange('fieldType', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Box</SelectItem>
                <SelectItem value="toggle">Toggle (Yes/No)</SelectItem>
                <SelectItem value="number">Number Field</SelectItem>
                <SelectItem value="date">Date Field</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="help_text">Help Text (Optional)</Label>
            <Input 
              id="help_text" 
              value={formData.helpText}
              onChange={(e) => handleInputChange('helpText', e.target.value)}
              placeholder="Additional instructions for this field"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Field'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};