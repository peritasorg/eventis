-- Remove existing broken form tables
DROP TABLE IF EXISTS form_field_instances CASCADE;
DROP TABLE IF EXISTS form_sections CASCADE;
DROP TABLE IF EXISTS form_templates CASCADE;
DROP TABLE IF EXISTS field_library CASCADE;
DROP TABLE IF EXISTS event_forms CASCADE;

-- Keep new_form_* tables as they might have data, but we'll build the new system

-- Field library - tenant-specific reusable fields
CREATE TABLE form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'price_fixed', 'price_per_person', 'counter')),
    
    -- Field configuration
    has_notes BOOLEAN DEFAULT true,
    has_pricing BOOLEAN DEFAULT false,
    pricing_type VARCHAR(20) CHECK (pricing_type IN ('fixed', 'per_person')),
    default_price_gbp DECIMAL(10,2),
    placeholder_text VARCHAR(255),
    help_text VARCHAR(500),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique names per tenant
    UNIQUE(tenant_id, name)
);

-- Forms - simple structure with sections as JSONB
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Form structure stored as JSONB for flexibility
    sections JSONB DEFAULT '[]', -- [{id, title, order, field_ids: [uuid, uuid]}]
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique names per tenant
    UNIQUE(tenant_id, name)
);

-- Form responses - when forms are used in events
CREATE TABLE form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    form_id UUID NOT NULL,
    field_id UUID NOT NULL,
    
    -- Response data
    field_name VARCHAR(255) NOT NULL, -- snapshot for historical integrity
    field_type VARCHAR(50) NOT NULL,
    value TEXT,
    quantity INTEGER,
    unit_price_gbp DECIMAL(10,2),
    total_amount_gbp DECIMAL(10,2),
    notes TEXT,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add form reference to events table
ALTER TABLE events ADD COLUMN form_id UUID REFERENCES forms(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation_form_fields ON form_fields
    FOR ALL USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_forms ON forms
    FOR ALL USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_form_responses ON form_responses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM events WHERE events.id = form_responses.event_id 
                AND events.tenant_id = get_current_tenant_id())
    );

-- Performance indexes
CREATE INDEX idx_form_fields_tenant_id ON form_fields(tenant_id);
CREATE INDEX idx_form_fields_tenant_type ON form_fields(tenant_id, field_type);
CREATE INDEX idx_forms_tenant_id ON forms(tenant_id);
CREATE INDEX idx_form_responses_event_id ON form_responses(event_id);
CREATE INDEX idx_form_responses_form_id ON form_responses(form_id);

-- Updated at triggers
CREATE TRIGGER update_form_fields_updated_at
    BEFORE UPDATE ON form_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Foreign key constraints
ALTER TABLE form_responses ADD CONSTRAINT fk_form_responses_event_id 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE form_responses ADD CONSTRAINT fk_form_responses_form_id 
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
ALTER TABLE form_responses ADD CONSTRAINT fk_form_responses_field_id 
    FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE;