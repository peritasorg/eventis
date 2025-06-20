
-- Fix RLS policies to allow proper data access for authenticated users

-- First, let's fix the leads table RLS policy
DROP POLICY IF EXISTS "Users can access leads from their tenant" ON leads;

CREATE POLICY "Users can access leads from their tenant"
  ON leads FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Fix other tables that might have similar issues
DROP POLICY IF EXISTS "Users can access events from their tenant" ON events;
CREATE POLICY "Users can access events from their tenant"
  ON events FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can access customers from their tenant" ON customers;
CREATE POLICY "Users can access customers from their tenant"  
  ON customers FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can access form templates from their tenant" ON form_templates;
CREATE POLICY "Users can access form templates from their tenant"
  ON form_templates FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can access field library from their tenant" ON field_library;
CREATE POLICY "Users can access field library from their tenant"
  ON field_library FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can access tenant settings from their tenant" ON tenant_settings;
CREATE POLICY "Users can access tenant settings from their tenant"
  ON tenant_settings FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Ensure users table has proper policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Ensure tenants table has proper policies  
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own tenant"
  ON tenants FOR UPDATE
  USING (id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
