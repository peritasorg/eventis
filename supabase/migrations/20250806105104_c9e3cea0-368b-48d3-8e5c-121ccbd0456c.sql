-- Add affects_pricing column to field_library table
ALTER TABLE field_library 
ADD COLUMN IF NOT EXISTS affects_pricing BOOLEAN DEFAULT false;

-- Update existing fields based on their pricing_behavior
UPDATE field_library 
SET affects_pricing = (pricing_behavior != 'none' AND pricing_behavior IS NOT NULL)
WHERE affects_pricing IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_field_library_affects_pricing ON field_library(affects_pricing);