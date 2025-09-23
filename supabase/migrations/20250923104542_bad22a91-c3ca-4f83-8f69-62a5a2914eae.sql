-- Security Fix 1: Update database functions to include explicit search_path
-- This fixes the Supabase linter warnings about search_path configuration

-- Update get_current_tenant_id function
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  tenant_uuid UUID;
  jwt_claims JSON;
BEGIN
  -- FASTEST PATH: Get from JWT app_metadata (no DB hit)
  BEGIN
    -- Extract JWT claims once
    jwt_claims := current_setting('request.jwt.claims', true)::json;
    
    -- Try app_metadata first (set during registration)
    tenant_uuid := (jwt_claims->>'app_metadata')::json->>'tenant_id';
    
    IF tenant_uuid IS NOT NULL THEN
      RETURN tenant_uuid;
    END IF;
    
    -- Fallback: Try custom claims (if you set them)
    tenant_uuid := jwt_claims->>'tenant_id';
    
    IF tenant_uuid IS NOT NULL THEN
      RETURN tenant_uuid;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- JWT parsing failed, fall through to DB lookup
      NULL;
  END;
  
  -- SLOWER FALLBACK: Database lookup with RLS disabled
  -- Temporarily disable RLS for this function to avoid recursion
  PERFORM set_config('row_security', 'off', true);
  
  SELECT u.tenant_id INTO tenant_uuid 
  FROM users u 
  WHERE u.id = auth.uid() 
  AND u.active = true
  LIMIT 1;
  
  -- Re-enable RLS
  PERFORM set_config('row_security', 'on', true);
  
  RETURN tenant_uuid;
EXCEPTION
  WHEN OTHERS THEN
    -- Always re-enable RLS even on error
    PERFORM set_config('row_security', 'on', true);
    RETURN NULL;
END;
$function$;

-- Update audit_security_event_smart function
CREATE OR REPLACE FUNCTION public.audit_security_event_smart(p_event_type text, p_description text, p_metadata jsonb DEFAULT '{}'::jsonb, p_risk_level text DEFAULT 'low'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_tenant_id UUID;
  recent_events_count INTEGER;
BEGIN
  current_tenant_id := get_current_tenant_id();
  
  IF current_tenant_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check for event flooding (more than 5 similar events in last 10 minutes - reduced frequency)
  SELECT COUNT(*) INTO recent_events_count
  FROM activity_logs 
  WHERE tenant_id = current_tenant_id 
    AND action = p_event_type
    AND created_at > NOW() - INTERVAL '10 minutes'
    AND security_event = true;
  
  -- Only log if not flooding or if high/critical risk
  IF recent_events_count < 5 OR p_risk_level IN ('high', 'critical') THEN
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
  END IF;
  
  -- Always raise notice for critical events
  IF p_risk_level = 'critical' THEN
    RAISE NOTICE 'CRITICAL security event: % - %', p_event_type, p_description;
  END IF;
END;
$function$;

-- Update cleanup_old_security_events function
CREATE OR REPLACE FUNCTION public.cleanup_old_security_events()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Delete low-risk security events older than 7 days (reduced from 30 days)
  DELETE FROM activity_logs 
  WHERE security_event = true 
    AND risk_level = 'low' 
    AND created_at < NOW() - INTERVAL '7 days';
    
  -- Delete medium-risk security events older than 30 days (reduced from 90 days)
  DELETE FROM activity_logs 
  WHERE security_event = true 
    AND risk_level = 'medium' 
    AND created_at < NOW() - INTERVAL '30 days';
    
  -- Keep high and critical events for 180 days (reduced from 1 year)
  DELETE FROM activity_logs 
  WHERE security_event = true 
    AND risk_level IN ('high', 'critical')
    AND created_at < NOW() - INTERVAL '180 days';
END;
$function$;

-- Update schedule_security_cleanup function
CREATE OR REPLACE FUNCTION public.schedule_security_cleanup()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Clean up old security events
  PERFORM cleanup_old_security_events();
  
  -- Also clean up inactive security sessions older than 7 days (reduced from 30 days)
  DELETE FROM security_sessions 
  WHERE is_active = false 
    AND logout_at < NOW() - INTERVAL '7 days';
END;
$function$;

-- Security Fix 2: Add token encryption functions for calendar integrations
-- Note: This uses simple base64 encoding as a placeholder - in production, use proper encryption

-- Function to encrypt tokens (placeholder implementation)
CREATE OR REPLACE FUNCTION public.encrypt_token(plain_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Simple base64 encoding as placeholder for proper encryption
  -- In production, implement proper encryption with keys from vault
  RETURN encode(plain_token::bytea, 'base64');
END;
$function$;

-- Function to decrypt tokens (placeholder implementation)
CREATE OR REPLACE FUNCTION public.get_decrypted_token(encrypted_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Simple base64 decoding as placeholder for proper decryption
  -- In production, implement proper decryption with keys from vault
  BEGIN
    RETURN convert_from(decode(encrypted_token, 'base64'), 'UTF8');
  EXCEPTION
    WHEN OTHERS THEN
      -- If decryption fails, return original (backwards compatibility)
      RETURN encrypted_token;
  END;
END;
$function$;

-- Security Fix 3: Update validate_trial_status function
CREATE OR REPLACE FUNCTION public.validate_trial_status(p_tenant_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  tenant_record RECORD;
  result JSON;
BEGIN
  SELECT subscription_status, trial_ends_at, trial_used, active
  INTO tenant_record
  FROM tenants
  WHERE id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'reason', 'tenant_not_found',
      'expired', true
    );
  END IF;
  
  IF NOT tenant_record.active THEN
    RETURN json_build_object(
      'valid', false,
      'reason', 'tenant_deactivated',
      'expired', true
    );
  END IF;
  
  CASE tenant_record.subscription_status
    WHEN 'active' THEN
      result := json_build_object(
        'valid', true,
        'reason', 'active_subscription',
        'expired', false
      );
    WHEN 'trial', 'trialing' THEN
      IF tenant_record.trial_ends_at > NOW() THEN
        result := json_build_object(
          'valid', true,
          'reason', 'trial_active',
          'expired', false,
          'days_remaining', EXTRACT(DAY FROM (tenant_record.trial_ends_at - NOW()))
        );
      ELSE
        UPDATE tenants 
        SET subscription_status = 'expired', updated_at = NOW()
        WHERE id = p_tenant_id;
        
        result := json_build_object(
          'valid', false,
          'reason', 'trial_expired',
          'expired', true
        );
      END IF;
    ELSE
      result := json_build_object(
        'valid', false,
        'reason', 'subscription_inactive',
        'expired', true
      );
  END CASE;
  
  -- Only log high-risk security events to prevent spam (reduced logging)
  IF (result->>'valid')::boolean = false AND (result->>'reason') IN ('tenant_deactivated', 'subscription_inactive') THEN
    PERFORM audit_security_event_smart(
      'access_denied',
      'Access denied: ' || (result->>'reason'),
      json_build_object('subscription_status', tenant_record.subscription_status)::jsonb,
      'high'
    );
  END IF;
  
  RETURN result;
END;
$function$;