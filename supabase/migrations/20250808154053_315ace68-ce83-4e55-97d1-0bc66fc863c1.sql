-- Fix ambiguous column reference by updating the update_event_totals_from_forms function
CREATE OR REPLACE FUNCTION public.update_event_totals_from_forms()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  total_form_amount DECIMAL(10,2);
  p_event_id UUID;
BEGIN
  -- Get event_id from NEW or OLD record
  IF TG_OP = 'DELETE' THEN
    p_event_id := OLD.event_id;
  ELSE
    p_event_id := NEW.event_id;
  END IF;
  
  -- Calculate total from all active event forms
  SELECT COALESCE(SUM(ef.form_total), 0) INTO total_form_amount
  FROM event_forms ef
  WHERE ef.event_id = p_event_id AND ef.is_active = true;
  
  -- Update the event's form_total and total_amount with explicit table reference
  UPDATE events e
  SET 
    form_total = total_form_amount,
    total_amount = COALESCE(e.total_guest_price, 0) + total_form_amount,
    updated_at = NOW()
  WHERE e.id = p_event_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

-- Fix ambiguous column reference in update_event_payment_status function  
CREATE OR REPLACE FUNCTION public.update_event_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  p_event_id UUID;
  total_paid NUMERIC;
  total_amount NUMERIC;
BEGIN
  -- Get event_id from either table
  IF TG_TABLE_NAME = 'events' THEN
    p_event_id := COALESCE(NEW.id, OLD.id);
  ELSE
    p_event_id := COALESCE(NEW.event_id, OLD.event_id);
  END IF;
  
  -- Calculate totals
  total_paid := calculate_total_paid(p_event_id);
  
  SELECT COALESCE(e.total_amount, 0) INTO total_amount
  FROM events e WHERE e.id = p_event_id;
  
  -- Update payment status with explicit table reference
  UPDATE events e SET
    deposit_paid = (total_paid >= COALESCE(e.deposit_amount, 0)),
    balance_cleared = (total_paid >= e.total_amount),
    balance_due = e.total_amount - total_paid,
    updated_at = NOW()
  WHERE e.id = p_event_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;