-- First, let's check for actual duplicates and handle them more carefully
-- We'll only remove duplicates that aren't referenced by form_field_instances

WITH duplicates AS (
  SELECT 
    fl.id, 
    fl.tenant_id,
    fl.name,
    ROW_NUMBER() OVER (PARTITION BY fl.tenant_id, fl.name ORDER BY fl.created_at DESC) as rn,
    EXISTS(SELECT 1 FROM form_field_instances ffi WHERE ffi.field_library_id = fl.id) as is_referenced
  FROM field_library fl
),
safe_to_delete AS (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1 AND is_referenced = false
)
DELETE FROM field_library 
WHERE id IN (SELECT id FROM safe_to_delete);

-- For any remaining duplicates that are referenced, we'll update the name to make them unique
WITH remaining_duplicates AS (
  SELECT 
    id,
    tenant_id,
    name,
    ROW_NUMBER() OVER (PARTITION BY tenant_id, name ORDER BY created_at DESC) as rn
  FROM field_library
)
UPDATE field_library 
SET name = name || '_' || (rn - 1)::text
WHERE id IN (
  SELECT id FROM remaining_duplicates WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE field_library 
ADD CONSTRAINT field_library_tenant_name_unique 
UNIQUE (tenant_id, name);