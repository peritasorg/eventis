-- Create trigger to auto-update form_total_gbp in events table when event_forms change
CREATE OR REPLACE FUNCTION update_event_form_total_in_events()
RETURNS TRIGGER AS $$
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
  
  -- Update the events table form_total_gbp
  UPDATE events
  SET 
    form_total_gbp = total_form_amount,
    updated_at = NOW()
  WHERE id = p_event_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event_forms table
CREATE TRIGGER trigger_update_event_form_total
  AFTER INSERT OR UPDATE OR DELETE
  ON event_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_event_form_total_in_events();