
-- First, let's update the customer totals function to include all events with amounts, not just completed ones
CREATE OR REPLACE FUNCTION public.update_customer_totals()
 RETURNS trigger
 LANGUAGE plpgsql
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

-- Create a trigger to automatically calculate total_amount when events are updated
CREATE OR REPLACE FUNCTION calculate_event_total_amount()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Calculate total_amount as sum of total_guest_price and form_total
    NEW.total_amount = COALESCE(NEW.total_guest_price, 0) + COALESCE(NEW.form_total, 0);
    RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS calculate_total_amount_trigger ON events;
CREATE TRIGGER calculate_total_amount_trigger
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION calculate_event_total_amount();

-- Now let's fix the total_amount calculation for existing events
UPDATE events 
SET total_amount = COALESCE(total_guest_price, 0) + COALESCE(form_total, 0)
WHERE (total_amount IS NULL OR total_amount = 0) 
AND (total_guest_price > 0 OR form_total > 0);

-- Now refresh all customer totals with the corrected data
UPDATE customers 
SET 
    total_events = (
        SELECT COUNT(*) 
        FROM events 
        WHERE customer_id = customers.id 
        AND total_amount > 0
    ),
    total_spent = (
        SELECT COALESCE(SUM(total_amount), 0) 
        FROM events 
        WHERE customer_id = customers.id 
        AND total_amount > 0
    ),
    last_event_date = (
        SELECT MAX(event_start_date) 
        FROM events 
        WHERE customer_id = customers.id 
        AND total_amount > 0
    );

-- Update average event value
UPDATE customers 
SET average_event_value = CASE 
    WHEN total_events > 0 THEN total_spent / total_events 
    ELSE 0 
END;
