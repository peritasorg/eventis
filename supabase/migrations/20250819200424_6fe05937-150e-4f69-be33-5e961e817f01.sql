-- Drop the dependent view first, then remove status and source columns
DROP VIEW IF EXISTS lead_pipeline CASCADE;

-- Remove status and source columns from leads table
ALTER TABLE leads DROP COLUMN IF EXISTS status;
ALTER TABLE leads DROP COLUMN IF EXISTS source;