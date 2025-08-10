-- Add event_end_date column to events table for multi-day event support
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_end_date date;