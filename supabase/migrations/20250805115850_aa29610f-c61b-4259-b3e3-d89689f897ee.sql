-- Add tags and category columns to field_library for enhanced organization and search
ALTER TABLE field_library 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_field_library_tags ON field_library USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_field_library_category ON field_library(category);
CREATE INDEX IF NOT EXISTS idx_field_library_search ON field_library(label, field_type, category);