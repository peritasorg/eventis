-- Phase 1: Database Schema Extensions for Event Session Splitting

-- Add session splitting capabilities to event_type_configs
ALTER TABLE event_type_configs 
ADD COLUMN allow_splitting boolean DEFAULT false,
ADD COLUMN default_sessions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN split_naming_pattern text DEFAULT '{Parent} - {Session}';

-- Add hierarchical event structure to events table
ALTER TABLE events 
ADD COLUMN parent_event_id uuid REFERENCES events(id) ON DELETE CASCADE,
ADD COLUMN is_sub_event boolean DEFAULT false,
ADD COLUMN session_type varchar(50),
ADD COLUMN session_order integer DEFAULT 0;

-- Create index for better performance on parent-child relationships
CREATE INDEX idx_events_parent_id ON events(parent_event_id) WHERE parent_event_id IS NOT NULL;
CREATE INDEX idx_events_sub_event ON events(is_sub_event) WHERE is_sub_event = true;

-- Create function to calculate parent event totals from sub-events
CREATE OR REPLACE FUNCTION calculate_parent_event_totals()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create triggers to maintain parent-child totals
CREATE TRIGGER update_parent_totals_on_change
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION calculate_parent_event_totals();

-- Create function to get event hierarchy for queries
CREATE OR REPLACE FUNCTION get_event_with_sessions(p_event_id uuid)
RETURNS TABLE(
  event_id uuid,
  event_name text,
  is_parent boolean,
  is_session boolean,
  session_type varchar(50),
  session_order integer,
  parent_id uuid
) AS $$
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
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN event_type_configs.allow_splitting IS 'Enables session splitting for this event type';
COMMENT ON COLUMN event_type_configs.default_sessions IS 'Array of session templates with name, start_time, end_time';
COMMENT ON COLUMN event_type_configs.split_naming_pattern IS 'Pattern for naming sub-events, supports {Parent} and {Session} placeholders';
COMMENT ON COLUMN events.parent_event_id IS 'Reference to parent event if this is a sub-event/session';
COMMENT ON COLUMN events.is_sub_event IS 'True if this is a session within a parent event';
COMMENT ON COLUMN events.session_type IS 'Type/name of the session (e.g., Day, Night, Afternoon)';
COMMENT ON COLUMN events.session_order IS 'Order of sessions within parent event for display purposes';