-- Add dropdown_options column to form_fields table for storing dropdown options
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS dropdown_options jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN form_fields.dropdown_options IS 'Array of dropdown options with structure: [{"label": "Option 1", "value": "option1", "price": 10.50}]';