-- Drop existing constraint that only allows 'note' and 'payment'
ALTER TABLE event_communications DROP CONSTRAINT IF EXISTS event_communications_communication_type_check;

-- Add new constraint with all valid communication types used in the frontend
ALTER TABLE event_communications ADD CONSTRAINT event_communications_communication_type_check 
CHECK (communication_type IN ('note', 'payment', 'phone', 'email', 'meeting', 'whatsapp', 'other'));