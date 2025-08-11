-- Update calendar warning settings to ensure proper structure
-- Add any missing columns and update defaults

-- Make sure warning_message has a good default for unpaid balance warnings
UPDATE calendar_warning_settings 
SET warning_message = 'Event approaching with unpaid balance'
WHERE warning_message = 'Event approaching soon' OR warning_message IS NULL;

-- Set reasonable defaults for any settings without values
UPDATE calendar_warning_settings 
SET warning_days_threshold = 7 WHERE warning_days_threshold IS NULL;

UPDATE calendar_warning_settings 
SET warning_color = '#F59E0B' WHERE warning_color IS NULL;

UPDATE calendar_warning_settings 
SET is_active = true WHERE is_active IS NULL;