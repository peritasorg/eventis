-- Fix security warnings by adding search_path to functions
CREATE OR REPLACE FUNCTION public.calculate_event_form_total(p_event_form_id UUID)
RETURNS NUMERIC 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_event_totals_from_forms()
RETURNS TRIGGER 
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
  
  -- Update the event's form_total
  UPDATE events 
  SET 
    form_total = total_form_amount,
    updated_at = NOW()
  WHERE id = p_event_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.migrate_existing_single_forms()
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_record RECORD;
  migrated_count INTEGER := 0;
BEGIN
  -- Only migrate events that have form_template_used AND the template still exists
  FOR event_record IN 
    SELECT e.id, e.tenant_id, e.form_template_used, e.form_responses, e.form_total
    FROM events e
    INNER JOIN form_templates ft ON e.form_template_used = ft.id
    WHERE e.form_template_used IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM event_forms WHERE event_id = e.id
    )
  LOOP
    -- Create event_form entry for existing form
    INSERT INTO event_forms (
      tenant_id,
      event_id,
      form_template_id,
      form_label,
      tab_order,
      form_responses,
      form_total,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      event_record.tenant_id,
      event_record.id,
      event_record.form_template_used,
      'Main Form',
      1,
      COALESCE(event_record.form_responses, '{}'),
      COALESCE(event_record.form_total, 0),
      true,
      NOW(),
      NOW()
    );
    
    migrated_count := migrated_count + 1;
  END LOOP;
  
  -- Clean up orphaned form_template_used references
  UPDATE events 
  SET form_template_used = NULL 
  WHERE form_template_used IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM form_templates WHERE id = events.form_template_used
  );
  
  RETURN migrated_count;
END;
$$;