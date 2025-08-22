-- Security Enhancement: Fix final batch of database functions needing search path protection

CREATE OR REPLACE FUNCTION public.email_has_used_trial(email_address text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenants 
        WHERE contact_email = email_address 
        AND trial_used = true
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_registration_email(email_address text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    email_exists BOOLEAN;
    result JSON;
BEGIN
    -- Check if email already used trial
    SELECT email_has_used_trial(email_address) INTO email_exists;
    
    IF email_exists THEN
        result := json_build_object(
            'allowed', false,
            'reason', 'trial_already_used',
            'message', 'This email has already been used for a free trial. Please contact support or use a different email.'
        );
    ELSE
        result := json_build_object(
            'allowed', true,
            'reason', 'new_email',
            'message', 'Email is eligible for 14-day free trial'
        );
    END IF;
    
    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_subscription_limit(p_tenant_id uuid, p_limit_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    tenant_plan RECORD;
    current_usage INTEGER;
    limit_value INTEGER;
BEGIN
    SELECT sp.* INTO tenant_plan
    FROM subscription_plans sp
    JOIN tenants t ON sp.id = t.subscription_plan_id
    WHERE t.id = p_tenant_id;
    
    CASE p_limit_type
        WHEN 'staff' THEN
            SELECT COUNT(*) INTO current_usage FROM staff WHERE tenant_id = p_tenant_id AND active = true;
            limit_value := tenant_plan.max_staff;
        WHEN 'events_monthly' THEN
            SELECT COUNT(*) INTO current_usage 
            FROM events 
            WHERE tenant_id = p_tenant_id 
            AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);
            limit_value := tenant_plan.max_events_per_month;
        WHEN 'form_fields' THEN
            SELECT COUNT(*) INTO current_usage FROM field_library WHERE tenant_id = p_tenant_id AND active = true;
            limit_value := tenant_plan.max_form_fields;
    END CASE;
    
    RETURN (limit_value = -1 OR current_usage < limit_value);
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_event_pricing(p_tenant_id uuid, p_form_responses jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    total_price DECIMAL := 0;
    field_record RECORD;
    response_value TEXT;
    numeric_value DECIMAL;
BEGIN
    FOR field_record IN 
        SELECT fl.*, fri.field_library_id
        FROM field_library fl
        JOIN form_field_instances fri ON fl.id = fri.field_library_id
        WHERE fl.tenant_id = p_tenant_id 
        AND fl.affects_pricing = true
    LOOP
        response_value := p_form_responses ->> field_record.id::text;
        
        IF response_value IS NOT NULL AND response_value != '' THEN
            CASE field_record.pricing_type
                WHEN 'fixed' THEN
                    total_price := total_price + field_record.price_modifier;
                WHEN 'per_guest' THEN
                    numeric_value := response_value::DECIMAL;
                    total_price := total_price + (numeric_value * field_record.price_modifier);
                WHEN 'percentage' THEN
                    numeric_value := response_value::DECIMAL;
                    total_price := total_price + (total_price * (field_record.price_modifier / 100));
            END CASE;
        END IF;
    END LOOP;
    
    RETURN total_price;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_new_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_tenant_id', true)::UUID,
        (auth.jwt() ->> 'tenant_id')::UUID,
        get_current_tenant_id()
    );
END;
$function$;