-- Fix security warning: Enable RLS on field_types table
ALTER TABLE field_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for field_types table (public read access since these are universal field types)
CREATE POLICY "Public read access to field types" 
ON field_types FOR SELECT 
USING (active = true);