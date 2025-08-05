-- Fix events_status_check constraint to include all valid status values
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Add new constraint with all valid event status values
ALTER TABLE events ADD CONSTRAINT events_status_check 
CHECK (status IN ('inquiry', 'quote_sent', 'confirmed', 'cancelled', 'completed', 'active', 'inactive'));