-- Update field types to match exact user requirements
DO $$ 
BEGIN
    -- Add the new field types if the type doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_type_enum') THEN
        CREATE TYPE field_type_enum AS ENUM (
            'text_notes_only',
            'fixed_price_notes', 
            'per_person_price_notes',
            'counter_notes'
        );
    ELSE
        -- Update existing enum to include new values
        ALTER TYPE field_type_enum ADD VALUE IF NOT EXISTS 'text_notes_only';
        ALTER TYPE field_type_enum ADD VALUE IF NOT EXISTS 'fixed_price_notes';
        ALTER TYPE field_type_enum ADD VALUE IF NOT EXISTS 'per_person_price_notes';
        ALTER TYPE field_type_enum ADD VALUE IF NOT EXISTS 'counter_notes';
    END IF;
END $$;

-- Update form_fields table to use the new enum and remove forced default_price_gbp requirement
ALTER TABLE form_fields 
    ALTER COLUMN field_type TYPE field_type_enum USING 
    CASE 
        WHEN field_type = 'text' THEN 'text_notes_only'::field_type_enum
        WHEN field_type = 'price_fixed' THEN 'fixed_price_notes'::field_type_enum
        WHEN field_type = 'price_per_person' THEN 'per_person_price_notes'::field_type_enum
        WHEN field_type = 'counter' THEN 'counter_notes'::field_type_enum
        ELSE 'text_notes_only'::field_type_enum
    END;

-- Remove NOT NULL constraint from default_price_gbp to allow fields without default prices
ALTER TABLE form_fields ALTER COLUMN default_price_gbp DROP NOT NULL;

-- Add helpful comment
COMMENT ON TABLE form_fields IS 'Form fields with standardized types: text_notes_only (notes only), fixed_price_notes (editable price + notes), per_person_price_notes (quantity × price + notes), counter_notes (number + notes)';