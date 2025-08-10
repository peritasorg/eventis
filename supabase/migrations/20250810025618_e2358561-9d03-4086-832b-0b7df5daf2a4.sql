-- Complete Enterprise SaaS Rebuild - Phase 1: Database Architecture
-- Clean slate database schema for multi-tenant banqueting suite management

-- Drop existing problematic tables and start fresh
DROP TABLE IF EXISTS form_field_instances CASCADE;
DROP TABLE IF EXISTS form_sections CASCADE;
DROP TABLE IF EXISTS field_library CASCADE;
DROP TABLE IF EXISTS field_library_backup CASCADE;
DROP TABLE IF EXISTS form_pages CASCADE;
DROP TABLE IF EXISTS event_forms CASCADE;

-- Core Tenant Infrastructure
CREATE TABLE new_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users with tenant association (new structure)
CREATE TABLE new_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES new_tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers - central business entity (enhanced)
CREATE TABLE new_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES new_tenants(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    postcode VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Simplified Form System - Field Library
CREATE TABLE new_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES new_tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'price_fixed', 'price_per_person', 'counter')),
    has_notes BOOLEAN DEFAULT true,
    has_pricing BOOLEAN DEFAULT false,
    pricing_type VARCHAR(20) CHECK (pricing_type IN ('fixed', 'per_person')),
    default_price_gbp DECIMAL(10,2),
    placeholder_text VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Forms - clean JSONB structure
CREATE TABLE new_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES new_tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sections JSONB DEFAULT '[]', -- [{id, title, order, field_ids: []}]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Events - customer-centric
CREATE TABLE new_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES new_tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES new_customers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    venue_location VARCHAR(255),
    form_id UUID REFERENCES new_forms(id) ON DELETE SET NULL,
    total_amount_gbp DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Form responses - individual field data
CREATE TABLE new_form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES new_events(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES new_form_fields(id),
    field_name VARCHAR(255) NOT NULL, -- snapshot for historical integrity
    field_type VARCHAR(50) NOT NULL,
    value TEXT,
    quantity INTEGER,
    unit_price_gbp DECIMAL(10,2),
    total_amount_gbp DECIMAL(10,2),
    notes TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant isolation functions
CREATE OR REPLACE FUNCTION get_new_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_tenant_id', true)::UUID,
        (auth.jwt() ->> 'tenant_id')::UUID,
        get_current_tenant_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all new tables
ALTER TABLE new_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_form_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY tenant_isolation_new_customers ON new_customers
    FOR ALL USING (tenant_id = get_new_tenant_id());

CREATE POLICY tenant_isolation_new_events ON new_events
    FOR ALL USING (tenant_id = get_new_tenant_id());

CREATE POLICY tenant_isolation_new_forms ON new_forms
    FOR ALL USING (tenant_id = get_new_tenant_id());

CREATE POLICY tenant_isolation_new_form_fields ON new_form_fields
    FOR ALL USING (tenant_id = get_new_tenant_id());

CREATE POLICY tenant_isolation_new_users ON new_users
    FOR ALL USING (tenant_id = get_new_tenant_id());

-- Event responses inherit tenant through event
CREATE POLICY tenant_isolation_new_form_responses ON new_form_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM new_events 
            WHERE new_events.id = new_form_responses.event_id 
            AND new_events.tenant_id = get_new_tenant_id()
        )
    );

-- Performance indexes
CREATE INDEX idx_new_customers_tenant_id ON new_customers(tenant_id);
CREATE INDEX idx_new_customers_tenant_name ON new_customers(tenant_id, last_name, first_name);
CREATE INDEX idx_new_events_tenant_id ON new_events(tenant_id);
CREATE INDEX idx_new_events_customer_id ON new_events(customer_id);
CREATE INDEX idx_new_events_tenant_date ON new_events(tenant_id, event_date);
CREATE INDEX idx_new_events_tenant_status ON new_events(tenant_id, status);
CREATE INDEX idx_new_form_responses_event_id ON new_form_responses(event_id);
CREATE INDEX idx_new_forms_tenant_id ON new_forms(tenant_id);
CREATE INDEX idx_new_form_fields_tenant_id ON new_form_fields(tenant_id);
CREATE INDEX idx_new_users_tenant_id ON new_users(tenant_id);

