-- Check if event_forms table exists, if not create it for event-form associations
CREATE TABLE IF NOT EXISTS event_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_id UUID NOT NULL,
  form_id UUID NOT NULL REFERENCES forms(id),
  form_label TEXT NOT NULL DEFAULT 'Main Form',
  tab_order INTEGER NOT NULL DEFAULT 1,
  form_responses JSONB DEFAULT '{}',
  form_total NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy for event_forms
ALTER TABLE event_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "event_forms_tenant_isolation" ON event_forms
FOR ALL USING (tenant_id = get_current_tenant_id());

-- Create trigger to update updated_at
CREATE OR REPLACE TRIGGER update_event_forms_updated_at
BEFORE UPDATE ON event_forms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Update event_type_form_mappings to reference forms instead of form_templates
DO $$
BEGIN
  -- Check if the column exists and rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_type_form_mappings' 
    AND column_name = 'form_template_id'
  ) THEN
    ALTER TABLE event_type_form_mappings 
    RENAME COLUMN form_template_id TO form_id;
    
    -- Update the foreign key constraint
    ALTER TABLE event_type_form_mappings 
    DROP CONSTRAINT IF EXISTS event_type_form_mappings_form_template_id_fkey;
    
    ALTER TABLE event_type_form_mappings 
    ADD CONSTRAINT event_type_form_mappings_form_id_fkey 
    FOREIGN KEY (form_id) REFERENCES forms(id);
  END IF;
END $$;