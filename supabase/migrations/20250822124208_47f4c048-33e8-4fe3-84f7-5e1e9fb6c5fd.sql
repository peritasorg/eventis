-- Security Enhancement: Fix remaining trigger and utility functions

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
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
 SECURITY DEFINER
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
 SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.auto_create_guest_section()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create if this is a new template and no sections exist yet
  IF NOT EXISTS (SELECT 1 FROM form_sections WHERE form_template_id = NEW.id) THEN
    PERFORM create_default_guest_section(NEW.id, NEW.tenant_id);
  END IF;
  
  RETURN NEW;
END;
$function$;