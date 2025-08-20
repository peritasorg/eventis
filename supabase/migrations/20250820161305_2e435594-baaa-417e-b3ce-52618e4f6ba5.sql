-- Force drop and recreate the get_all_events_for_sync function with correct structure
DROP FUNCTION IF EXISTS get_all_events_for_sync(UUID, DATE);

CREATE OR REPLACE FUNCTION get_all_events_for_sync(
  p_tenant_id UUID,
  p_from_date DATE
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  event_date DATE,
  event_end_date DATE,
  start_time TIME,
  end_time TIME,
  primary_contact_name TEXT,
  primary_contact_number TEXT,
  event_forms JSONB[]
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
    e.primary_contact_name,
    e.primary_contact_number,
    COALESCE(
      ARRAY(
        SELECT jsonb_build_object(
          'form_label', ef.form_label,
          'start_time', ef.start_time,
          'men_count', ef.men_count,
          'ladies_count', ef.ladies_count,
          'form_responses', ef.form_responses
        )
        FROM event_forms ef
        WHERE ef.event_id = e.id
        ORDER BY ef.created_at
      ),
      ARRAY[]::jsonb[]
    ) as event_forms
  FROM events e
  WHERE e.tenant_id = p_tenant_id
    AND e.event_date >= p_from_date
  ORDER BY e.event_date, e.start_time;
END;
$$;