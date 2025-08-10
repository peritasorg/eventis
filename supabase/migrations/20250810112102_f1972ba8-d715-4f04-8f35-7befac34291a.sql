-- Add event_type column to events table
ALTER TABLE events ADD COLUMN event_type VARCHAR(100);

-- Change ethnicity from single to multiple selection
ALTER TABLE events ALTER COLUMN ethnicity TYPE JSONB USING 
  CASE 
    WHEN ethnicity IS NULL OR ethnicity = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(ethnicity)
  END;

-- Create price warning rules table
CREATE TABLE price_warning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  condition_type VARCHAR(20) NOT NULL, -- 'gt', 'lt', 'eq', 'between'
  condition_value DECIMAL(10,2),
  condition_value_max DECIMAL(10,2), -- for 'between'
  warning_color VARCHAR(7) NOT NULL, -- hex color
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calendar warning settings table  
CREATE TABLE calendar_warning_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  warning_days_threshold INTEGER DEFAULT 7,
  warning_message TEXT DEFAULT 'Event approaching soon',
  warning_color VARCHAR(7) DEFAULT '#F59E0B',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE price_warning_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_warning_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for price_warning_rules
CREATE POLICY "tenant_isolation_policy" ON price_warning_rules
FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  (is_super_admin() OR tenant_id = get_current_tenant_id())
);

-- Create RLS policies for calendar_warning_settings
CREATE POLICY "tenant_isolation_policy" ON calendar_warning_settings
FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  (is_super_admin() OR tenant_id = get_current_tenant_id())
);

-- Add triggers for updated_at
CREATE TRIGGER update_price_warning_rules_updated_at
  BEFORE UPDATE ON price_warning_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_warning_settings_updated_at
  BEFORE UPDATE ON calendar_warning_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();