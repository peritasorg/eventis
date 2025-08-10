-- Clean up duplicate event_forms and add unique constraint
DELETE FROM event_forms 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id, form_id ORDER BY created_at DESC) as rn
    FROM event_forms
  ) t WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE event_forms 
ADD CONSTRAINT unique_event_form_per_event 
UNIQUE (event_id, form_id) 
WHERE is_active = true;