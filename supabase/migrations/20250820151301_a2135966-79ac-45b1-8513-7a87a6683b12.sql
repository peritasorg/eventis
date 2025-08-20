-- Create function to bulk clear external calendar IDs for rollback scenarios
CREATE OR REPLACE FUNCTION public.bulk_clear_external_calendar_ids(
  p_tenant_id UUID,
  p_from_date DATE DEFAULT '2025-08-01'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cleared_count INTEGER;
BEGIN
  UPDATE events 
  SET 
    external_calendar_id = NULL,
    updated_at = NOW()
  WHERE tenant_id = p_tenant_id
    AND event_date >= p_from_date
    AND external_calendar_id IS NOT NULL;
  
  GET DIAGNOSTICS cleared_count = ROW_COUNT;
  
  RETURN cleared_count;
END;
$$;

-- Create function to bulk update external calendar IDs after successful sync
CREATE OR REPLACE FUNCTION public.bulk_update_external_calendar_ids(
  p_updates JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  update_record JSONB;
  updated_count INTEGER := 0;
BEGIN
  FOR update_record IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE events 
    SET 
      external_calendar_id = update_record->>'external_calendar_id',
      updated_at = NOW()
    WHERE id = (update_record->>'event_id')::UUID;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

-- Create function to get reconciliation statistics
CREATE OR REPLACE FUNCTION public.get_reconciliation_stats(
  p_tenant_id UUID,
  p_from_date DATE DEFAULT '2025-08-01'
)
RETURNS TABLE(
  total_events INTEGER,
  events_with_external_id INTEGER,
  events_without_external_id INTEGER,
  percentage_synced NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_events,
    COUNT(external_calendar_id)::INTEGER as events_with_external_id,
    (COUNT(*) - COUNT(external_calendar_id))::INTEGER as events_without_external_id,
    CASE 
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(external_calendar_id)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END as percentage_synced
  FROM events
  WHERE tenant_id = p_tenant_id
    AND event_date >= p_from_date;
END;
$$;

-- Create enhanced logging for reconciliation operations
CREATE OR REPLACE FUNCTION public.log_reconciliation_operation(
  p_tenant_id UUID,
  p_operation_type TEXT,
  p_operation_data JSONB,
  p_result_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    description,
    metadata,
    security_event,
    risk_level,
    created_at
  ) VALUES (
    p_tenant_id,
    auth.uid(),
    'calendar_reconciliation',
    'calendar_sync',
    'Calendar reconciliation operation: ' || p_operation_type,
    jsonb_build_object(
      'operation_type', p_operation_type,
      'operation_data', p_operation_data,
      'result_data', p_result_data
    ),
    false,
    'medium',
    NOW()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;