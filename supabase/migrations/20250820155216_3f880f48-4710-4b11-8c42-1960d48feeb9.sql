-- Enhanced Calendar Reconciliation Functions
-- Add functions for better calendar management and form data retrieval

-- Function to get events with their complete form data for calendar sync
CREATE OR REPLACE FUNCTION public.get_events_with_form_data(
  p_tenant_id UUID,
  p_from_date DATE DEFAULT '2025-08-01'::DATE
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  event_type TEXT,
  event_date DATE,
  event_end_date DATE,  
  start_time TIME,
  end_time TIME,
  primary_contact_name TEXT,
  primary_contact_number TEXT,
  secondary_contact_name TEXT,
  secondary_contact_number TEXT,
  men_count INTEGER,
  ladies_count INTEGER,
  ethnicity JSONB,
  external_calendar_id TEXT,
  event_forms JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.event_type,
    e.event_date,
    e.event_end_date,
    e.start_time,
    e.end_time,
    e.primary_contact_name,
    e.primary_contact_number,
    e.secondary_contact_name,
    e.secondary_contact_number,
    e.men_count,
    e.ladies_count,
    e.ethnicity,
    e.external_calendar_id,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ef.id,
            'form_label', ef.form_label,
            'start_time', ef.start_time,
            'end_time', ef.end_time,
            'men_count', ef.men_count,
            'ladies_count', ef.ladies_count,
            'form_responses', ef.form_responses,
            'form_id', ef.form_id
          )
        )
        FROM event_forms ef
        WHERE ef.event_id = e.id 
        AND ef.is_active = true
        AND ef.tenant_id = p_tenant_id
      ),
      '[]'::jsonb
    ) as event_forms
  FROM events e
  WHERE e.tenant_id = p_tenant_id
  AND e.event_date >= p_from_date
  ORDER BY e.event_date, e.start_time;
END;
$function$;

-- Function to delete all external calendar IDs from a specific date
CREATE OR REPLACE FUNCTION public.delete_all_from_date(
  p_tenant_id UUID,
  p_from_date DATE DEFAULT '2025-08-01'::DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE events 
  SET 
    external_calendar_id = NULL,
    updated_at = NOW()
  WHERE tenant_id = p_tenant_id
    AND event_date >= p_from_date
    AND external_calendar_id IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$function$;

-- Function to get field mappings for a tenant (for description building)
CREATE OR REPLACE FUNCTION public.get_field_mappings(p_tenant_id UUID)
RETURNS TABLE (
  field_id UUID,
  field_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ff.id as field_id,
    ff.name as field_name
  FROM form_fields ff
  WHERE ff.tenant_id = p_tenant_id
    AND ff.is_active = true;
END;
$function$;