-- Fix security issues from previous migration

-- Fix SECURITY DEFINER functions by adding SET search_path = 'public'
CREATE OR REPLACE FUNCTION create_default_guest_section(p_form_template_id UUID, p_tenant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  (p_tenant_id, 'guest_phone', 'Phone Number', 'tel', 'guest_info', true, 3),
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
$$;

-- Fix auto_create_guest_section function
CREATE OR REPLACE FUNCTION auto_create_guest_section()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Only create if this is a new template and no sections exist yet
  IF NOT EXISTS (SELECT 1 FROM form_sections WHERE form_template_id = NEW.id) THEN
    PERFORM create_default_guest_section(NEW.id, NEW.tenant_id);
  END IF;
  
  RETURN NEW;
END;
$$;