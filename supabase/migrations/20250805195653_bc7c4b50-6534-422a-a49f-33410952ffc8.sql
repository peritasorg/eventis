-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS validate_field_pricing_config_trigger ON field_library;
DROP FUNCTION IF EXISTS validate_field_pricing_config();

-- Add missing columns to field_library table
ALTER TABLE field_library 
ADD COLUMN IF NOT EXISTS pricing_behavior text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS show_notes_field boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pricing_type text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0;

-- Update existing data to have proper defaults
UPDATE field_library 
SET pricing_behavior = 'none' 
WHERE pricing_behavior IS NULL;

UPDATE field_library 
SET show_notes_field = false 
WHERE show_notes_field IS NULL;

UPDATE field_library 
SET pricing_type = 'none' 
WHERE pricing_type IS NULL;

UPDATE field_library 
SET unit_price = 0 
WHERE unit_price IS NULL;

-- Standardize field types to only allow toggle, number, select
UPDATE field_library 
SET field_type = 'toggle' 
WHERE field_type = 'checkbox';

UPDATE field_library 
SET field_type = 'select' 
WHERE field_type = 'multi_select';

-- Remove invalid field types that aren't supported
DELETE FROM field_library 
WHERE field_type NOT IN ('toggle', 'number', 'select');

-- Standardize categories to match the expected values
UPDATE field_library 
SET category = 'Food & Beverage' 
WHERE category = 'food_beverage' OR category = 'Catering';

UPDATE field_library 
SET category = 'Decorations' 
WHERE category = 'Decoration';

UPDATE field_library 
SET category = 'Venue' 
WHERE category = 'venue';

-- Add constraint to ensure only valid field types
ALTER TABLE field_library 
ADD CONSTRAINT valid_field_types 
CHECK (field_type IN ('toggle', 'number', 'select'));

-- Recreate the trigger function with the new columns
CREATE OR REPLACE FUNCTION public.validate_field_pricing_config()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Ensure unit_price is set if pricing_behavior requires it
  IF NEW.pricing_behavior IN ('fixed', 'per_person', 'quantity_based') AND NEW.unit_price IS NULL THEN
    NEW.unit_price := 0;
  END IF;
  
  -- Set affects_pricing based on pricing_behavior
  IF NEW.pricing_behavior != 'none' THEN
    NEW.unit_price := COALESCE(NEW.unit_price, 0);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER validate_field_pricing_config_trigger
  BEFORE INSERT OR UPDATE ON field_library
  FOR EACH ROW
  EXECUTE FUNCTION validate_field_pricing_config();