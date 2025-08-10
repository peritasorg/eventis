-- Fix security warnings by setting search_path for functions

-- Update the calculate_parent_event_totals function with proper search_path
CREATE OR REPLACE FUNCTION calculate_parent_event_totals()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  parent_id UUID;
  total_amount_sum NUMERIC := 0;
  total_guests_sum INTEGER := 0;
  form_total_sum NUMERIC := 0;
BEGIN
  -- Get parent_event_id from NEW or OLD record
  IF TG_OP = 'DELETE' THEN
    parent_id := OLD.parent_event_id;
  ELSE
    parent_id := NEW.parent_event_id;
  END IF;
  
  -- Only process if this is a sub-event
  IF parent_id IS NOT NULL THEN
    -- Calculate totals from all sub-events
    SELECT 
      COALESCE(SUM(total_amount), 0),
      COALESCE(SUM(estimated_guests), 0),
      COALESCE(SUM(form_total), 0)
    INTO total_amount_sum, total_guests_sum, form_total_sum
    FROM events 
    WHERE parent_event_id = parent_id AND is_sub_event = true;
    
    -- Update parent event with aggregated totals
    UPDATE events 
    SET 
      total_amount = total_amount_sum,
      estimated_guests = total_guests_sum,
      form_total = form_total_sum,
      updated_at = NOW()
    WHERE id = parent_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update the get_event_with_sessions function with proper search_path
CREATE OR REPLACE FUNCTION get_event_with_sessions(p_event_id uuid)
RETURNS TABLE(
  event_id uuid,
  event_name text,
  is_parent boolean,
  is_session boolean,
  session_type varchar(50),
  session_order integer,
  parent_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE event_tree AS (
    -- Start with the requested event
    SELECT 
      e.id as event_id,
      e.event_name,
      (e.parent_event_id IS NULL AND EXISTS(SELECT 1 FROM events WHERE parent_event_id = e.id)) as is_parent,
      e.is_sub_event as is_session,
      e.session_type,
      e.session_order,
      e.parent_event_id as parent_id
    FROM events e 
    WHERE e.id = p_event_id
    
    UNION ALL
    
    -- Get all children (sessions) of parent events
    SELECT 
      e.id as event_id,
      e.event_name,
      false as is_parent,
      e.is_sub_event as is_session,
      e.session_type,
      e.session_order,
      e.parent_event_id as parent_id
    FROM events e
    INNER JOIN event_tree et ON e.parent_event_id = et.event_id
    
    UNION ALL
    
    -- Get parent if we started with a session
    SELECT 
      e.id as event_id,
      e.event_name,
      (EXISTS(SELECT 1 FROM events WHERE parent_event_id = e.id)) as is_parent,
      e.is_sub_event as is_session,
      e.session_type,
      e.session_order,
      e.parent_event_id as parent_id
    FROM events e
    INNER JOIN event_tree et ON et.parent_id = e.id
    WHERE et.parent_id IS NOT NULL
  )
  SELECT * FROM event_tree ORDER BY session_order;
END;
$$;