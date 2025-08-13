import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PDFTemplate {
  id: string;
  name: string;
  tenant_id: string;
  document_type: 'quote' | 'invoice' | 'both';
  sections: any[];
  page_settings: {
    size: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  styling: {
    primary_color: string;
    secondary_color: string;
    font_family: string;
    logo_position: 'top-left' | 'top-center' | 'top-right';
    compact_mode: boolean;
  };
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const usePDFTemplates = () => {
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['pdf-templates', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PDFTemplate[];
    },
    enabled: !!currentTenant?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<PDFTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      if (!currentTenant?.id) throw new Error('No tenant found');

      const { data, error } = await supabase
        .from('pdf_templates')
        .insert({
          ...template,
          tenant_id: currentTenant.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates', currentTenant?.id] });
      toast.success('PDF template created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating PDF template:', error);
      toast.error('Failed to create PDF template');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PDFTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('pdf_templates')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', currentTenant?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates', currentTenant?.id] });
      toast.success('PDF template updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating PDF template:', error);
      toast.error('Failed to update PDF template');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pdf_templates')
        .delete()
        .eq('id', id)
        .eq('tenant_id', currentTenant?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates', currentTenant?.id] });
      toast.success('PDF template deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting PDF template:', error);
      toast.error('Failed to delete PDF template');
    },
  });

  const setDefaultTemplate = useMutation({
    mutationFn: async ({ templateId, documentType }: { templateId: string; documentType: 'quote' | 'invoice' }) => {
      // First, unset all defaults for this document type
      await supabase
        .from('pdf_templates')
        .update({ is_default: false })
        .eq('tenant_id', currentTenant?.id)
        .in('document_type', [documentType, 'both']);

      // Then set the new default
      const { data, error } = await supabase
        .from('pdf_templates')
        .update({ is_default: true })
        .eq('id', templateId)
        .eq('tenant_id', currentTenant?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates', currentTenant?.id] });
      toast.success('Default template updated');
    },
    onError: (error: any) => {
      console.error('Error setting default template:', error);
      toast.error('Failed to set default template');
    },
  });

  const getDefaultTemplate = (documentType: 'quote' | 'invoice') => {
    return templates?.find(template => 
      template.is_default && 
      (template.document_type === documentType || template.document_type === 'both')
    ) || null;
  };

  return {
    templates: templates || [],
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate,
    getDefaultTemplate
  };
};