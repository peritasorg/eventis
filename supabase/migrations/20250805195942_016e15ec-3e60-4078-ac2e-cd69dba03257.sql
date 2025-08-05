-- Simple approach: just add the missing columns
ALTER TABLE field_library 
ADD COLUMN IF NOT EXISTS pricing_behavior text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS show_notes_field boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pricing_type text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_quantity integer,
ADD COLUMN IF NOT EXISTS max_quantity integer,
ADD COLUMN IF NOT EXISTS affects_pricing boolean DEFAULT false;

-- Update existing data to have proper defaults  
UPDATE field_library 
SET pricing_behavior = COALESCE(pricing_behavior, 'none'),
    show_notes_field = COALESCE(show_notes_field, false),
    pricing_type = COALESCE(pricing_type, 'none'),
    unit_price = COALESCE(unit_price, 0),
    affects_pricing = COALESCE(affects_pricing, false);

-- Simple field type standardization without deletions
UPDATE field_library SET field_type = 'toggle' WHERE field_type = 'checkbox';
UPDATE field_library SET field_type = 'select' WHERE field_type = 'multi_select';
UPDATE field_library SET field_type = 'toggle' WHERE field_type NOT IN ('toggle', 'number', 'select');