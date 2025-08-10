-- Phase 1: Drop Current Complex Tables
DROP TABLE IF EXISTS form_responses CASCADE;
DROP TABLE IF EXISTS event_responses CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- Phase 2: Build Correct Events Table (MVP Fields Only)
CREATE TABLE events (
    -- System fields (required for multi-tenancy)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- General section
    title VARCHAR(255) NOT NULL,
    event_date DATE,
    start_time TIME,
    end_time TIME,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    ethnicity VARCHAR(100),
    
    -- Contact section
    primary_contact_name VARCHAR(255),
    primary_contact_number VARCHAR(50),
    secondary_contact_name VARCHAR(255),
    secondary_contact_number VARCHAR(50),
    
    -- Guests section
    men_count INTEGER DEFAULT 0,
    ladies_count INTEGER DEFAULT 0,
    total_guest_count INTEGER GENERATED ALWAYS AS (COALESCE(men_count, 0) + COALESCE(ladies_count, 0)) STORED,
    
    -- Finances section
    total_guest_price_gbp DECIMAL(10,2) DEFAULT 0,
    form_total_gbp DECIMAL(10,2) DEFAULT 0,
    deposit_amount_gbp DECIMAL(10,2) DEFAULT 0,
    remaining_balance_gbp DECIMAL(10,2) GENERATED ALWAYS AS (
        COALESCE(total_guest_price_gbp, 0) + COALESCE(form_total_gbp, 0) - COALESCE(deposit_amount_gbp, 0)
    ) STORED,
    subtotal_gbp DECIMAL(10,2) GENERATED ALWAYS AS (
        COALESCE(total_guest_price_gbp, 0) + COALESCE(form_total_gbp, 0)
    ) STORED,
    
    -- Days left (calculated field)
    days_left INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN event_date IS NULL THEN NULL
            ELSE EXTRACT(DAY FROM (event_date - CURRENT_DATE))::INTEGER
        END
    ) STORED
);

-- Communications timeline table
CREATE TABLE event_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    communication_date DATE DEFAULT CURRENT_DATE,
    communication_type VARCHAR(50) DEFAULT 'note' CHECK (communication_type IN ('note', 'payment')),
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payment timeline table
CREATE TABLE event_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    payment_date DATE DEFAULT CURRENT_DATE,
    amount_gbp DECIMAL(10,2) NOT NULL,
    payment_note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Time range presets (configurable in /events settings)
CREATE TABLE event_time_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ethnicity options (configurable in /events settings)
CREATE TABLE event_ethnicity_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ethnicity_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_time_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_ethnicity_options ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation_events ON events
    FOR ALL USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_event_communications ON event_communications
    FOR ALL USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_event_payments ON event_payments
    FOR ALL USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_time_ranges ON event_time_ranges
    FOR ALL USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_ethnicity_options ON event_ethnicity_options
    FOR ALL USING (tenant_id = get_current_tenant_id());

-- Performance indexes
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_events_customer_id ON events(customer_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_event_communications_event_id ON event_communications(event_id);
CREATE INDEX idx_event_communications_tenant_id ON event_communications(tenant_id);
CREATE INDEX idx_event_payments_event_id ON event_payments(event_id);
CREATE INDEX idx_event_payments_tenant_id ON event_payments(tenant_id);
CREATE INDEX idx_event_time_ranges_tenant_id ON event_time_ranges(tenant_id);
CREATE INDEX idx_event_ethnicity_options_tenant_id ON event_ethnicity_options(tenant_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_time_ranges_updated_at BEFORE UPDATE ON event_time_ranges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_ethnicity_options_updated_at BEFORE UPDATE ON event_ethnicity_options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default time ranges and ethnicity options for existing tenants
INSERT INTO event_time_ranges (tenant_id, name, start_time, end_time) 
SELECT id, 'Morning Session', '09:00'::time, '13:00'::time FROM tenants WHERE active = true;

INSERT INTO event_time_ranges (tenant_id, name, start_time, end_time) 
SELECT id, 'Afternoon Session', '14:00'::time, '18:00'::time FROM tenants WHERE active = true;

INSERT INTO event_time_ranges (tenant_id, name, start_time, end_time) 
SELECT id, 'Evening Session', '18:00'::time, '23:00'::time FROM tenants WHERE active = true;

INSERT INTO event_time_ranges (tenant_id, name, start_time, end_time) 
SELECT id, 'All Day', '10:00'::time, '23:00'::time FROM tenants WHERE active = true;

INSERT INTO event_ethnicity_options (tenant_id, ethnicity_name) 
SELECT id, 'Asian' FROM tenants WHERE active = true;

INSERT INTO event_ethnicity_options (tenant_id, ethnicity_name) 
SELECT id, 'African' FROM tenants WHERE active = true;

INSERT INTO event_ethnicity_options (tenant_id, ethnicity_name) 
SELECT id, 'European' FROM tenants WHERE active = true;

INSERT INTO event_ethnicity_options (tenant_id, ethnicity_name) 
SELECT id, 'Mixed' FROM tenants WHERE active = true;