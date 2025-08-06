-- Add foreign key constraints to event_type_form_mappings table
ALTER TABLE event_type_form_mappings 
ADD CONSTRAINT fk_event_type_form_mappings_event_type_config_id 
FOREIGN KEY (event_type_config_id) REFERENCES event_type_configs(id) ON DELETE CASCADE;

ALTER TABLE event_type_form_mappings 
ADD CONSTRAINT fk_event_type_form_mappings_form_template_id 
FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE CASCADE;