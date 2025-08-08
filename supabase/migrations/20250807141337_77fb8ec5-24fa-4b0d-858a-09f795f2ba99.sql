-- Clean up all event-related data before fresh import
-- Delete in order to avoid foreign key constraints

-- Delete event forms first
DELETE FROM event_forms;

-- Delete communication timeline entries
DELETE FROM communication_timeline;

-- Delete finance timeline entries  
DELETE FROM finance_timeline;

-- Delete event staff assignments
DELETE FROM event_staff_assignments;

-- Delete event responses
DELETE FROM event_responses;

-- Finally delete all events
DELETE FROM events;