-- First, clean up duplicate calendar_warning_settings records
-- Keep only the most recent record for each tenant_id
DELETE FROM calendar_warning_settings 
WHERE id NOT IN (
  SELECT DISTINCT ON (tenant_id) id
  FROM calendar_warning_settings
  ORDER BY tenant_id, created_at DESC
);

-- Add unique constraint on tenant_id to prevent future duplicates
ALTER TABLE calendar_warning_settings 
ADD CONSTRAINT calendar_warning_settings_tenant_id_unique 
UNIQUE (tenant_id);