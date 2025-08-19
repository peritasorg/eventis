-- Remove status and source columns from leads table to fix conversion issues
ALTER TABLE leads DROP COLUMN IF EXISTS status;
ALTER TABLE leads DROP COLUMN IF EXISTS source;