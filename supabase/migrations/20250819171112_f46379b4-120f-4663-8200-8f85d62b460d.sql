-- Add the missing refundable_deposit_gbp column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS refundable_deposit_gbp NUMERIC DEFAULT 0;