-- Create event type form mappings table
CREATE TABLE public.event_type_form_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  event_type_config_id UUID NOT NULL,
  form_template_id UUID NOT NULL,
  default_label TEXT NOT NULL DEFAULT '',
  auto_assign BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_tenant_event_type_form UNIQUE(tenant_id, event_type_config_id, form_template_id)
);

-- Enable RLS
ALTER TABLE public.event_type_form_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant isolation
CREATE POLICY "event_type_form_mappings_tenant_isolation" 
ON public.event_type_form_mappings 
FOR ALL 
USING (tenant_id = get_current_tenant_id());

-- Create updated_at trigger
CREATE TRIGGER update_event_type_form_mappings_updated_at
BEFORE UPDATE ON public.event_type_form_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_event_type_form_mappings_tenant_event_type 
ON public.event_type_form_mappings(tenant_id, event_type_config_id);

-- Create index for sorting
CREATE INDEX idx_event_type_form_mappings_sort_order 
ON public.event_type_form_mappings(event_type_config_id, sort_order);