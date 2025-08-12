-- Update the check constraint to include the new field type
ALTER TABLE form_fields DROP CONSTRAINT IF EXISTS form_fields_field_type_check;

-- Add the new constraint with the updated field type
ALTER TABLE form_fields ADD CONSTRAINT form_fields_field_type_check 
CHECK (field_type IN (
  'text_notes_only', 
  'fixed_price_notes', 
  'fixed_price_notes_toggle',
  'fixed_price_quantity_notes', 
  'per_person_price_notes', 
  'counter_notes', 
  'dropdown_options', 
  'dropdown_options_price_notes'
));