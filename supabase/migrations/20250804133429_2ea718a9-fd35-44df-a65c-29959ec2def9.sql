-- First, let's check what's in the form_sections table
SELECT * FROM form_sections LIMIT 5;

-- Let's also check the form_field_instances structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'form_field_instances' 
AND column_name IN ('form_section_id', 'form_template_id');

-- And form_sections structure  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'form_sections';