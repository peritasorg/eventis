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

-- For unsupported field types, convert them to toggle instead of deleting
UPDATE field_library 
SET field_type = 'toggle' 
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