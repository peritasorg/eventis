-- Update all events to have either 'active' or 'inactive' status based on event end datetime
UPDATE events 
SET status = CASE 
  WHEN event_end_date < CURRENT_DATE 
    OR (event_end_date = CURRENT_DATE AND end_time < CURRENT_TIME) 
  THEN 'inactive'
  ELSE 'active'
END
WHERE status != 'inactive' OR status != 'active';