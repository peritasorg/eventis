-- Update all storage policies to handle both regular and specification templates

-- Update DELETE policy
DROP POLICY IF EXISTS "Users can delete word templates" ON storage.objects;
CREATE POLICY "Users can delete word templates" ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'word-templates' 
  AND auth.uid() IS NOT NULL 
  AND (
    name ~~ (auth.uid()::text || '-%') 
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND (
        objects.name ~~ (u.tenant_id::text || '-template.docx') 
        OR objects.name ~~ (u.tenant_id::text || '-specification-template.docx')
      )
    )
  )
);

-- Update UPDATE policy  
DROP POLICY IF EXISTS "Users can update word templates" ON storage.objects;
CREATE POLICY "Users can update word templates" ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'word-templates' 
  AND auth.uid() IS NOT NULL 
  AND (
    name ~~ (auth.uid()::text || '-%') 
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND (
        objects.name ~~ (u.tenant_id::text || '-template.docx') 
        OR objects.name ~~ (u.tenant_id::text || '-specification-template.docx')
      )
    )
  )
);

-- Update SELECT policy
DROP POLICY IF EXISTS "Users can view word templates" ON storage.objects;
CREATE POLICY "Users can view word templates" ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'word-templates' 
  AND auth.uid() IS NOT NULL 
  AND (
    name ~~ (auth.uid()::text || '-%') 
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND (
        objects.name ~~ (u.tenant_id::text || '-template.docx') 
        OR objects.name ~~ (u.tenant_id::text || '-specification-template.docx')
      )
    )
  )
);