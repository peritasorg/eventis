-- Create calendar_sync_configs table for managing which fields appear in calendar descriptions
CREATE TABLE public.calendar_sync_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  event_type_config_id UUID NOT NULL,
  form_id UUID NOT NULL,
  selected_fields TEXT[] NOT NULL DEFAULT '{}',
  show_pricing_fields_only BOOLEAN NOT NULL DEFAULT false,
  field_display_format JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one active config per event type and form combination
  UNIQUE(tenant_id, event_type_config_id, form_id, is_active) 
);

-- Enable RLS
ALTER TABLE public.calendar_sync_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant isolation
CREATE POLICY "calendar_sync_configs_tenant_isolation" 
ON public.calendar_sync_configs 
FOR ALL 
USING (tenant_id = get_current_tenant_id());

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_calendar_sync_configs_updated_at
  BEFORE UPDATE ON public.calendar_sync_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();