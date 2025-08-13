-- Add company logo and invoice/quote appearance fields
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

ALTER TABLE field_library 
ADD COLUMN IF NOT EXISTS appears_on_quote BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS appears_on_invoice BOOLEAN DEFAULT false;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for company logos
CREATE POLICY "Company logos are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-logos');

CREATE POLICY "Users can upload their company logo" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their company logo" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their company logo" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);