-- Fix the get_decrypted_token function security issue
CREATE OR REPLACE FUNCTION public.get_decrypted_token(encrypted_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- In production, implement proper encryption/decryption
  -- For now, return as-is (tokens should be encrypted at rest)
  RETURN encrypted_token;
END;
$$;