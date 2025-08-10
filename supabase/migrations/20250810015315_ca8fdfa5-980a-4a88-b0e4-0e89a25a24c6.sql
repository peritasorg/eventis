-- First, safely remove unreferenced duplicates
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

-- Handle remaining duplicates by making their names unique
UPDATE field_library 
SET name = subq.new_name
FROM (
  SELECT 
    id,
    name || '_' || (rn - 1)::text as new_name
  FROM (
    SELECT 
      id,
      name,
      ROW_NUMBER() OVER (PARTITION BY tenant_id, name ORDER BY created_at DESC) as rn
    FROM field_library
  ) ranked
  WHERE rn > 1
) subq
WHERE field_library.id = subq.id;

-- Now add the unique constraint
ALTER TABLE field_library 
ADD CONSTRAINT field_library_tenant_name_unique 
UNIQUE (tenant_id, name);