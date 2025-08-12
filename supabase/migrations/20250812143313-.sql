-- Add men_count and ladies_count to event_forms table
ALTER TABLE event_forms 
ADD COLUMN men_count INTEGER DEFAULT 0,
ADD COLUMN ladies_count INTEGER DEFAULT 0;