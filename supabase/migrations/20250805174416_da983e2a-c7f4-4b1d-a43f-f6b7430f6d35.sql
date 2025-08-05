-- Remove any existing check constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Update all events to have either 'active' or 'inactive' status based on event end datetime
UPDATE events 
SET status = CASE 
  WHEN event_end_date IS NULL OR event_end_date < CURRENT_DATE 
    OR (event_end_date = CURRENT_DATE AND end_time < CURRENT_TIME) 
  THEN 'inactive'
  ELSE 'active'
END;

-- Add the new check constraint that only allows 'active' or 'inactive'
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('active', 'inactive'));