-- Remove unnecessary toggle columns from field_library table
ALTER TABLE field_library DROP COLUMN IF EXISTS is_toggleable;
ALTER TABLE field_library DROP COLUMN IF EXISTS toggle_label;
ALTER TABLE field_library DROP COLUMN IF EXISTS default_enabled;