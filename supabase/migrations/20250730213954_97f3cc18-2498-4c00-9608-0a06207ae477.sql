-- Security Fix: Remove SECURITY DEFINER from remaining views and fix function search paths
-- This addresses the remaining critical security vulnerabilities

-- Drop and recreate any remaining SECURITY DEFINER views
DROP VIEW IF EXISTS public.event_summary CASCADE;
DROP VIEW IF EXISTS public.lead_pipeline CASCADE;
DROP VIEW IF EXISTS public.monthly_revenue CASCADE;

-- Recreate views as normal views (without SECURITY DEFINER)
CREATE VIEW public.event_summary AS
SELECT 
    e.id,
    e.event_name,
    e.event_type,
    e.event_start_date as event_date,
    e.start_time,
    e.end_time,
    e.status,
    e.total_amount,
    e.tenant_id,
    c.name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone,
    (SELECT COUNT(*) FROM event_staff_assignments esa WHERE esa.event_id = e.id) as staff_assigned
FROM events e
LEFT JOIN customers c ON e.customer_id = c.id;

CREATE VIEW public.lead_pipeline AS
SELECT 
    l.tenant_id,
    l.status,
    COUNT(*) as lead_count,
    AVG(l.estimated_budget) as avg_budget,
    SUM(l.estimated_budget) as total_potential
FROM leads l
GROUP BY l.tenant_id, l.status;

CREATE VIEW public.monthly_revenue AS
SELECT 
    e.tenant_id,
    DATE_TRUNC('month', e.event_start_date) as revenue_month,
    SUM(e.total_amount) as total_revenue,
    COUNT(*) as events_count,
    AVG(e.total_amount) as avg_event_value
FROM events e
WHERE e.total_amount > 0
GROUP BY e.tenant_id, DATE_TRUNC('month', e.event_start_date);

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

-- Update any remaining auth-related functions
CREATE OR REPLACE FUNCTION auth.uid() 
RETURNS uuid 
LANGUAGE sql 
STABLE
SET search_path TO ''
AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
$$;

CREATE OR REPLACE FUNCTION auth.email() 
RETURNS text 
LANGUAGE sql 
STABLE
SET search_path TO ''
AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim.email', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
    )
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