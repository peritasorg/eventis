-- Add status field to events table
ALTER TABLE public.events 
ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Add check constraint for valid status values
ALTER TABLE public.events 
ADD CONSTRAINT events_status_check 
CHECK (status IN ('active', 'cancelled'));

-- Add index for performance
CREATE INDEX idx_events_status ON public.events(status);

-- Update existing events to have active status (already default, but explicit)
UPDATE public.events 
SET status = 'active' 
WHERE status IS NULL;