-- Fix event forms tab order calculation and total calculations
-- First, create a function to safely get next tab order
CREATE OR REPLACE FUNCTION get_next_tab_order(p_event_id UUID, p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_order INTEGER;
BEGIN
  -- Get the maximum tab_order for this event, defaulting to 0 if no forms exist
  SELECT COALESCE(MAX(tab_order), 0) + 1 INTO next_order
  FROM event_forms
  WHERE event_id = p_event_id 
  AND tenant_id = p_tenant_id 
  AND is_active = true;
  
  RETURN next_order;
END;
$$;

-- Update the existing event totals trigger to be more robust
DROP TRIGGER IF EXISTS update_event_totals_trigger ON event_forms;

CREATE OR REPLACE FUNCTION update_event_totals_from_forms()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
  SELECT COALESCE(SUM(form_total), 0) INTO total_form_amount
  FROM event_forms 
  WHERE event_id = p_event_id AND is_active = true;
  
  -- Update the event's form_total and total_amount
  UPDATE events 
  SET 
    form_total = total_form_amount,
    total_amount = COALESCE(total_guest_price, 0) + total_form_amount,
    updated_at = NOW()
  WHERE id = p_event_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for event forms changes
CREATE TRIGGER update_event_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON event_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_event_totals_from_forms();

-- Fix any existing data inconsistencies
DO $$
DECLARE
  event_record RECORD;
  calculated_form_total DECIMAL(10,2);
BEGIN
  -- Update all events with correct form totals
  FOR event_record IN 
    SELECT id FROM events
  LOOP
    -- Calculate correct form total
    SELECT COALESCE(SUM(form_total), 0) INTO calculated_form_total
    FROM event_forms
    WHERE event_id = event_record.id AND is_active = true;
    
    -- Update the event
    UPDATE events 
    SET 
      form_total = calculated_form_total,
      total_amount = COALESCE(total_guest_price, 0) + calculated_form_total
    WHERE id = event_record.id;
  END LOOP;
END;
$$;