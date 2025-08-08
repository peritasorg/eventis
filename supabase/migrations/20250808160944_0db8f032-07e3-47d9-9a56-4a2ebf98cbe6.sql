-- Add is_all_day column to event_type_configs table
ALTER TABLE event_type_configs ADD COLUMN is_all_day BOOLEAN DEFAULT false;