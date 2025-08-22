-- Security Enhancement: Fix remaining database functions with search path protection

-- Update all remaining functions that need SET search_path TO 'public'

CREATE OR REPLACE FUNCTION public.check_subscription_access(tenant_uuid uuid, feature_name text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    tenant_record RECORD;
    plan_record RECORD;
    is_trial_valid BOOLEAN := FALSE;
BEGIN
    -- Get tenant with subscription info
    SELECT t.*, sp.name as plan_name, sp.features, sp.max_leads, sp.max_events
    INTO tenant_record
    FROM tenants t
    LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
    WHERE t.id = tenant_uuid;
    
    -- Check if tenant exists
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check trial status
    IF tenant_record.subscription_status = 'trialing' THEN
        is_trial_valid := (tenant_record.trial_ends_at > NOW());
        IF NOT is_trial_valid THEN
            -- Auto-expire trial
            UPDATE tenants 
            SET subscription_status = 'expired', updated_at = NOW()
            WHERE id = tenant_uuid;
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Check subscription status
    IF tenant_record.subscription_status NOT IN ('active', 'trialing') THEN
        RETURN FALSE;
    END IF;
    
    -- Check specific feature access if requested
    IF feature_name IS NOT NULL THEN
        IF NOT (tenant_record.features ? feature_name) THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_usage_limits(tenant_uuid uuid, limit_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.check_trial_status(tenant_uuid uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    tenant_record RECORD;
BEGIN
    SELECT subscription_status, trial_ends_at, trial_used
    INTO tenant_record
    FROM tenants
    WHERE id = tenant_uuid;
    
    -- If on trial and past expiration, auto-expire
    IF tenant_record.subscription_status = 'trial' AND 
       tenant_record.trial_ends_at < NOW() THEN
        
        UPDATE tenants 
        SET subscription_status = 'overdue', -- Use allowed status
            updated_at = NOW()
        WHERE id = tenant_uuid;
        
        RETURN 'overdue';
    END IF;
    
    RETURN tenant_record.subscription_status;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_valid_access()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    user_tenant_id UUID;
    trial_status TEXT;
BEGIN
    SELECT tenant_id INTO user_tenant_id
    FROM users
    WHERE id = auth.uid();
    
    IF user_tenant_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT check_trial_status(user_tenant_id) INTO trial_status;
    
    -- Allow access if active subscription or valid trial
    RETURN trial_status IN ('active', 'trial');
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_trial_days_remaining(tenant_uuid uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    days_left INTEGER;
BEGIN
    SELECT GREATEST(0, EXTRACT(DAY FROM (trial_ends_at - NOW()))::INTEGER)
    INTO days_left
    FROM tenants
    WHERE id = tenant_uuid
    AND subscription_status = 'trialing';
    
    RETURN COALESCE(days_left, 0);
END;
$function$;