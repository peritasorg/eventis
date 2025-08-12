-- Add new field type: Toggle + Fixed Price with Quantity and Notes
INSERT INTO field_types (name, display_name, category, supports_pricing, supports_quantity, supports_notes, icon, description, active, default_config) 
VALUES (
  'fixed_price_quantity_notes_toggle', 
  'Toggle + Fixed Price with Quantity and Notes', 
  'pricing', 
  true, 
  true, 
  true, 
  'ToggleLeft', 
  'A toggleable field with fixed pricing, quantity controls, and notes field', 
  true, 
  '{"is_toggleable": true}'
);

-- Update the check constraint to include the new field type
ALTER TABLE field_library DROP CONSTRAINT IF EXISTS field_library_field_type_check;
ALTER TABLE field_library ADD CONSTRAINT field_library_field_type_check 
CHECK (field_type IN (
  'text', 'textarea', 'number', 'email', 'phone', 'date', 'time', 'select', 'multi_select', 
  'checkbox', 'radio', 'file_upload', 'signature', 'rating', 'slider', 'color', 'url', 
  'rich_text', 'location', 'toggle', 'price', 'quantity', 'fixed_price', 'fixed_price_notes', 
  'fixed_price_quantity', 'fixed_price_quantity_notes', 'fixed_price_notes_toggle', 
  'fixed_price_quantity_notes_toggle'
));