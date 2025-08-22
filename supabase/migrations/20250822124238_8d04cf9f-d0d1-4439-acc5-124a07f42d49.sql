-- Security Enhancement: Fix more critical functions needing search path protection

CREATE OR REPLACE FUNCTION public.validate_field_pricing_config()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure unit_price is set if pricing_behavior requires it
  IF NEW.pricing_behavior IN ('fixed', 'per_person', 'quantity_based') AND NEW.unit_price IS NULL THEN
    NEW.unit_price := 0;
  END IF;
  
  -- Ensure quantity fields are logical
  IF NEW.min_quantity IS NOT NULL AND NEW.max_quantity IS NOT NULL AND NEW.min_quantity > NEW.max_quantity THEN
    RAISE EXCEPTION 'min_quantity cannot be greater than max_quantity';
  END IF;
  
  -- Set affects_pricing based on pricing_behavior
  NEW.affects_pricing := (NEW.pricing_behavior != 'none');
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_unique_form_template()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only check for active forms
  IF NEW.is_active = true THEN
    IF EXISTS (
      SELECT 1 FROM event_forms 
      WHERE event_id = NEW.event_id 
        AND form_template_id = NEW.form_template_id 
        AND tenant_id = NEW.tenant_id
        AND is_active = true
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'This form template is already used in this event. Each event can only have one instance of each form template.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_max_forms_per_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT COUNT(*) FROM event_forms 
      WHERE event_id = NEW.event_id 
      AND is_active = true 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) >= 2 THEN
    RAISE EXCEPTION 'Maximum of 2 forms allowed per event';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_event_total_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Calculate total_amount as sum of total_guest_price and form_total
    NEW.total_amount = COALESCE(NEW.total_guest_price, 0) + COALESCE(NEW.form_total, 0);
    RETURN NEW;
END;
$function$;