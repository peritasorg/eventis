-- Fix form_fields_field_type_check constraint to include new dropdown field types
ALTER TABLE public.form_fields DROP CONSTRAINT IF EXISTS form_fields_field_type_check;

-- Add updated constraint with new dropdown field types
ALTER TABLE public.form_fields ADD CONSTRAINT form_fields_field_type_check 
CHECK (field_type IN (
  'text', 
  'text_notes_only', 
  'fixed_price_notes', 
  'per_person_price_notes', 
  'counter_notes',
  'dropdown_options',
  'dropdown_options_price_notes'
));