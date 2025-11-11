-- BeeKeep Database Schema v2
-- Supports: One call → Multiple hive inspections

-- ============================================
-- 1. HIVES TABLE (unchanged)
-- ============================================
CREATE TABLE IF NOT EXISTS hives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  color TEXT,
  date_added INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_hives_is_active ON hives(is_active);

-- ============================================
-- 2. CALL_RECORDS TABLE (updated - remove hive fields)
-- ============================================
CREATE TABLE IF NOT EXISTS call_records_v2 (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  recording TEXT NOT NULL,
  duration INTEGER,
  transcription TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Migrate existing data
INSERT INTO call_records_v2 (id, timestamp, recording, duration, created_at)
SELECT
  CAST(rowid AS TEXT) as id,
  timestamp,
  recording,
  NULL as duration,
  timestamp as created_at
FROM call_records;

-- Drop old table and rename
DROP TABLE call_records;
ALTER TABLE call_records_v2 RENAME TO call_records;

CREATE INDEX IF NOT EXISTS idx_call_records_timestamp ON call_records(timestamp);

-- ============================================
-- 3. INSPECTIONS TABLE (new)
-- ============================================
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  call_record_id TEXT NOT NULL,
  hive_id TEXT,
  hive_name_transcript TEXT,
  matched INTEGER DEFAULT 0,

  -- Inspection data (4 basic fields)
  queen_present TEXT,
  fresh_eggs TEXT,
  bee_health INTEGER,
  bee_quantity INTEGER,

  -- Metadata
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (call_record_id) REFERENCES call_records(id) ON DELETE CASCADE,
  FOREIGN KEY (hive_id) REFERENCES hives(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inspections_call_record ON inspections(call_record_id);
CREATE INDEX IF NOT EXISTS idx_inspections_hive ON inspections(hive_id);
CREATE INDEX IF NOT EXISTS idx_inspections_matched ON inspections(matched);
CREATE INDEX IF NOT EXISTS idx_inspections_timestamp ON inspections(timestamp);

-- ============================================
-- NOTES
-- ============================================
-- To apply this schema:
-- 1. Backup your existing database
-- 2. Run: turso db shell <your-db> < schema_v2.sql
-- 3. Existing call_records will be migrated
-- 4. No hive-specific data in old call_records (it was just queen_exist)
