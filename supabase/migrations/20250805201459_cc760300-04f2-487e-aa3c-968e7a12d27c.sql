-- Create event_forms table for multi-form support
CREATE TABLE public.event_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  form_template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  form_label TEXT NOT NULL DEFAULT 'Form',
  tab_order INTEGER NOT NULL DEFAULT 1,
  form_responses JSONB DEFAULT '{}',
  form_total NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT event_forms_tenant_event_order_unique UNIQUE(tenant_id, event_id, tab_order)
);

-- Enable RLS
ALTER TABLE public.event_forms ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant isolation
CREATE POLICY "tenant_isolation_policy" ON public.event_forms
  FOR ALL
  USING (
    (auth.uid() IS NOT NULL) AND 
    (is_super_admin() OR (tenant_id = get_current_tenant_id()))
  );

-- Create indexes for performance
CREATE INDEX idx_event_forms_tenant_id ON public.event_forms(tenant_id);
CREATE INDEX idx_event_forms_event_id ON public.event_forms(event_id);
CREATE INDEX idx_event_forms_tab_order ON public.event_forms(event_id, tab_order);

-- Create trigger for updated_at
CREATE TRIGGER update_event_forms_updated_at
  BEFORE UPDATE ON public.event_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for activity logging
CREATE TRIGGER log_event_forms_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.event_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.log_activity();

-- Function to calculate event form total
CREATE OR REPLACE FUNCTION public.calculate_event_form_total(p_event_form_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total DECIMAL(10,2) := 0;
  responses JSONB;
  field_data JSONB;
BEGIN
  SELECT form_responses INTO responses
  FROM event_forms
  WHERE id = p_event_form_id;
  
  IF responses IS NULL THEN
    RETURN 0;
  END IF;
  
  FOR field_data IN SELECT value FROM jsonb_each(responses)
  LOOP
    IF (field_data->>'enabled')::boolean = true 
       AND field_data->>'price' IS NOT NULL THEN
      total := total + (field_data->>'price')::decimal;
    END IF;
  END LOOP;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update event totals when form changes
CREATE OR REPLACE FUNCTION public.update_event_totals_from_forms()
RETURNS TRIGGER AS $$
DECLARE
  total_form_amount DECIMAL(10,2);
  p_event_id UUID;
BEGIN
  -- Get event_id from NEW or OLD record
  IF TG_OP = 'DELETE' THEN
    p_event_id := OLD.event_id;
  ELSE
    p_event_id := NEW.event_id;
  END IF;
  
  -- Calculate total from all active event forms
  SELECT COALESCE(SUM(form_total), 0) INTO total_form_amount
  FROM event_forms 
  WHERE event_id = p_event_id AND is_active = true;
  
  -- Update the event's form_total
  UPDATE events 
  SET 
    form_total = total_form_amount,
    updated_at = NOW()
  WHERE id = p_event_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update event totals
CREATE TRIGGER update_event_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.event_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_totals_from_forms();

-- Migration function to convert existing single forms to multi-form structure
CREATE OR REPLACE FUNCTION public.migrate_existing_single_forms()
RETURNS INTEGER AS $$
DECLARE
  event_record RECORD;
  migrated_count INTEGER := 0;
BEGIN
  -- Migrate events that have form_template_used but no event_forms entries
  FOR event_record IN 
    SELECT id, tenant_id, form_template_used, form_responses, form_total
    FROM events 
    WHERE form_template_used IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM event_forms WHERE event_id = events.id
    )
  LOOP
    -- Create event_form entry for existing form
    INSERT INTO event_forms (
      tenant_id,
      event_id,
      form_template_id,
      form_label,
      tab_order,
      form_responses,
      form_total,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      event_record.tenant_id,
      event_record.id,
      event_record.form_template_used,
      'Main Form',
      1,
      COALESCE(event_record.form_responses, '{}'),
      COALESCE(event_record.form_total, 0),
      true,
      NOW(),
      NOW()
    );
    
    migrated_count := migrated_count + 1;
  END LOOP;
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the migration
SELECT public.migrate_existing_single_forms() as migrated_events_count;