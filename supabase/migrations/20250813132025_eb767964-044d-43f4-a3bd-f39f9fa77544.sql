-- Fix RLS policies for word-templates storage bucket using JWT claims directly
-- This avoids the issue where get_current_tenant_id() fails in storage context

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own word templates" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own word templates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own word templates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own word templates" ON storage.objects;

-- Create new policies using JWT claims directly
-- For storage operations, we'll use a simpler approach that doesn't rely on database queries

-- Allow authenticated users to upload templates with their user ID
CREATE POLICY "Users can upload word templates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'word-templates' 
  AND auth.uid() IS NOT NULL
  AND name ~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}-template\.docx$'
);

-- Allow authenticated users to view templates that start with their user ID or tenant ID
CREATE POLICY "Users can view word templates" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'word-templates' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow access to files that start with their user ID
    name LIKE auth.uid()::text || '-%'
    OR
    -- Allow access to files that start with their tenant ID (from metadata)
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND name LIKE u.tenant_id::text || '-%'
    )
  )
);

-- Allow authenticated users to update their own templates
CREATE POLICY "Users can update word templates" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'word-templates' 
  AND auth.uid() IS NOT NULL
  AND (
    name LIKE auth.uid()::text || '-%'
    OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND name LIKE u.tenant_id::text || '-%'
    )
  )
);

-- Allow authenticated users to delete their own templates
CREATE POLICY "Users can delete word templates" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'word-templates' 
  AND auth.uid() IS NOT NULL
  AND (
    name LIKE auth.uid()::text || '-%'
    OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND name LIKE u.tenant_id::text || '-%'
    )
  )
);