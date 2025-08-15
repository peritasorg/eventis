-- Add dual deposit system to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS refundable_deposit_gbp NUMERIC DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deductible_deposit_gbp NUMERIC DEFAULT 0;

-- Update existing events to migrate current deposit_amount_gbp to deductible_deposit_gbp
UPDATE events 
SET deductible_deposit_gbp = COALESCE(deposit_amount_gbp, 0),
    refundable_deposit_gbp = 0
WHERE deductible_deposit_gbp IS NULL OR deductible_deposit_gbp = 0;

-- Add external_calendar_id column to events table for calendar sync
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_calendar_id TEXT;

-- Add index for external_calendar_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_external_calendar_id ON events(external_calendar_id);