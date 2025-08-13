-- Create PDF templates table for customizable PDF layouts
CREATE TABLE public.pdf_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('quote', 'invoice', 'both')),
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  page_settings JSONB NOT NULL DEFAULT '{
    "size": "A4",
    "orientation": "portrait",
    "margins": {
      "top": 20,
      "right": 20,
      "bottom": 20,
      "left": 20
    }
  }'::jsonb,
  styling JSONB NOT NULL DEFAULT '{
    "primary_color": "#000000",
    "secondary_color": "#666666",
    "font_family": "helvetica",
    "logo_position": "top-left",
    "compact_mode": true
  }'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
CREATE POLICY "Users can view their tenant's PDF templates" 
ON public.pdf_templates 
FOR SELECT 
USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can create PDF templates for their tenant" 
ON public.pdf_templates 
FOR INSERT 
WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can update their tenant's PDF templates" 
ON public.pdf_templates 
FOR UPDATE 
USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can delete their tenant's PDF templates" 
ON public.pdf_templates 
FOR DELETE 
USING (tenant_id = get_current_tenant_id());

-- Create indexes for performance
CREATE INDEX idx_pdf_templates_tenant_id ON public.pdf_templates(tenant_id);
CREATE INDEX idx_pdf_templates_document_type ON public.pdf_templates(document_type);
CREATE INDEX idx_pdf_templates_is_default ON public.pdf_templates(is_default) WHERE is_default = true;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pdf_templates_updated_at
BEFORE UPDATE ON public.pdf_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add activity logging trigger
CREATE TRIGGER log_pdf_templates_activity
AFTER INSERT OR UPDATE OR DELETE ON public.pdf_templates
FOR EACH ROW
EXECUTE FUNCTION public.log_activity();