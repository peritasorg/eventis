
-- Enable RLS on all tenant-related tables and create policies

-- Tenants table policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Super admins can view all tenants"
  ON tenants FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- Users table policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Leads table policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access leads from their tenant"
  ON leads FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Events table policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access events from their tenant"
  ON events FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Customers table policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access customers from their tenant"
  ON customers FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Form templates table policies
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access form templates from their tenant"
  ON form_templates FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Field library table policies
ALTER TABLE field_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access field library from their tenant"
  ON field_library FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Form pages table policies
ALTER TABLE form_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access form pages from their tenant"
  ON form_pages FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Form sections table policies
ALTER TABLE form_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access form sections from their tenant"
  ON form_sections FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Form field instances table policies
ALTER TABLE form_field_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access form field instances from their tenant"
  ON form_field_instances FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Event responses table policies
ALTER TABLE event_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access event responses from their tenant"
  ON event_responses FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Quotes invoices table policies
ALTER TABLE quotes_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access quotes invoices from their tenant"
  ON quotes_invoices FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Payment history table policies
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access payment history from their tenant"
  ON payment_history FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Tenant settings table policies
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access tenant settings from their tenant"
  ON tenant_settings FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Staff table policies
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access staff from their tenant"
  ON staff FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Activity logs table policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access activity logs from their tenant"
  ON activity_logs FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Function to handle new user signup
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

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
