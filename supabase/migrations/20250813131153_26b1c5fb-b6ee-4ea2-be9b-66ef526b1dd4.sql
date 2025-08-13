-- Create RLS policies for word-templates storage bucket

-- Policy to allow authenticated users to upload their own templates
CREATE POLICY "Users can upload their own word templates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'word-templates' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = get_current_tenant_id()::text
);

-- Policy to allow users to view their own templates
CREATE POLICY "Users can view their own word templates" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'word-templates' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = get_current_tenant_id()::text
);

-- Policy to allow users to update/replace their own templates
CREATE POLICY "Users can update their own word templates" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'word-templates' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = get_current_tenant_id()::text
);

-- Policy to allow users to delete their own templates
CREATE POLICY "Users can delete their own word templates" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'word-templates' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = get_current_tenant_id()::text
);