-- Clean up redundant field_library table and related entities

-- Drop triggers first
DROP TRIGGER IF EXISTS validate_field_pricing_config ON field_library;

-- Drop RLS policies
DROP POLICY IF EXISTS "field_library_tenant_isolation" ON field_library;

-- Drop foreign key constraints from dependent tables
ALTER TABLE form_field_instances DROP CONSTRAINT IF EXISTS form_field_instances_field_library_id_fkey;

-- Drop the field_library table
DROP TABLE IF EXISTS field_library CASCADE;

-- Drop the backup table if it exists
DROP TABLE IF EXISTS field_library_backup CASCADE;

-- Update form_field_instances table to remove field_library_id column
ALTER TABLE form_field_instances DROP COLUMN IF EXISTS field_library_id CASCADE;