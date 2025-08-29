-- Add audit trail fields to existing event_communications table
ALTER TABLE public.event_communications 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS edited_by UUID,
ADD COLUMN IF NOT EXISTS edit_reason TEXT,
ADD COLUMN IF NOT EXISTS original_note TEXT;

-- Drop the unnecessary communication_timeline table
DROP TABLE IF EXISTS public.communication_timeline;