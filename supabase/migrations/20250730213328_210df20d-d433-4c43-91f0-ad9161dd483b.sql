-- Security Fix 5: Update remaining functions to use secure search paths
-- Fix all remaining functions that don't have SET search_path

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
        (SELECT COALESCE(SUM(total_amount), 0) FROM events WHERE tenant_id = p_tenant_id AND DATE_TRUNC('month', event_start_date) = DATE_TRUNC('month', CURRENT_DATE) AND total_amount IS NOT NULL) as this_month_revenue,
        (SELECT COUNT(*)::INTEGER FROM events WHERE tenant_id = p_tenant_id AND event_start_date >= CURRENT_DATE AND event_start_date <= CURRENT_DATE + INTERVAL '14 days' AND status IN ('confirmed', 'inquiry')) as upcoming_events;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_customer_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE customers 
        SET 
            total_events = (SELECT COUNT(*) FROM events WHERE customer_id = NEW.customer_id AND total_amount > 0),
            total_spent = (SELECT COALESCE(SUM(total_amount), 0) FROM events WHERE customer_id = NEW.customer_id AND total_amount > 0),
            last_event_date = (SELECT MAX(event_start_date) FROM events WHERE customer_id = NEW.customer_id AND total_amount > 0)
        WHERE id = NEW.customer_id;
        
        -- Update average event value
        UPDATE customers 
        SET average_event_value = CASE 
            WHEN total_events > 0 THEN total_spent / total_events 
            ELSE 0 
        END
        WHERE id = NEW.customer_id;
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE customers 
        SET 
            total_events = (SELECT COUNT(*) FROM events WHERE customer_id = OLD.customer_id AND total_amount > 0),
            total_spent = (SELECT COALESCE(SUM(total_amount), 0) FROM events WHERE customer_id = OLD.customer_id AND total_amount > 0),
            last_event_date = (SELECT MAX(event_start_date) FROM events WHERE customer_id = OLD.customer_id AND total_amount > 0)
        WHERE id = OLD.customer_id;
        
        UPDATE customers 
        SET average_event_value = CASE 
            WHEN total_events > 0 THEN total_spent / total_events 
            ELSE 0 
        END
        WHERE id = OLD.customer_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_event_total_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    -- Calculate total_amount as sum of total_guest_price and form_total
    NEW.total_amount = COALESCE(NEW.total_guest_price, 0) + COALESCE(NEW.form_total, 0);
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_tenant_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO tenant_settings (tenant_id) VALUES (NEW.id);
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, new_values)
        VALUES (
            NEW.tenant_id,
            auth.uid(),
            'create',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (
            NEW.tenant_id,
            auth.uid(),
            'update',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, old_values)
        VALUES (
            OLD.tenant_id,
            auth.uid(),
            'delete',
            TG_TABLE_NAME,
            OLD.id,
            to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

-- Drop and recreate the problematic views without SECURITY DEFINER
-- These views were causing security warnings
DROP VIEW IF EXISTS public.event_summary CASCADE;
DROP VIEW IF EXISTS public.lead_pipeline CASCADE;
DROP VIEW IF EXISTS public.monthly_revenue CASCADE;

-- Recreate views as normal views (without SECURITY DEFINER)
CREATE VIEW public.event_summary AS
SELECT 
    e.id,
    e.event_name,
    e.event_type,
    e.event_start_date as event_date,
    e.start_time,
    e.end_time,
    e.status,
    e.total_amount,
    e.tenant_id,
    c.name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone,
    (SELECT COUNT(*) FROM event_staff_assignments esa WHERE esa.event_id = e.id) as staff_assigned
FROM events e
LEFT JOIN customers c ON e.customer_id = c.id;

CREATE VIEW public.lead_pipeline AS
SELECT 
    l.tenant_id,
    l.status,
    COUNT(*) as lead_count,
    AVG(l.estimated_budget) as avg_budget,
    SUM(l.estimated_budget) as total_potential
FROM leads l
GROUP BY l.tenant_id, l.status;

CREATE VIEW public.monthly_revenue AS
SELECT 
    e.tenant_id,
    DATE_TRUNC('month', e.event_start_date) as revenue_month,
    SUM(e.total_amount) as total_revenue,
    COUNT(*) as events_count,
    AVG(e.total_amount) as avg_event_value
FROM events e
WHERE e.total_amount > 0
GROUP BY e.tenant_id, DATE_TRUNC('month', e.event_start_date);