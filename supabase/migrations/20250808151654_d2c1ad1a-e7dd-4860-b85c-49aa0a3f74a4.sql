-- Fix ambiguous column reference in get_tenant_dashboard_stats function
CREATE OR REPLACE FUNCTION public.get_tenant_dashboard_stats(p_tenant_id uuid)
 RETURNS TABLE(total_leads integer, new_leads_this_month integer, total_customers integer, active_events integer, this_month_revenue numeric, upcoming_events integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM leads WHERE tenant_id = p_tenant_id) as total_leads,
        (SELECT COUNT(*)::INTEGER FROM leads WHERE tenant_id = p_tenant_id AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as new_leads_this_month,
        (SELECT COUNT(*)::INTEGER FROM customers WHERE tenant_id = p_tenant_id AND active = true) as total_customers,
        (SELECT COUNT(*)::INTEGER FROM events WHERE tenant_id = p_tenant_id AND status IN ('confirmed', 'inquiry')) as active_events,
        (SELECT COALESCE(SUM(e.total_amount), 0) FROM events e WHERE e.tenant_id = p_tenant_id AND DATE_TRUNC('month', e.event_start_date) = DATE_TRUNC('month', CURRENT_DATE) AND e.total_amount IS NOT NULL) as this_month_revenue,
        (SELECT COUNT(*)::INTEGER FROM events WHERE tenant_id = p_tenant_id AND event_start_date >= CURRENT_DATE AND event_start_date <= CURRENT_DATE + INTERVAL '14 days' AND status IN ('confirmed', 'inquiry')) as upcoming_events;
END;
$function$