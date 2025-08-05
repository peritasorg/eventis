-- Remove tags column from field_library table
ALTER TABLE field_library DROP COLUMN IF EXISTS tags;

-- Drop the GIN index on tags since we're removing the column
DROP INDEX IF EXISTS idx_field_library_tags;

-- Ensure options column exists and is properly configured for dropdown/toggle values
-- This column should store JSON for dropdown options or toggle values
ALTER TABLE field_library 
ALTER COLUMN options SET DEFAULT '[]'::jsonb;