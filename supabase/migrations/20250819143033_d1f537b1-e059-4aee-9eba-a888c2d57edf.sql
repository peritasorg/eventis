-- Add missing fields to leads table for appointment scheduling and guest information
ALTER TABLE leads ADD COLUMN IF NOT EXISTS appointment_date date;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS date_of_contact date DEFAULT CURRENT_DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS men_count integer DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ladies_count integer DEFAULT 0; 
ALTER TABLE leads ADD COLUMN IF NOT EXISTS guest_mixture text DEFAULT 'Mixed';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS date_of_interest date;