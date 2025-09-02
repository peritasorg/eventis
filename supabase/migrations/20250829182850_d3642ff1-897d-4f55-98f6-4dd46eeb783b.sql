-- Add audit trail fields to communication_timeline table
ALTER TABLE communication_timeline 
ADD COLUMN original_summary text,
ADD COLUMN edited_at timestamp with time zone,
ADD COLUMN edited_by uuid,
ADD COLUMN edit_reason text;

-- Create balance_modifications table for tracking balance edits
CREATE TABLE balance_modifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  event_id uuid NOT NULL,
  modified_by uuid,
  original_balance numeric,
  new_balance numeric,
  edit_reason text,
  risk_acknowledged boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on balance_modifications
ALTER TABLE balance_modifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for balance_modifications
CREATE POLICY "tenant_isolation_balance_modifications" 
ON balance_modifications 
FOR ALL 
USING (tenant_id = get_current_tenant_id());

-- Create indexes for performance
CREATE INDEX idx_balance_modifications_event_id ON balance_modifications(event_id);
CREATE INDEX idx_balance_modifications_tenant_id ON balance_modifications(tenant_id);
CREATE INDEX idx_communication_timeline_edited ON communication_timeline(edited_at) WHERE edited_at IS NOT NULL;