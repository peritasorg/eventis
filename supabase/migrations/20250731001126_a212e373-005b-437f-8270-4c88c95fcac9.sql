-- Calendar Sync Feature Database Schema

-- Calendar integrations table to store user calendar connections
CREATE TABLE public.calendar_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
  calendar_id TEXT NOT NULL,
  calendar_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('to_calendar', 'from_calendar', 'bidirectional')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Calendar field mappings for custom field configuration
CREATE TABLE public.calendar_field_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  event_field TEXT NOT NULL,
  calendar_field TEXT NOT NULL,
  mapping_type TEXT NOT NULL DEFAULT 'direct' CHECK (mapping_type IN ('direct', 'template', 'computed')),
  template_format TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Calendar sync logs for tracking sync history and errors
CREATE TABLE public.calendar_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  external_event_id TEXT,
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('to_calendar', 'from_calendar')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  error_message TEXT,
  sync_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Calendar sync preferences for user settings
CREATE TABLE public.calendar_sync_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  auto_sync BOOLEAN NOT NULL DEFAULT true,
  sync_frequency INTEGER NOT NULL DEFAULT 15, -- minutes
  sync_event_types TEXT[],
  sync_event_statuses TEXT[],
  include_form_data BOOLEAN NOT NULL DEFAULT true,
  description_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY "calendar_integrations_tenant_isolation" 
ON public.calendar_integrations 
FOR ALL 
USING (tenant_id = get_current_tenant_id());

CREATE POLICY "calendar_field_mappings_tenant_isolation" 
ON public.calendar_field_mappings 
FOR ALL 
USING (tenant_id = get_current_tenant_id());

CREATE POLICY "calendar_sync_logs_tenant_isolation" 
ON public.calendar_sync_logs 
FOR ALL 
USING (tenant_id = get_current_tenant_id());

CREATE POLICY "calendar_sync_preferences_tenant_isolation" 
ON public.calendar_sync_preferences 
FOR ALL 
USING (tenant_id = get_current_tenant_id());

-- Indexes for performance
CREATE INDEX idx_calendar_integrations_tenant_user ON calendar_integrations(tenant_id, user_id);
CREATE INDEX idx_calendar_integrations_provider ON calendar_integrations(provider);
CREATE INDEX idx_calendar_field_mappings_integration ON calendar_field_mappings(integration_id);
CREATE INDEX idx_calendar_sync_logs_integration ON calendar_sync_logs(integration_id);
CREATE INDEX idx_calendar_sync_logs_event ON calendar_sync_logs(event_id);
CREATE INDEX idx_calendar_sync_preferences_integration ON calendar_sync_preferences(integration_id);

-- Triggers for updated_at
CREATE TRIGGER update_calendar_integrations_updated_at
BEFORE UPDATE ON public.calendar_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_sync_preferences_updated_at
BEFORE UPDATE ON public.calendar_sync_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to encrypt/decrypt tokens (placeholder for production security)
CREATE OR REPLACE FUNCTION public.get_decrypted_token(encrypted_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- In production, implement proper encryption/decryption
  -- For now, return as-is (tokens should be encrypted at rest)
  RETURN encrypted_token;
END;
$$;