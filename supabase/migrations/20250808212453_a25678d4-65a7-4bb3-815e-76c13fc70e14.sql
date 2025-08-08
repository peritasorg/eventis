-- Add individual guest info toggle and time slot to event_forms
ALTER TABLE event_forms ADD COLUMN individual_guest_info BOOLEAN DEFAULT false;
ALTER TABLE event_forms ADD COLUMN time_slot_id UUID REFERENCES event_time_slots(id);

-- Ensure all form templates have at least one page (required for proper structure)
INSERT INTO form_pages (form_template_id, tenant_id, page_number, page_title, page_description)
SELECT 
    ft.id,
    ft.tenant_id,
    1,
    'Main Page',
    'Primary form page'
FROM form_templates ft
WHERE ft.id NOT IN (SELECT DISTINCT form_template_id FROM form_pages WHERE form_template_id IS NOT NULL)
AND ft.tenant_id IS NOT NULL;

-- Ensure all form templates have at least one section
INSERT INTO form_sections (form_page_id, tenant_id, section_order, section_title, section_description)
SELECT 
    fp.id,
    fp.tenant_id,
    1,
    'Main Section',
    'Primary form section'
FROM form_pages fp
WHERE fp.id NOT IN (SELECT DISTINCT form_page_id FROM form_sections WHERE form_page_id IS NOT NULL)
AND fp.tenant_id IS NOT NULL;