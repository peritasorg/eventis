-- Update the INSERT policy for word templates to allow both regular and specification templates
DROP POLICY IF EXISTS "Users can upload word templates" ON storage.objects;

CREATE POLICY "Users can upload word templates" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'word-templates' 
  AND auth.uid() IS NOT NULL 
  AND (
    -- Allow regular template pattern: {tenant-id}-template.docx
    name ~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}-template\.docx$'
    OR
    -- Allow specification template pattern: {tenant-id}-specification-template.docx
    name ~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}-specification-template\.docx$'
  )
);