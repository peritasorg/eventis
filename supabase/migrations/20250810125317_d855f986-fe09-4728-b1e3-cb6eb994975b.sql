-- First, let's see what field types currently exist and update them to match our new enum values
UPDATE form_fields 
SET field_type = CASE 
    WHEN field_type = 'text' THEN 'text_notes_only'
    WHEN field_type = 'price_fixed' THEN 'fixed_price_notes'
    WHEN field_type = 'price_per_person' THEN 'per_person_price_notes'
    WHEN field_type = 'counter' THEN 'counter_notes'
    ELSE 'text_notes_only'
END;

-- Remove NOT NULL constraint from default_price_gbp to allow fields without default prices
ALTER TABLE form_fields ALTER COLUMN default_price_gbp DROP NOT NULL;

-- Add helpful comment
COMMENT ON TABLE form_fields IS 'Form fields with standardized types: text_notes_only (notes only), fixed_price_notes (editable price + notes), per_person_price_notes (quantity × price + notes), counter_notes (number + notes)';