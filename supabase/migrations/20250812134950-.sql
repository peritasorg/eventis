-- Add columns to event_forms table for multi-form event workflow
ALTER TABLE event_forms 
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME,
ADD COLUMN guest_count INTEGER DEFAULT 0,
ADD COLUMN guest_price_total NUMERIC(10,2) DEFAULT 0,
ADD COLUMN form_order INTEGER DEFAULT 1;

-- Add constraint to ensure max 2 forms per event
ALTER TABLE event_forms 
ADD CONSTRAINT max_forms_per_event 
CHECK (
  (SELECT COUNT(*) FROM event_forms ef WHERE ef.event_id = event_forms.event_id AND ef.is_active = true) <= 2
);

-- Update existing event_forms to have form_order
UPDATE event_forms SET form_order = tab_order WHERE form_order IS NULL;