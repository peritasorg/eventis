-- Add form_sections table for organizing form fields into sections
CREATE TABLE IF NOT EXISTS public.form_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  section_order INTEGER NOT NULL DEFAULT 1,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.form_sections ENABLE ROW LEVEL SECURITY;

-- Create policies for form_sections
CREATE POLICY "Users can view their own form sections" 
ON public.form_sections 
FOR SELECT 
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can create their own form sections" 
ON public.form_sections 
FOR INSERT 
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can update their own form sections" 
ON public.form_sections 
FOR UPDATE 
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can delete their own form sections" 
ON public.form_sections 
FOR DELETE 
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Add section_id to form_field_instances to link fields to sections
ALTER TABLE public.form_field_instances 
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.form_sections(id) ON DELETE SET NULL;

-- Add trigger for timestamps
CREATE TRIGGER update_form_sections_updated_at
BEFORE UPDATE ON public.form_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();