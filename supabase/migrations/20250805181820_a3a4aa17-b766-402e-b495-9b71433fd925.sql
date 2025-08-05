-- Phase 1: Extend field_library table with missing pricing fields
-- Add pricing configuration fields
ALTER TABLE field_library 
ADD COLUMN IF NOT EXISTS pricing_behavior text DEFAULT 'none' CHECK (pricing_behavior IN ('none', 'fixed', 'per_person', 'quantity_based')),
ADD COLUMN IF NOT EXISTS unit_price numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_quantity integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS default_quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS pricing_tiers jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS show_quantity_field boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_notes_field boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_zero_price boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS custom_pricing_logic jsonb DEFAULT '{}'::jsonb;

-- Add better indexes for form queries
CREATE INDEX IF NOT EXISTS idx_form_field_instances_template_section ON form_field_instances(form_template_id, form_section_id, field_order);
CREATE INDEX IF NOT EXISTS idx_field_library_tenant_active ON field_library(tenant_id, active) WHERE active = true;

-- Update existing pricing_type to use the new pricing_behavior column
UPDATE field_library 
SET pricing_behavior = CASE 
  WHEN pricing_type = 'fixed' THEN 'fixed'
  WHEN pricing_type = 'per_guest' THEN 'per_person'
  WHEN pricing_type = 'percentage' THEN 'quantity_based'
  ELSE 'none'
END
WHERE pricing_type IS NOT NULL;

-- Enable show_quantity_field for fields that affect pricing
UPDATE field_library 
SET show_quantity_field = true 
WHERE affects_pricing = true AND pricing_behavior IN ('per_person', 'quantity_based');

-- Set unit_price based on existing price_modifier
UPDATE field_library 
SET unit_price = price_modifier 
WHERE price_modifier > 0;

-- Add validation function for pricing configuration
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

-- Create trigger for validation
DROP TRIGGER IF EXISTS trigger_validate_field_pricing ON field_library;
CREATE TRIGGER trigger_validate_field_pricing
  BEFORE INSERT OR UPDATE ON field_library
  FOR EACH ROW
  EXECUTE FUNCTION validate_field_pricing_config();