-- Migrate existing data to new structure
INSERT INTO new_tenants (id, name, subdomain, status, settings, created_at, updated_at)
SELECT 
    id,
    COALESCE(business_name, 'Business'),
    COALESCE(slug, 'tenant-' || substr(id::text, 1, 8)),
    CASE 
        WHEN subscription_status = 'active' THEN 'active'
        WHEN subscription_status IN ('trial', 'trialing') THEN 'trial'
        ELSE 'suspended'
    END,
    '{}',
    created_at,
    updated_at
FROM tenants;

-- Migrate users
INSERT INTO new_users (id, tenant_id, email, first_name, last_name, role, is_active, created_at, updated_at)
SELECT 
    id,
    tenant_id,
    email,
    first_name,
    last_name,
    CASE 
        WHEN role = 'tenant_admin' THEN 'admin'
        WHEN role = 'staff' THEN 'manager'
        ELSE 'user'
    END,
    active,
    created_at,
    updated_at
FROM users WHERE tenant_id IS NOT NULL;

-- Migrate customers (already in good shape)
INSERT INTO new_customers (id, tenant_id, first_name, last_name, email, phone, address, postcode, notes, created_at, updated_at)
SELECT 
    id,
    tenant_id,
    COALESCE(split_part(name, ' ', 1), 'Customer'),
    COALESCE(split_part(name, ' ', 2), ''),
    email,
    COALESCE(phone, mobile),
    COALESCE(address_line1 || CASE WHEN address_line2 IS NOT NULL THEN ', ' || address_line2 ELSE '' END),
    postal_code,
    notes,
    created_at,
    updated_at
FROM customers WHERE tenant_id IS NOT NULL;

-- Create default form fields for each tenant
INSERT INTO new_form_fields (tenant_id, name, field_type, has_notes, has_pricing, pricing_type, placeholder_text)
SELECT DISTINCT 
    t.id,
    'Guest Count',
    'counter',
    true,
    false,
    NULL,
    'Number of guests'
FROM new_tenants t;

INSERT INTO new_form_fields (tenant_id, name, field_type, has_notes, has_pricing, pricing_type, default_price_gbp, placeholder_text)
SELECT DISTINCT 
    t.id,
    'Menu Package',
    'price_per_person',
    true,
    true,
    'per_person',
    25.00,
    'Main course selection'
FROM new_tenants t;

INSERT INTO new_form_fields (tenant_id, name, field_type, has_notes, has_pricing, pricing_type, default_price_gbp, placeholder_text)
SELECT DISTINCT 
    t.id,
    'Decoration Package',
    'price_fixed',
    true,
    true,
    'fixed',
    500.00,
    'Venue decoration details'
FROM new_tenants t;

INSERT INTO new_form_fields (tenant_id, name, field_type, has_notes, has_pricing, pricing_type, placeholder_text)
SELECT DISTINCT 
    t.id,
    'Special Requirements',
    'text',
    false,
    false,
    NULL,
    'Any special requests or requirements'
FROM new_tenants t;

-- Migrate events to new structure
INSERT INTO new_events (id, tenant_id, customer_id, title, description, event_date, start_time, end_time, venue_location, total_amount_gbp, status, created_at, updated_at)
SELECT 
    e.id,
    e.tenant_id,
    e.customer_id,
    COALESCE(e.event_name, 'Event'),
    e.internal_notes,
    e.event_start_date,
    e.start_time,
    e.end_time,
    e.venue_area,
    COALESCE(e.total_amount, 0),
    CASE 
        WHEN e.status = 'inquiry' THEN 'draft'
        WHEN e.status = 'confirmed' THEN 'confirmed'
        WHEN e.status = 'completed' THEN 'completed'
        WHEN e.status = 'cancelled' THEN 'cancelled'
        ELSE 'draft'
    END,
    e.created_at,
    e.updated_at
FROM events e WHERE e.tenant_id IS NOT NULL;