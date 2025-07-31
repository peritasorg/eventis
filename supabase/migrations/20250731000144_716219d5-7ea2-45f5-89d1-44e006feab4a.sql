-- Security Fix: Fix remaining function search paths in public schema only
-- This addresses critical security vulnerabilities without touching auth schema

-- Fix remaining functions without search_path set
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tenant_uuid UUID;
BEGIN
  SELECT u.tenant_id INTO tenant_uuid 
  FROM users u 
  WHERE u.id = auth.uid() 
  AND u.active = true
  LIMIT 1;
  
  RETURN tenant_uuid;
END;
$$;

-- Create comprehensive security audit function
CREATE OR REPLACE FUNCTION public.audit_security_event(
  p_event_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_risk_level TEXT DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_tenant_id UUID;
BEGIN
  -- Get current tenant
  current_tenant_id := get_current_tenant_id();
  
  IF current_tenant_id IS NULL THEN
    RETURN; -- Skip if no tenant context
  END IF;
  
  -- Log the security event
  INSERT INTO activity_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    description,
    metadata,
    security_event,
    risk_level,
    created_at
  ) VALUES (
    current_tenant_id,
    auth.uid(),
    p_event_type,
    'security',
    p_description,
    p_metadata,
    true,
    p_risk_level,
    NOW()
  );
  
  -- Auto-alert on high-risk events
  IF p_risk_level IN ('high', 'critical') THEN
    -- Could trigger notifications here in future
    RAISE NOTICE 'High-risk security event: % - %', p_event_type, p_description;
  END IF;
END;
$$;

-- Fix remaining functions that need search_path protection
CREATE OR REPLACE FUNCTION public.is_current_user(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN user_uuid = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.check_usage_limits(tenant_uuid uuid, limit_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    tenant_record RECORD;
    current_usage INTEGER;
    usage_limit INTEGER;
BEGIN
    -- Get tenant and plan limits
    SELECT t.*, sp.max_leads, sp.max_events, sp.max_staff, sp.max_storage_gb
    INTO tenant_record
    FROM tenants t
    LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
    WHERE t.id = tenant_uuid;
    
    -- Check current usage vs limits
    CASE limit_type
        WHEN 'leads' THEN
            SELECT COUNT(*) INTO current_usage FROM leads WHERE tenant_id = tenant_uuid;
            usage_limit := tenant_record.max_leads;
        WHEN 'events' THEN
            SELECT COUNT(*) INTO current_usage FROM events WHERE tenant_id = tenant_uuid;
            usage_limit := tenant_record.max_events;
        WHEN 'staff' THEN
            SELECT COUNT(*) INTO current_usage FROM staff WHERE tenant_id = tenant_uuid;
            usage_limit := tenant_record.max_staff;
        ELSE
            RETURN TRUE; -- Unknown limit type, allow
    END CASE;
    
    -- -1 means unlimited
    IF usage_limit = -1 THEN
        RETURN TRUE;
    END IF;
    
    RETURN current_usage < usage_limit;
END;
$$;