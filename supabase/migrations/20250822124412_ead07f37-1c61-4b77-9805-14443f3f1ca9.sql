-- Security Enhancement: Final attempt to fix remaining function search path issues

CREATE OR REPLACE FUNCTION public.calculate_total_paid(p_event_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.calculate_event_form_total(p_event_form_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_next_tab_order(p_event_id uuid, p_tenant_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.validate_form_input(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  input_text := regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi');
  input_text := regexp_replace(input_text, '<iframe[^>]*>.*?</iframe>', '', 'gi');
  input_text := regexp_replace(input_text, 'javascript:', '', 'gi');
  input_text := regexp_replace(input_text, 'on[a-z]+\s*=', '', 'gi');
  
  IF length(input_text) > 10000 THEN
    input_text := left(input_text, 10000);
  END IF;
  
  RETURN trim(input_text);
END;
$function$;