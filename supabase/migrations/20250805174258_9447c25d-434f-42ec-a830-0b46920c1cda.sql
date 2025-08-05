-- First, update all events to have either 'active' or 'inactive' status 
UPDATE events 
SET status = CASE 
  WHEN event_end_date < CURRENT_DATE 
    OR (event_end_date = CURRENT_DATE AND end_time < CURRENT_TIME) 
  THEN 'inactive'
  ELSE 'active'
END;

-- Then drop the existing check constraint and add the new one
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('active', 'inactive'));