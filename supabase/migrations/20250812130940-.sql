-- Add date change tracking columns to events table
ALTER TABLE public.events 
ADD COLUMN original_event_date date,
ADD COLUMN date_changed_at timestamp with time zone;

-- Set initial values for existing events
UPDATE public.events 
SET original_event_date = event_date
WHERE original_event_date IS NULL;