-- Fix field_types table to use correct field type values that match the check constraint
UPDATE field_types SET name = 'checkbox' WHERE name = 'checkbox_field';
UPDATE field_types SET name = 'number' WHERE name = 'counter_field';
UPDATE field_types SET name = 'date' WHERE name = 'date_field';
UPDATE field_types SET name = 'number' WHERE name = 'guest_count';
UPDATE field_types SET name = 'select' WHERE name = 'menu_item';
UPDATE field_types SET name = 'number' WHERE name = 'per_person_price';
UPDATE field_types SET name = 'number' WHERE name = 'price';
UPDATE field_types SET name = 'number' WHERE name = 'price_field';
UPDATE field_types SET name = 'number' WHERE name = 'quantity';
UPDATE field_types SET name = 'select' WHERE name = 'select_field';
UPDATE field_types SET name = 'select' WHERE name = 'service_field';
UPDATE field_types SET name = 'text' WHERE name = 'text_field';
UPDATE field_types SET name = 'textarea' WHERE name = 'textarea_field';
UPDATE field_types SET name = 'time' WHERE name = 'time_field';

-- Remove any duplicates that might have been created
DELETE FROM field_types a USING field_types b 
WHERE a.id > b.id 
AND a.name = b.name;