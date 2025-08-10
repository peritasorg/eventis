-- Fix the create_default_guest_section function to use correct field types
CREATE OR REPLACE FUNCTION public.create_default_guest_section(p_form_template_id uuid, p_tenant_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  section_id UUID;
  guest_name_field UUID;
  guest_email_field UUID;
  guest_phone_field UUID;
  guest_count_field UUID;
BEGIN
  -- Create Guest Information section
  INSERT INTO form_sections (
    form_template_id,
    tenant_id,
    section_title,
    section_description,
    section_order
  ) VALUES (
    p_form_template_id,
    p_tenant_id,
    'Guest Information',
    'Basic information about the event host and guest details',
    1
  ) RETURNING id INTO section_id;
  
  -- Add default guest information fields to field_library if they don't exist
  INSERT INTO field_library (tenant_id, name, label, field_type, category, required, sort_order) VALUES
  (p_tenant_id, 'guest_name', 'Primary Contact Name', 'text', 'guest_info', true, 1),
  (p_tenant_id, 'guest_email', 'Email Address', 'email', 'guest_info', true, 2),
  (p_tenant_id, 'guest_phone', 'Phone Number', 'phone', 'guest_info', true, 3),
  (p_tenant_id, 'guest_count', 'Number of Guests', 'number', 'guest_info', true, 4)
  ON CONFLICT (tenant_id, name) DO NOTHING;
  
  -- Get field IDs and add them to the section
  SELECT id INTO guest_name_field FROM field_library WHERE tenant_id = p_tenant_id AND name = 'guest_name';
  SELECT id INTO guest_email_field FROM field_library WHERE tenant_id = p_tenant_id AND name = 'guest_email';
  SELECT id INTO guest_phone_field FROM field_library WHERE tenant_id = p_tenant_id AND name = 'guest_phone';
  SELECT id INTO guest_count_field FROM field_library WHERE tenant_id = p_tenant_id AND name = 'guest_count';
  
  -- Add field instances to the section
  INSERT INTO form_field_instances (tenant_id, form_template_id, section_id, field_library_id, field_order) VALUES
  (p_tenant_id, p_form_template_id, section_id, guest_name_field, 1),
  (p_tenant_id, p_form_template_id, section_id, guest_email_field, 2),
  (p_tenant_id, p_form_template_id, section_id, guest_phone_field, 3),
  (p_tenant_id, p_form_template_id, section_id, guest_count_field, 4);
  
  RETURN section_id;
END;
$function$;