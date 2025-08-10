-- First, remove any duplicate field library entries that might exist
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id, name ORDER BY created_at DESC) as rn
  FROM field_library
)
DELETE FROM field_library 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE field_library 
ADD CONSTRAINT field_library_tenant_name_unique 
UNIQUE (tenant_id, name);