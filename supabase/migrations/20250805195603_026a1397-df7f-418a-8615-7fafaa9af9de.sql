-- Add missing columns to field_library table
ALTER TABLE field_library 
ADD COLUMN IF NOT EXISTS pricing_behavior text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS show_notes_field boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pricing_type text DEFAULT 'none';

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