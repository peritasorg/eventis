-- Add is_multiselect column to form_fields table
ALTER TABLE form_fields ADD COLUMN is_multiselect boolean NOT NULL DEFAULT false;

-- Update existing fields that were hardcoded to be multiselect (like "Dining Chairs")
UPDATE form_fields 
SET is_multiselect = true 
WHERE field_type IN ('dropdown_options', 'dropdown_options_price_notes') 
AND (LOWER(name) LIKE '%dining%' OR LOWER(name) LIKE '%chairs%');