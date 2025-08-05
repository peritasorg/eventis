-- Simplify field_library table structure
-- First, create a backup of current data before simplification
CREATE TABLE field_library_backup AS SELECT * FROM field_library;

-- Remove unnecessary columns from field_library, keeping only essential ones
ALTER TABLE field_library 
DROP COLUMN IF EXISTS max_quantity,
DROP COLUMN IF EXISTS default_quantity,
DROP COLUMN IF EXISTS pricing_tiers,
DROP COLUMN IF EXISTS show_quantity_field,
DROP COLUMN IF EXISTS auto_add_price_field,
DROP COLUMN IF EXISTS auto_add_notes_field,
DROP COLUMN IF EXISTS usage_count,
DROP COLUMN IF EXISTS show_notes_field,
DROP COLUMN IF EXISTS allow_zero_price,
DROP COLUMN IF EXISTS custom_pricing_logic,
DROP COLUMN IF EXISTS pricing_behavior,
DROP COLUMN IF EXISTS pricing_type,
DROP COLUMN IF EXISTS default_value,
DROP COLUMN IF EXISTS unit_price,
DROP COLUMN IF EXISTS min_quantity,
DROP COLUMN IF EXISTS validation_rules,
DROP COLUMN IF EXISTS affects_pricing,
DROP COLUMN IF EXISTS price_modifier;

-- Add required and sort_order columns if they don't exist
ALTER TABLE field_library 
ADD COLUMN IF NOT EXISTS required boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Update existing records to have proper sort_order
UPDATE field_library SET sort_order = 0 WHERE sort_order IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_field_library_sort_order ON field_library(tenant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_field_library_category ON field_library(tenant_id, category);