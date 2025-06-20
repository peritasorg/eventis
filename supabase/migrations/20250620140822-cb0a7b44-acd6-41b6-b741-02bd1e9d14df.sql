
-- First, drop any existing problematic policies on the users table
DROP POLICY IF EXISTS "user_access_control" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create a simple, non-recursive policy for users table
-- Users can only see and update their own profile based on auth.uid()
CREATE POLICY "Users can access own profile" ON public.users
  FOR ALL USING (auth.uid() = id);

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Also check and fix tenants table policies to avoid similar issues
DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.tenants;

-- Simple tenant access policy
CREATE POLICY "Users can access their tenant" ON public.tenants
  FOR ALL USING (
    id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Ensure RLS is enabled on tenants table
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
