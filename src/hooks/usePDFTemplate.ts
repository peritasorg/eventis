import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type PDFTemplate = Database['public']['Tables']['pdf_templates']['Row'];
type PDFTemplateInsert = Database['public']['Tables']['pdf_templates']['Insert'];

interface PDFTemplateData {
  name: string;
  document_type: 'quote' | 'invoice';
  sections: any;
  styling?: any;
  page_settings?: any;
  active?: boolean;
}

export const usePDFTemplate = (eventId?: string, documentType: 'quote' | 'invoice' = 'quote') => {
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load template for current document type
  useEffect(() => {
    if (!user) return;
    loadTemplate();
  }, [user, documentType]);

  const loadTemplate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('document_type', documentType)
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading template:', error);
        setError(error.message);
        return;
      }

      setTemplate(data);
    } catch (err) {
      console.error('Error loading template:', err);
      setError('Failed to load template');
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async (templateData: PDFTemplateData) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, deactivate existing templates of the same type
      await supabase
        .from('pdf_templates')
        .update({ active: false })
        .eq('document_type', templateData.document_type);

      // Create new template
      const insertData: PDFTemplateInsert = {
        name: templateData.name,
        document_type: templateData.document_type,
        sections: templateData.sections,
        styling: templateData.styling || {},
        page_settings: templateData.page_settings || {},
        active: templateData.active ?? true,
        tenant_id: user.id, // Add required tenant_id
      };

      const { data, error } = await supabase
        .from('pdf_templates')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error saving template:', error);
        setError(error.message);
        toast.error('Failed to save template');
        return;
      }

      setTemplate(data);
      toast.success('Template saved successfully');
      return data;
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template');
      toast.error('Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('pdf_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('Error deleting template:', error);
        setError(error.message);
        toast.error('Failed to delete template');
        return;
      }

      setTemplate(null);
      toast.success('Template deleted successfully');
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template');
      toast.error('Failed to delete template');
    } finally {
      setIsLoading(false);
    }
  };

  const duplicateTemplate = async (templateId: string, newName: string) => {
    if (!template) return;

    setIsLoading(true);
    setError(null);

    try {
      const insertData: PDFTemplateInsert = {
        name: newName,
        document_type: template.document_type,
        sections: template.sections,
        styling: template.styling,
        page_settings: template.page_settings,
        active: false,
        tenant_id: user.id, // Add required tenant_id
      };

      const { data, error } = await supabase
        .from('pdf_templates')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error duplicating template:', error);
        setError(error.message);
        toast.error('Failed to duplicate template');
        return;
      }

      toast.success('Template duplicated successfully');
      return data;
    } catch (err) {
      console.error('Error duplicating template:', err);
      setError('Failed to duplicate template');
      toast.error('Failed to duplicate template');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    template,
    isLoading,
    error,
    loadTemplate,
    saveTemplate,
    deleteTemplate,
    duplicateTemplate,
  };
};