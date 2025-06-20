
-- Fix infinite recursion in RLS policies by using security definer functions

-- First, drop all problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can update their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can access leads from their tenant" ON leads;
DROP POLICY IF EXISTS "Users can access events from their tenant" ON events;
DROP POLICY IF EXISTS "Users can access customers from their tenant" ON customers;
DROP POLICY IF EXISTS "Users can access form templates from their tenant" ON form_templates;
DROP POLICY IF EXISTS "Users can access field library from their tenant" ON field_library;
DROP POLICY IF EXISTS "Users can access form pages from their tenant" ON form_pages;
DROP POLICY IF EXISTS "Users can access form sections from their tenant" ON form_sections;
DROP POLICY IF EXISTS "Users can access form field instances from their tenant" ON form_field_instances;
DROP POLICY IF EXISTS "Users can access event responses from their tenant" ON event_responses;
DROP POLICY IF EXISTS "Users can access quotes invoices from their tenant" ON quotes_invoices;
DROP POLICY IF EXISTS "Users can access payment history from their tenant" ON payment_history;
DROP POLICY IF EXISTS "Users can access tenant settings from their tenant" ON tenant_settings;
DROP POLICY IF EXISTS "Users can access staff from their tenant" ON staff;
DROP POLICY IF EXISTS "Users can access activity logs from their tenant" ON activity_logs;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM auth.users 
  JOIN public.users ON auth.users.id = public.users.id 
  WHERE auth.users.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT user_uuid = auth.uid();
$$;

-- Recreate users table policies using security definer functions
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (public.is_current_user(id));

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (public.is_current_user(id));

-- Recreate tenants table policies
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (id = public.get_current_user_tenant_id());

CREATE POLICY "Users can update their own tenant"
  ON tenants FOR UPDATE
  USING (id = public.get_current_user_tenant_id());

-- Recreate all other table policies using the security definer function
CREATE POLICY "Users can access leads from their tenant"
  ON leads FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access events from their tenant"
  ON events FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access customers from their tenant"
  ON customers FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access form templates from their tenant"
  ON form_templates FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access field library from their tenant"
  ON field_library FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access form pages from their tenant"
  ON form_pages FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access form sections from their tenant"
  ON form_sections FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access form field instances from their tenant"
  ON form_field_instances FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access event responses from their tenant"
  ON event_responses FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access quotes invoices from their tenant"
  ON quotes_invoices FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access payment history from their tenant"
  ON payment_history FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access tenant settings from their tenant"
  ON tenant_settings FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access staff from their tenant"
  ON staff FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can access activity logs from their tenant"
  ON activity_logs FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

-- Update the user registration function to avoid RLS issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create tenant for new user (assuming they're the business owner)
  INSERT INTO public.tenants (
    id, 
    business_name, 
    slug, 
    contact_email,
    subscription_status,
    trial_ends_at
  ) VALUES (
    gen_random_uuid(),
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
    COALESCE(NEW.raw_user_meta_data->>'slug', lower(replace(NEW.email, '@', '-at-'))),
    NEW.email,
    'trial',
    now() + interval '14 days'
  );
  
  -- Create user profile
  INSERT INTO public.users (
    id,
    tenant_id,
    email,
    full_name,
    first_name,
    last_name,
    role,
    active,
    email_verified
  ) VALUES (
    NEW.id,
    (SELECT id FROM tenants WHERE contact_email = NEW.email ORDER BY created_at DESC LIMIT 1),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'admin',
    true,
    NEW.email_confirmed_at IS NOT NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
