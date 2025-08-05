-- Clean up existing inactive forms (created before intentional save feature)
DELETE FROM event_forms WHERE is_active = false;

-- Create function to calculate total paid (deposit + finance timeline)
CREATE OR REPLACE FUNCTION calculate_total_paid(p_event_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deposit_amt NUMERIC := 0;
  timeline_total NUMERIC := 0;
BEGIN
  -- Get deposit amount
  SELECT COALESCE(deposit_amount, 0) INTO deposit_amt
  FROM events
  WHERE id = p_event_id;
  
  -- Get finance timeline total
  SELECT COALESCE(SUM(amount), 0) INTO timeline_total
  FROM finance_timeline
  WHERE event_id = p_event_id;
  
  RETURN deposit_amt + timeline_total;
END;
$$;

-- Create trigger to update payment status when deposit or finance records change
CREATE OR REPLACE FUNCTION update_event_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  p_event_id UUID;
  total_paid NUMERIC;
  total_amount NUMERIC;
BEGIN
  -- Get event_id from either table
  IF TG_TABLE_NAME = 'events' THEN
    p_event_id := COALESCE(NEW.id, OLD.id);
  ELSE
    p_event_id := COALESCE(NEW.event_id, OLD.event_id);
  END IF;
  
  -- Calculate totals
  total_paid := calculate_total_paid(p_event_id);
  
  SELECT COALESCE(total_amount, 0) INTO total_amount
  FROM events WHERE id = p_event_id;
  
  -- Update payment status
  UPDATE events SET
    deposit_paid = (total_paid >= COALESCE(deposit_amount, 0)),
    balance_cleared = (total_paid >= total_amount),
    balance_due = total_amount - total_paid,
    updated_at = NOW()
  WHERE id = p_event_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for automatic payment status updates
DROP TRIGGER IF EXISTS update_payment_status_on_deposit ON events;
CREATE TRIGGER update_payment_status_on_deposit
  AFTER UPDATE OF deposit_amount ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_event_payment_status();

DROP TRIGGER IF EXISTS update_payment_status_on_finance ON finance_timeline;
CREATE TRIGGER update_payment_status_on_finance
  AFTER INSERT OR UPDATE OR DELETE ON finance_timeline
  FOR EACH ROW
  EXECUTE FUNCTION update_event_payment_status();

-- Function to validate unique form templates per event
CREATE OR REPLACE FUNCTION validate_unique_form_template()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check for active forms
  IF NEW.is_active = true THEN
    IF EXISTS (
      SELECT 1 FROM event_forms 
      WHERE event_id = NEW.event_id 
        AND form_template_id = NEW.form_template_id 
        AND tenant_id = NEW.tenant_id
        AND is_active = true
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'This form template is already used in this event. Each event can only have one instance of each form template.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for form template uniqueness validation
DROP TRIGGER IF EXISTS validate_form_template_uniqueness ON event_forms;
CREATE TRIGGER validate_form_template_uniqueness
  BEFORE INSERT OR UPDATE ON event_forms
  FOR EACH ROW
  EXECUTE FUNCTION validate_unique_form_template();

-- Add partial unique index instead of constraint with WHERE clause
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_form_template_per_event 
ON event_forms (event_id, form_template_id, tenant_id) 
WHERE is_active = true;