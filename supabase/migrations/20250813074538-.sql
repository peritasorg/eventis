-- Add appears_on_quote and appears_on_invoice columns to form_fields table
ALTER TABLE form_fields 
ADD COLUMN appears_on_quote BOOLEAN DEFAULT false,
ADD COLUMN appears_on_invoice BOOLEAN DEFAULT false;