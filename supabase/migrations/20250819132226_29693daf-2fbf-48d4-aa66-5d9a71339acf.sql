-- Add guest_mixture field to events table
ALTER TABLE events ADD COLUMN guest_mixture TEXT DEFAULT 'Mixed' CHECK (guest_mixture IN ('Men Only', 'Ladies Only', 'Mixed'));

-- Add template format preference to tenants table
ALTER TABLE tenants ADD COLUMN template_format_preference TEXT DEFAULT 'word' CHECK (template_format_preference IN ('word', 'pdf'));