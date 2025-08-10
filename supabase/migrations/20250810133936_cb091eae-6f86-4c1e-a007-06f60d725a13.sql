-- Fix remaining security linter issues

-- 1. Fix remaining functions without proper search_path
CREATE OR REPLACE FUNCTION public.audit_security_event(p_event_type text, p_description text, p_metadata jsonb DEFAULT '{}'::jsonb, p_risk_level text DEFAULT 'low'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_tenant_id UUID;
BEGIN
  current_tenant_id := get_current_tenant_id();
  
  IF current_tenant_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Use the smart audit function to prevent flooding
  PERFORM audit_security_event_smart(p_event_type, p_description, p_metadata, p_risk_level);
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- 2. Add index for security performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_security_events 
ON activity_logs(tenant_id, security_event, risk_level, created_at) 
WHERE security_event = true;

CREATE INDEX IF NOT EXISTS idx_activity_logs_recent_events 
ON activity_logs(tenant_id, action, created_at) 
WHERE security_event = true AND created_at > (NOW() - INTERVAL '1 hour');

-- 3. Create automatic security cleanup schedule (to be run periodically)
CREATE OR REPLACE FUNCTION public.schedule_security_cleanup()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- This would ideally be called by a scheduled job
  PERFORM cleanup_old_security_events();
  
  -- Also clean up inactive security sessions older than 30 days
  DELETE FROM security_sessions 
  WHERE is_active = false 
    AND logout_at < NOW() - INTERVAL '30 days';
END;
$function$;