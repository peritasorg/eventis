-- Drop and recreate the get_all_events_for_sync function without venue_location
DROP FUNCTION IF EXISTS public.get_all_events_for_sync(uuid, date);

CREATE OR REPLACE FUNCTION public.get_all_events_for_sync(p_tenant_id uuid, p_from_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(id uuid, title text, event_date date, event_end_date date, start_time time without time zone, end_time time without time zone, primary_contact_name text, primary_contact_number text, event_type text, external_calendar_id text, event_forms jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
           e.primary_contact_name, e.primary_contact_number, e.event_type, e.external_calendar_id
  ORDER BY e.event_date, e.start_time;
END;
$function$