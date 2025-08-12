-- Add toggle field functionality to field_library table
ALTER TABLE field_library 
ADD COLUMN is_toggleable boolean NOT NULL DEFAULT false,
ADD COLUMN toggle_label text,
ADD COLUMN default_enabled boolean NOT NULL DEFAULT true;

-- Update existing field descriptions with useful comments
COMMENT ON COLUMN field_library.is_toggleable IS 'When true, field will show as a toggle that can be enabled/disabled';
COMMENT ON COLUMN field_library.toggle_label IS 'Custom label for the toggle switch (defaults to field name if not set)';
COMMENT ON COLUMN field_library.default_enabled IS 'Default state for toggleable fields when first added to a form';