-- Create proper field library infrastructure with tenant isolation
-- This replaces the current form_fields approach with a more robust structure

-- 1. Create field_library table (main repository of reusable fields)
CREATE TABLE public.field_library (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Internal field name (unique per tenant)
    label TEXT NOT NULL, -- Display name for the field
    field_type TEXT NOT NULL REFERENCES public.field_types(name) ON DELETE RESTRICT,
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    help_text TEXT,
    placeholder_text TEXT,
    required BOOLEAN NOT NULL DEFAULT false,
    
    -- Pricing configuration
    has_pricing BOOLEAN NOT NULL DEFAULT false,
    pricing_behavior TEXT CHECK (pricing_behavior IN ('none', 'fixed', 'per_person', 'quantity_based')) DEFAULT 'none',
    unit_price DECIMAL(10,2),
    affects_pricing BOOLEAN NOT NULL DEFAULT false,
    
    -- Quantity configuration
    has_quantity BOOLEAN NOT NULL DEFAULT false,
    min_quantity INTEGER,
    max_quantity INTEGER,
    default_quantity INTEGER DEFAULT 1,
    
    -- Dropdown options (for select/radio/checkbox fields)
    dropdown_options JSONB DEFAULT '[]'::jsonb,
    
    -- Notes configuration
    has_notes BOOLEAN NOT NULL DEFAULT true,
    
    -- Field configuration from field_types.default_config
    field_config JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure unique field names per tenant
    UNIQUE(tenant_id, name)
);

-- 2. Create form_sections table (replaces JSON sections in forms)
CREATE TABLE public.form_sections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    section_title TEXT NOT NULL,
    section_description TEXT,
    section_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure unique section order per form
    UNIQUE(form_id, section_order)
);

-- 3. Create form_field_instances table (links sections to field library)
CREATE TABLE public.form_field_instances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES public.form_sections(id) ON DELETE CASCADE,
    field_library_id UUID NOT NULL REFERENCES public.field_library(id) ON DELETE CASCADE,
    field_order INTEGER NOT NULL DEFAULT 0,
    
    -- Override configurations (optional - inherits from field_library if null)
    override_label TEXT,
    override_required BOOLEAN,
    override_help_text TEXT,
    override_placeholder TEXT,
    override_config JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure unique field order per section
    UNIQUE(section_id, field_order)
);

-- Enable RLS on all new tables
ALTER TABLE public.field_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_field_instances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for field_library
CREATE POLICY "field_library_tenant_isolation" ON public.field_library
    FOR ALL USING (tenant_id = get_current_tenant_id());

-- Create RLS policies for form_sections
CREATE POLICY "form_sections_tenant_isolation" ON public.form_sections
    FOR ALL USING (tenant_id = get_current_tenant_id());

-- Create RLS policies for form_field_instances
CREATE POLICY "form_field_instances_tenant_isolation" ON public.form_field_instances
    FOR ALL USING (tenant_id = get_current_tenant_id());

-- Create indexes for performance
CREATE INDEX idx_field_library_tenant_category ON public.field_library(tenant_id, category) WHERE active = true;
CREATE INDEX idx_field_library_tenant_type ON public.field_library(tenant_id, field_type) WHERE active = true;
CREATE INDEX idx_form_sections_form_order ON public.form_sections(form_id, section_order);
CREATE INDEX idx_form_field_instances_section_order ON public.form_field_instances(section_id, field_order);
CREATE INDEX idx_form_field_instances_form ON public.form_field_instances(form_id);

-- Create triggers for updated_at
CREATE TRIGGER update_field_library_updated_at
    BEFORE UPDATE ON public.field_library
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_form_sections_updated_at
    BEFORE UPDATE ON public.form_sections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_form_field_instances_updated_at
    BEFORE UPDATE ON public.form_field_instances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create validation trigger for field_library pricing configuration
CREATE TRIGGER validate_field_library_pricing_config
    BEFORE INSERT OR UPDATE ON public.field_library
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_field_pricing_config();

-- Create function to migrate existing form_fields to field_library
CREATE OR REPLACE FUNCTION public.migrate_form_fields_to_library()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    migrated_count INTEGER := 0;
    field_record RECORD;
    new_field_id UUID;
BEGIN
    -- Migrate existing form_fields to field_library
    FOR field_record IN 
        SELECT * FROM form_fields WHERE is_active = true
    LOOP
        -- Insert into field_library
        INSERT INTO field_library (
            tenant_id,
            name,
            label,
            field_type,
            category,
            description,
            help_text,
            placeholder_text,
            required,
            has_pricing,
            pricing_behavior,
            unit_price,
            affects_pricing,
            has_quantity,
            dropdown_options,
            has_notes,
            sort_order,
            active,
            created_at,
            updated_at
        ) VALUES (
            field_record.tenant_id,
            LOWER(REPLACE(field_record.name, ' ', '_')), -- Convert to snake_case
            field_record.name, -- Use original name as label
            field_record.field_type,
            'migrated', -- Category for migrated fields
            NULL, -- No description in old structure
            field_record.help_text,
            field_record.placeholder_text,
            false, -- Default to not required
            field_record.has_pricing,
            CASE 
                WHEN field_record.has_pricing AND field_record.pricing_type IS NOT NULL 
                THEN field_record.pricing_type::text
                ELSE 'none'
            END,
            field_record.default_price_gbp,
            field_record.has_pricing,
            false, -- Default to no quantity
            COALESCE(field_record.dropdown_options, '[]'::jsonb),
            field_record.has_notes,
            0, -- Default sort order
            field_record.is_active,
            field_record.created_at,
            field_record.updated_at
        ) RETURNING id INTO new_field_id;
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN migrated_count;
END;
$function$;