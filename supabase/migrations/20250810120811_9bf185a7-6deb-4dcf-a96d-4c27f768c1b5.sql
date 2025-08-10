-- Create event_forms table for event-form associations
CREATE TABLE IF NOT EXISTS event_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  form_id UUID NOT NULL,
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

CREATE POLICY "event_forms_tenant_isolation" ON event_forms
FOR ALL USING (tenant_id = get_current_tenant_id());

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_event_forms_updated_at ON event_forms;
CREATE TRIGGER update_event_forms_updated_at
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
  END IF;
END $$;