-- Security Fix 1: Update database functions to use secure search paths
-- This prevents search path injection attacks

-- Update existing functions to include SET search_path = 'public'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id UUID;
  user_metadata JSONB;
  business_name TEXT;
  full_name TEXT;
  first_name TEXT;
  last_name TEXT;
  tenant_slug TEXT;
  slug_counter INTEGER := 0;
  final_slug TEXT;
BEGIN
  -- Temporarily disable RLS for this function execution
  PERFORM set_config('row_security', 'off', true);
  
  -- Get user metadata from auth.users
  user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Extract business and user information from metadata
  business_name := COALESCE(user_metadata->>'business_name', 'My Business');
  full_name := COALESCE(user_metadata->>'full_name', NEW.email);
  first_name := COALESCE(user_metadata->>'first_name', split_part(full_name, ' ', 1));
  last_name := COALESCE(user_metadata->>'last_name', 
    CASE 
      WHEN split_part(full_name, ' ', 2) = '' THEN NULL 
      ELSE split_part(full_name, ' ', 2) 
    END
  );
  
  -- Generate a unique slug
  tenant_slug := lower(regexp_replace(business_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  tenant_slug := regexp_replace(tenant_slug, '\s+', '-', 'g');
  tenant_slug := trim(both '-' from tenant_slug);
  
  -- Ensure slug is not empty
  IF tenant_slug = '' THEN
    tenant_slug := 'business-' || substr(NEW.id::text, 1, 8);
  END IF;
  
  -- Make slug unique by adding counter if needed
  final_slug := tenant_slug;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = final_slug) LOOP
    slug_counter := slug_counter + 1;
    final_slug := tenant_slug || '-' || slug_counter::text;
  END LOOP;
  
  -- Create a new tenant for this user
  INSERT INTO public.tenants (
    id,
    business_name,
    business_type,
    address_line1,
    address_line2,
    city,
    postal_code,
    country,
    contact_phone,
    contact_email,
    subscription_status,
    trial_ends_at,
    trial_starts_at,
    trial_used,
    slug,
    active,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    business_name,
    'banqueting',
    '',
    '',
    '',
    '',
    'GB',
    '',
    NEW.email,
    'trial',
    NOW() + INTERVAL '14 days',
    NOW(),
    false,
    final_slug,
    true,
    NOW(),
    NOW()
  ) RETURNING id INTO new_tenant_id;
  
  -- Create user profile linked to the tenant
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    phone,
    role,
    tenant_id,
    active,
    email_verified,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    first_name,
    last_name,
    full_name,
    '',
    'tenant_admin',
    new_tenant_id,
    true,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NOW(),
    NOW()
  );
  
  -- Re-enable RLS
  PERFORM set_config('row_security', 'on', true);
  
  -- Log the successful creation
  RAISE NOTICE 'Created tenant % and user profile for %', new_tenant_id, NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Re-enable RLS even on error
    PERFORM set_config('row_security', 'on', true);
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user for email %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Update get_current_tenant_id function to be more secure
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

-- Security Fix 2: Add input validation function for form data
CREATE OR REPLACE FUNCTION public.validate_form_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  -- Remove potentially dangerous characters and scripts
  -- This is a basic sanitization - more comprehensive validation should be done in the application layer
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove script tags and other dangerous HTML
  input_text := regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi');
  input_text := regexp_replace(input_text, '<iframe[^>]*>.*?</iframe>', '', 'gi');
  input_text := regexp_replace(input_text, 'javascript:', '', 'gi');
  input_text := regexp_replace(input_text, 'on[a-z]+\s*=', '', 'gi');
  
  -- Limit length to prevent DoS
  IF length(input_text) > 10000 THEN
    input_text := left(input_text, 10000);
  END IF;
  
  RETURN trim(input_text);
END;
$function$;

-- Security Fix 3: Add function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_tenant_id UUID,
  p_event_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_risk_level TEXT DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
    p_tenant_id,
    auth.uid(),
    p_event_type,
    'security',
    p_description,
    p_metadata,
    true,
    p_risk_level,
    NOW()
  );
END;
$function$;

-- Security Fix 4: Improve trial validation with server-side checks
CREATE OR REPLACE FUNCTION public.validate_trial_status(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Check if tenant is active
  IF NOT tenant_record.active THEN
    RETURN json_build_object(
      'valid', false,
      'reason', 'tenant_deactivated',
      'expired', true
    );
  END IF;
  
  -- Handle different subscription statuses
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
        -- Auto-expire trial
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
  
  -- Log security event for expired access attempts
  IF (result->>'valid')::boolean = false THEN
    PERFORM log_security_event(
      p_tenant_id,
      'access_denied',
      'Access denied: ' || (result->>'reason'),
      json_build_object('subscription_status', tenant_record.subscription_status),
      'medium'
    );
  END IF;
  
  RETURN result;
END;
$function$;