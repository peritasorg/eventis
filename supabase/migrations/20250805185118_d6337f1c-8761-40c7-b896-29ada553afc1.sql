-- Fix security issue: Enable RLS on the backup table
ALTER TABLE field_library_backup ENABLE ROW LEVEL SECURITY;

-- Create policy for the backup table to match field_library
CREATE POLICY "tenant_isolation_policy" ON field_library_backup
FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  (is_super_admin() OR tenant_id = get_current_tenant_id())
);