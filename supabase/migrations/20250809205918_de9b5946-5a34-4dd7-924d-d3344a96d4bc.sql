-- Phase 1: Enhanced Database Schema for Universal Field Architecture

-- Extend field_library table with universal field capabilities
ALTER TABLE field_library 
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pricing_behavior TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS show_quantity BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_notes BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_price_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'item',
ADD COLUMN IF NOT EXISTS min_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_quantity INTEGER,
ADD COLUMN IF NOT EXISTS default_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS help_text TEXT,
ADD COLUMN IF NOT EXISTS placeholder TEXT,
ADD COLUMN IF NOT EXISTS affects_pricing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_add_notes_field BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_add_price_field BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Create field_types reference table for standardization
CREATE TABLE IF NOT EXISTS field_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  default_config JSONB DEFAULT '{}',
  icon TEXT,
  category TEXT NOT NULL,
  supports_pricing BOOLEAN DEFAULT false,
  supports_quantity BOOLEAN DEFAULT false,
  supports_notes BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- Insert universal field types for banqueting industry
INSERT INTO field_types (name, display_name, description, default_config, icon, category, supports_pricing, supports_quantity, supports_notes) VALUES
('price_field', 'Price Field', 'Field with pricing, quantity and total calculations', '{"pricing_type": "per_person", "show_quantity": true, "show_notes": true, "allow_override": true}', 'pound-sterling', 'pricing', true, true, true),
('menu_item', 'Menu Item', 'Food/beverage item with per-person or bulk pricing', '{"pricing_type": "per_person", "unit_type": "person", "show_dietary_info": true}', 'utensils', 'menu', true, true, true),
('service_field', 'Service Field', 'Service item with fixed or estimated pricing', '{"pricing_type": "fixed", "status_tracking": true}', 'wrench', 'services', true, false, true),
('counter_field', 'Counter Field', 'Numeric counter with optional pricing', '{"show_pricing": false, "min_value": 0}', 'hash', 'counts', true, false, false),
('guest_count', 'Guest Count', 'Specialized counter for guest numbers', '{"show_pricing": false, "affects_totals": true}', 'users', 'guests', false, false, false),
('text_field', 'Text Field', 'Single line text input', '{"character_limit": 255}', 'type', 'information', false, false, false),
('textarea_field', 'Text Area', 'Multi-line text input for longer content', '{"character_limit": 1000, "rows": 4}', 'file-text', 'information', false, false, false),
('select_field', 'Select Field', 'Dropdown selection field', '{"allow_multiple": false}', 'list', 'selection', false, false, false),
('checkbox_field', 'Checkbox Field', 'Boolean yes/no field', '{}', 'check-square', 'selection', false, false, false),
('date_field', 'Date Field', 'Date selection field', '{}', 'calendar', 'information', false, false, false),
('time_field', 'Time Field', 'Time selection field', '{}', 'clock', 'information', false, false, false);

-- Create trigger to validate field pricing configuration
CREATE OR REPLACE FUNCTION validate_field_pricing_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure unit_price is set if pricing_behavior requires it
  IF NEW.pricing_behavior IN ('fixed', 'per_person', 'quantity_based') AND NEW.unit_price IS NULL THEN
    NEW.unit_price := 0;
  END IF;
  
  -- Ensure quantity fields are logical
  IF NEW.min_quantity IS NOT NULL AND NEW.max_quantity IS NOT NULL AND NEW.min_quantity > NEW.max_quantity THEN
    RAISE EXCEPTION 'min_quantity cannot be greater than max_quantity';
  END IF;
  
  -- Set affects_pricing based on pricing_behavior
  NEW.affects_pricing := (NEW.pricing_behavior != 'none');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_field_pricing_config_trigger
  BEFORE INSERT OR UPDATE ON field_library
  FOR EACH ROW
  EXECUTE FUNCTION validate_field_pricing_config();

-- Update existing field_library records to have proper field types
UPDATE field_library 
SET pricing_behavior = 'none', 
    show_notes = true, 
    show_quantity = false,
    unit_type = 'item'
WHERE pricing_behavior IS NULL;

-- Set common banqueting fields with proper pricing
UPDATE field_library 
SET pricing_behavior = 'per_person',
    show_quantity = true,
    unit_type = 'person',
    affects_pricing = true
WHERE field_type = 'number' AND (
  LOWER(label) LIKE '%guest%' OR 
  LOWER(label) LIKE '%person%' OR 
  LOWER(label) LIKE '%people%'
);

-- Add index for better performance on field library queries
CREATE INDEX IF NOT EXISTS idx_field_library_category ON field_library(category);
CREATE INDEX IF NOT EXISTS idx_field_library_field_type ON field_library(field_type);
CREATE INDEX IF NOT EXISTS idx_field_library_tenant_active ON field_library(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_field_types_category ON field_types(category, active);