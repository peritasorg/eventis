-- Fix Security Definer Functions - Remove SECURITY DEFINER where not needed
-- Keep SECURITY DEFINER only for functions that specifically need to bypass RLS

-- Functions that should keep SECURITY DEFINER (authentication, system functions):
-- - get_current_tenant_id() - needs to bypass RLS to get tenant info
-- - audit_security_event() - needs to bypass RLS for security logging
-- - audit_security_event_smart() - needs to bypass RLS for security logging
-- - handle_new_user() - needs to bypass RLS during user creation
-- - log_security_event() - needs to bypass RLS for security logging
-- - validate_trial_status() - needs to check trial status across tenants
-- - check_subscription_access() - needs to check subscription across tenants
-- - get_current_user_tenant_id() - needs to bypass RLS for tenant lookup
-- - is_super_admin() - needs to check admin status
-- - cleanup_old_security_events() - needs elevated access for cleanup

-- Remove SECURITY DEFINER from calculation functions that should respect RLS
CREATE OR REPLACE FUNCTION public.calculate_event_form_total(p_event_form_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  total DECIMAL(10,2) := 0;
  responses JSONB;
  field_data JSONB;
BEGIN
  SELECT form_responses INTO responses
  FROM event_forms
  WHERE id = p_event_form_id;
  
  IF responses IS NULL THEN
    RETURN 0;
  END IF;
  
  FOR field_data IN SELECT value FROM jsonb_each(responses)
  LOOP
    IF (field_data->>'enabled')::boolean = true 
       AND field_data->>'price' IS NOT NULL THEN
      total := total + (field_data->>'price')::decimal;
    END IF;
  END LOOP;
  
  RETURN total;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_form_total(event_uuid uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  total DECIMAL(10,2) := 0;
  responses JSONB;
  field_data JSONB;
  field_value JSONB;
BEGIN
  SELECT form_responses INTO responses
  FROM events
  WHERE id = event_uuid;
  
  IF responses IS NULL THEN
    RETURN 0;
  END IF;
  
  FOR field_data IN SELECT value FROM jsonb_each(responses)
  LOOP
    IF (field_data->>'enabled')::boolean = true 
       AND field_data->>'price' IS NOT NULL THEN
      total := total + (field_data->>'price')::decimal;
    END IF;
  END LOOP;
  
  RETURN total;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_total_paid(p_event_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  deposit_amt NUMERIC := 0;
  timeline_total NUMERIC := 0;
BEGIN
  -- Get deposit amount
  SELECT COALESCE(deposit_amount, 0) INTO deposit_amt
  FROM events
  WHERE id = p_event_id;
  
  -- Get finance timeline total
  SELECT COALESCE(SUM(amount), 0) INTO timeline_total
  FROM finance_timeline
  WHERE event_id = p_event_id;
  
  RETURN deposit_amt + timeline_total;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_next_tab_order(p_event_id uuid, p_tenant_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  next_order INTEGER;
BEGIN
  -- Get the maximum tab_order for this event for ACTIVE forms only, defaulting to 0 if no forms exist
  SELECT COALESCE(MAX(tab_order), 0) + 1 INTO next_order
  FROM event_forms
  WHERE event_id = p_event_id 
  AND tenant_id = p_tenant_id 
  AND is_active = true;
  
  RETURN next_order;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_event_with_sessions(p_event_id uuid)
 RETURNS TABLE(event_id uuid, event_name text, is_parent boolean, is_session boolean, session_type character varying, session_order integer, parent_id uuid)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH RECURSIVE event_tree AS (
    -- Start with the requested event
    SELECT 
      e.id as event_id,
      e.event_name,
      (e.parent_event_id IS NULL AND EXISTS(SELECT 1 FROM events WHERE parent_event_id = e.id)) as is_parent,
      e.is_sub_event as is_session,
      e.session_type,
      e.session_order,
      e.parent_event_id as parent_id
    FROM events e 
    WHERE e.id = p_event_id
    
    UNION ALL
    
    -- Get all children (sessions) of parent events
    SELECT 
      e.id as event_id,
      e.event_name,
      false as is_parent,
      e.is_sub_event as is_session,
      e.session_type,
      e.session_order,
      e.parent_event_id as parent_id
    FROM events e
    INNER JOIN event_tree et ON e.parent_event_id = et.event_id
    
    UNION ALL
    
    -- Get parent if we started with a session
    SELECT 
      e.id as event_id,
      e.event_name,
      (EXISTS(SELECT 1 FROM events WHERE parent_event_id = e.id)) as is_parent,
      e.is_sub_event as is_session,
      e.session_type,
      e.session_order,
      e.parent_event_id as parent_id
    FROM events e
    INNER JOIN event_tree et ON et.parent_id = e.id
    WHERE et.parent_id IS NOT NULL
  )
  SELECT * FROM event_tree ORDER BY session_order;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_guest_section(p_form_template_id uuid, p_tenant_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  section_id UUID;
  guest_name_field UUID;
  guest_email_field UUID;
  guest_phone_field UUID;
  guest_count_field UUID;
BEGIN
  -- Create Guest Information section
  INSERT INTO form_sections (
    form_template_id,
    tenant_id,
    section_title,
    section_description,
    section_order
  ) VALUES (
    p_form_template_id,
    p_tenant_id,
    'Guest Information',
    'Basic information about the event host and guest details',
    1
  ) RETURNING id INTO section_id;
  
  -- Add default guest information fields to field_library if they don't exist
  INSERT INTO field_library (tenant_id, name, label, field_type, category, required, sort_order) VALUES
  (p_tenant_id, 'guest_name', 'Primary Contact Name', 'text', 'guest_info', true, 1),
  (p_tenant_id, 'guest_email', 'Email Address', 'email', 'guest_info', true, 2),
  (p_tenant_id, 'guest_phone', 'Phone Number', 'phone', 'guest_info', true, 3),
  (p_tenant_id, 'guest_count', 'Number of Guests', 'number', 'guest_info', true, 4)
  ON CONFLICT (tenant_id, name) DO NOTHING;
  
  -- Get field IDs and add them to the section
  SELECT id INTO guest_name_field FROM field_library WHERE tenant_id = p_tenant_id AND name = 'guest_name';
  SELECT id INTO guest_email_field FROM field_library WHERE tenant_id = p_tenant_id AND name = 'guest_email';
  SELECT id INTO guest_phone_field FROM field_library WHERE tenant_id = p_tenant_id AND name = 'guest_phone';
  SELECT id INTO guest_count_field FROM field_library WHERE tenant_id = p_tenant_id AND name = 'guest_count';
  
  -- Add field instances to the section
  INSERT INTO form_field_instances (tenant_id, form_template_id, section_id, field_library_id, field_order) VALUES
  (p_tenant_id, p_form_template_id, section_id, guest_name_field, 1),
  (p_tenant_id, p_form_template_id, section_id, guest_email_field, 2),
  (p_tenant_id, p_form_template_id, section_id, guest_phone_field, 3),
  (p_tenant_id, p_form_template_id, section_id, guest_count_field, 4);
  
  RETURN section_id;
END;
$function$;