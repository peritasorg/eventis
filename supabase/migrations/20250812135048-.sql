-- Fix security issue by setting search_path for the validation function
CREATE OR REPLACE FUNCTION validate_max_forms_per_event()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM event_forms 
      WHERE event_id = NEW.event_id 
      AND is_active = true 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) >= 2 THEN
    RAISE EXCEPTION 'Maximum of 2 forms allowed per event';
  END IF;
  RETURN NEW;
END;
$$;