-- Phase 1: Fix Database Schema for Form Builder

-- Add form_template_id to form_sections to link sections to specific forms
ALTER TABLE form_sections 
ADD COLUMN IF NOT EXISTS form_template_id UUID;

-- Add foreign key constraint to link sections to form templates
ALTER TABLE form_sections 
ADD CONSTRAINT fk_form_sections_template 
FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE CASCADE;

-- Update form_field_instances to properly reference form_sections
ALTER TABLE form_field_instances 
DROP CONSTRAINT IF EXISTS fk_form_field_instances_section;

ALTER TABLE form_field_instances 
ADD CONSTRAINT fk_form_field_instances_section 
FOREIGN KEY (section_id) REFERENCES form_sections(id) ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_form_sections_template_id ON form_sections(form_template_id);
CREATE INDEX IF NOT EXISTS idx_form_sections_order ON form_sections(form_template_id, section_order);
CREATE INDEX IF NOT EXISTS idx_form_field_instances_section ON form_field_instances(section_id, field_order);

-- Update field_types to ensure pricing and quantity fields are properly configured
INSERT INTO field_types (name, display_name, description, category, supports_pricing, supports_quantity, supports_notes, icon, default_config) VALUES
('price', 'Price Field', 'Monetary amount with currency formatting', 'pricing', true, false, true, 'DollarSign', '{"min": 0, "currency": "GBP", "pricing_behavior": "fixed"}'),
('quantity', 'Quantity Field', 'Numeric quantity selector', 'pricing', true, true, true, 'Hash', '{"min": 1, "max": 100, "pricing_behavior": "quantity_based"}'),
('per_person_price', 'Per Person Price', 'Price that multiplies by guest count', 'pricing', true, true, true, 'Users', '{"min": 0, "currency": "GBP", "pricing_behavior": "per_person"}')
ON CONFLICT (name) DO UPDATE SET
  supports_pricing = EXCLUDED.supports_pricing,
  supports_quantity = EXCLUDED.supports_quantity,
  default_config = EXCLUDED.default_config;

-- Remove redundant textarea field and keep only the large one
UPDATE field_types SET active = false WHERE name = 'textarea' AND display_name = 'Text Area';

-- Create default Guest Information section template function
CREATE OR REPLACE FUNCTION create_default_guest_section(p_form_template_id UUID, p_tenant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger to auto-create Guest Information section for new form templates
CREATE OR REPLACE FUNCTION auto_create_guest_section()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create if this is a new template and no sections exist yet
  IF NOT EXISTS (SELECT 1 FROM form_sections WHERE form_template_id = NEW.id) THEN
    PERFORM create_default_guest_section(NEW.id, NEW.tenant_id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_create_guest_section
  AFTER INSERT ON form_templates
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_guest_section();