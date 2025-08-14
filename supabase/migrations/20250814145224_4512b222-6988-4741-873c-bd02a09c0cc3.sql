-- Add available_time_slots column to event_type_configs table
ALTER TABLE public.event_type_configs 
ADD COLUMN available_time_slots jsonb DEFAULT '[]'::jsonb;