-- Hives table
CREATE TABLE IF NOT EXISTS hives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  color TEXT,
  date_added INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1
);

-- Update call_records table to add hive relationship
ALTER TABLE call_records ADD COLUMN hive_id TEXT REFERENCES hives(id);
ALTER TABLE call_records ADD COLUMN hive_name_transcript TEXT;
ALTER TABLE call_records ADD COLUMN matched INTEGER DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_records_hive_id ON call_records(hive_id);
CREATE INDEX IF NOT EXISTS idx_call_records_matched ON call_records(matched);
CREATE INDEX IF NOT EXISTS idx_hives_is_active ON hives(is_active);
