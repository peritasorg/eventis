-- Create specification template configurations table
CREATE TABLE public.specification_template_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  form_id UUID NOT NULL,
  selected_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.specification_template_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their tenant's specification configs" 
ON public.specification_template_configs 
FOR ALL 
USING (tenant_id = get_current_tenant_id());

-- Add updated_at trigger
CREATE TRIGGER update_specification_template_configs_updated_at
BEFORE UPDATE ON public.specification_template_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();