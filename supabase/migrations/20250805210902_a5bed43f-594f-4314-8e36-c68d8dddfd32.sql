-- Drop the existing constraint if it exists
ALTER TABLE event_forms DROP CONSTRAINT IF EXISTS event_forms_tenant_event_order_unique;

-- Create a new unique constraint that only applies to active forms
CREATE UNIQUE INDEX event_forms_tenant_event_order_active_unique 
ON event_forms (tenant_id, event_id, tab_order) 
WHERE is_active = true;

-- Update the get_next_tab_order function to only consider active forms
CREATE OR REPLACE FUNCTION public.get_next_tab_order(p_event_id uuid, p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_order INTEGER;
BEGIN
  -- Get the maximum tab_order for this event for ACTIVE forms only, defaulting to 0 if no forms exist
  SELECT COALESCE(MAX(tab_order), 0) + 1 INTO next_order
  FROM event_forms
  WHERE event_id = p_event_id 
  AND tenant_id = p_tenant_id 
  AND is_active = true;
  
  RETURN next_order;
END;
$function$;