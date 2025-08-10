-- Clean up duplicate event_forms
DELETE FROM event_forms 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id, form_id ORDER BY created_at DESC) as rn
    FROM event_forms
  ) t WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates  
CREATE UNIQUE INDEX unique_active_event_form 
ON event_forms (event_id, form_id) 
WHERE is_active = true;