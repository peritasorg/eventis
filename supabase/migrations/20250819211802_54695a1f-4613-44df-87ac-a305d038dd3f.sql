-- Remove status column from leads table
ALTER TABLE leads DROP COLUMN IF EXISTS status;