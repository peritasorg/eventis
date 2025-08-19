-- Add status column back to leads table with proper enum values
DO $$ 
BEGIN
  -- Create enum type for lead status if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE lead_status AS ENUM ('new', 'in_progress', 'converted');
  END IF;
END $$;

-- Add status column with default value
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status lead_status DEFAULT 'new';

-- Update existing leads: set to 'converted' if conversion_date exists, otherwise 'new'
UPDATE leads 
SET status = CASE 
  WHEN conversion_date IS NOT NULL THEN 'converted'::lead_status
  ELSE 'new'::lead_status
END
WHERE status IS NULL;

-- Add index for better performance on status filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads(tenant_id, status);