-- Fix calendar reconciliation with simple functions
-- Function to delete all Google Calendar events from a date
CREATE OR REPLACE FUNCTION public.clear_google_calendar_from_date(
  p_integration_id UUID,
  p_from_date DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This will be handled by the edge function calling Google Calendar API
  -- This function serves as a placeholder for logging
  INSERT INTO calendar_sync_logs (
    tenant_id,
    integration_id,
    sync_direction,
    status,
    operation,
    sync_data
  )
  SELECT 
    ci.tenant_id,
    p_integration_id,
    'cleanup',
    'initiated',
    'clear_google_calendar',
    jsonb_build_object('from_date', p_from_date)
  FROM calendar_integrations ci
  WHERE ci.id = p_integration_id;
END;
$$;

-- Function to get all events for syncing (simplified)
CREATE OR REPLACE FUNCTION public.get_all_events_for_sync(
  p_tenant_id UUID,
  p_from_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  event_date DATE,
  event_end_date DATE,
  start_time TIME,
  end_time TIME,
  venue_location TEXT,
  primary_contact_name TEXT,
  primary_contact_number TEXT,
  event_type TEXT,
  external_calendar_id TEXT,
  event_forms JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.event_date,
    e.event_end_date,
    e.start_time,
    e.end_time,
    e.venue_location,
    e.primary_contact_name,
    e.primary_contact_number,
    e.event_type,
    e.external_calendar_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'form_label', ef.form_label,
          'start_time', ef.start_time,
          'men_count', ef.men_count,
          'ladies_count', ef.ladies_count,
          'form_responses', ef.form_responses
        )
      ) FILTER (WHERE ef.id IS NOT NULL),
      '[]'::jsonb
    ) as event_forms
  FROM events e
  LEFT JOIN event_forms ef ON e.id = ef.event_id
  WHERE e.tenant_id = p_tenant_id
    AND e.event_date >= p_from_date
  GROUP BY e.id, e.title, e.event_date, e.event_end_date, e.start_time, e.end_time, 
           e.venue_location, e.primary_contact_name, e.primary_contact_number, 
           e.event_type, e.external_calendar_id
  ORDER BY e.event_date, e.start_time;
END;
$$;