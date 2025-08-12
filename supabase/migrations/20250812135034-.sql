-- Add columns to event_forms table for multi-form event workflow
ALTER TABLE event_forms 
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME,
ADD COLUMN guest_count INTEGER DEFAULT 0,
ADD COLUMN guest_price_total NUMERIC(10,2) DEFAULT 0,
ADD COLUMN form_order INTEGER DEFAULT 1;

-- Update existing event_forms to have form_order
UPDATE event_forms SET form_order = tab_order WHERE form_order IS NULL;

-- Create a trigger function to limit max 2 forms per event
CREATE OR REPLACE FUNCTION validate_max_forms_per_event()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM event_forms 
      WHERE event_id = NEW.event_id 
      AND is_active = true 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) >= 2 THEN
    RAISE EXCEPTION 'Maximum of 2 forms allowed per event';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce max forms constraint
CREATE TRIGGER max_forms_per_event_trigger
  BEFORE INSERT OR UPDATE ON event_forms
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION validate_max_forms_per_event();