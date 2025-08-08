-- Remove complex pricing fields and simplify field_library schema
ALTER TABLE field_library DROP COLUMN IF EXISTS affects_pricing;
ALTER TABLE field_library DROP COLUMN IF EXISTS pricing_behavior;
ALTER TABLE field_library DROP COLUMN IF EXISTS pricing_type;
ALTER TABLE field_library DROP COLUMN IF EXISTS show_notes_field;
ALTER TABLE field_library DROP COLUMN IF EXISTS unit_price;
ALTER TABLE field_library DROP COLUMN IF EXISTS min_quantity;
ALTER TABLE field_library DROP COLUMN IF EXISTS max_quantity;

-- Standardize existing form responses to new structure
-- This will ensure any existing form responses have consistent structure
UPDATE event_forms 
SET form_responses = (
  SELECT jsonb_object_agg(
    key,
    CASE 
      WHEN jsonb_typeof(value) = 'object' AND value ? 'value' THEN value
      ELSE jsonb_build_object(
        'value', value,
        'notes', '',
        'price', 0,
        'quantity', 1
      )
    END
  )
  FROM jsonb_each(form_responses)
)
WHERE form_responses IS NOT NULL AND form_responses != '{}'::jsonb;