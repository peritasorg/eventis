-- Security Enhancement: Fix the final database functions needing search path protection

CREATE OR REPLACE FUNCTION public.update_customer_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE customers 
        SET 
            total_events = (SELECT COUNT(*) FROM events WHERE customer_id = NEW.customer_id AND total_amount > 0),
            total_spent = (SELECT COALESCE(SUM(total_amount), 0) FROM events WHERE customer_id = NEW.customer_id AND total_amount > 0),
            last_event_date = (SELECT MAX(event_start_date) FROM events WHERE customer_id = NEW.customer_id AND total_amount > 0)
        WHERE id = NEW.customer_id;
        
        -- Update average event value
        UPDATE customers 
        SET average_event_value = CASE 
            WHEN total_events > 0 THEN total_spent / total_events 
            ELSE 0 
        END
        WHERE id = NEW.customer_id;
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE customers 
        SET 
            total_events = (SELECT COUNT(*) FROM events WHERE customer_id = OLD.customer_id AND total_amount > 0),
            total_spent = (SELECT COALESCE(SUM(total_amount), 0) FROM events WHERE customer_id = OLD.customer_id AND total_amount > 0),
            last_event_date = (SELECT MAX(event_start_date) FROM events WHERE customer_id = OLD.customer_id AND total_amount > 0)
        WHERE id = OLD.customer_id;
        
        UPDATE customers 
        SET average_event_value = CASE 
            WHEN total_events > 0 THEN total_spent / total_events 
            ELSE 0 
        END
        WHERE id = OLD.customer_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_event_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
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