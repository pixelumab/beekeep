# BeeKeep Database Schema v2

## Overview

This database structure supports:

- **Multiple hive inspections per call**: One recording can inspect multiple hives
- **Separate inspections tracking**: Each inspection is a distinct record linking a call to a hive
- **Basic inspection data**: Queen presence, eggs, bee health, and bee quantity

## Entity Relationship

```
call_records (1) ─────< (many) inspections >─────── (many) hives (1)
```

- One call_record can have multiple inspections
- Each inspection belongs to one call_record
- Each inspection may link to one hive (or be unmatched)
- One hive can have multiple inspections over time

## Tables

### 1. `call_records`

Stores VAPI call/recording metadata.

```sql
CREATE TABLE call_records (
  id TEXT PRIMARY KEY,              -- UUID
  timestamp INTEGER NOT NULL,       -- Unix timestamp (ms)
  recording TEXT NOT NULL,          -- Recording URL (WAV file)
  duration INTEGER,                 -- Call duration in seconds
  transcription TEXT,               -- Full call transcription
  created_at INTEGER DEFAULT (unixepoch())
);
```

**Example:**

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"timestamp": 1761028028440,
	"recording": "https://example.com/recording.wav",
	"duration": 180,
	"transcription": "I inspected Main Hive and North Hive today..."
}
```

### 2. `hives`

Stores beehive information.

```sql
CREATE TABLE hives (
  id TEXT PRIMARY KEY,              -- UUID
  name TEXT NOT NULL,               -- Hive name (e.g., "Main Hive")
  location TEXT,                    -- Optional location
  notes TEXT,                       -- Optional notes
  color TEXT,                       -- Hex color for UI (#10B981)
  date_added INTEGER NOT NULL,      -- Unix timestamp (ms)
  is_active INTEGER DEFAULT 1       -- 1=active, 0=archived
);
```

**Example:**

```json
{
	"id": "660e8400-e29b-41d4-a716-446655440111",
	"name": "Main Hive",
	"location": "Backyard",
	"notes": "Italian bees, strong colony",
	"color": "#10B981",
	"date_added": 1760000000000,
	"is_active": 1
}
```

### 3. `inspections` (NEW)

Links call records to hives with inspection data.

```sql
CREATE TABLE inspections (
  id TEXT PRIMARY KEY,              -- UUID
  call_record_id TEXT NOT NULL,     -- FK to call_records
  hive_id TEXT,                     -- FK to hives (NULL if unmatched)
  hive_name_transcript TEXT,        -- Raw hive name from call
  matched INTEGER DEFAULT 0,        -- 0=unmatched, 1=matched

  -- Inspection data (4 basic fields)
  queen_present TEXT,               -- 'ja' or 'nej'
  fresh_eggs TEXT,                  -- 'ja' or 'nej'
  bee_health INTEGER,               -- 1-5 scale
  bee_quantity INTEGER,             -- 1-5 scale

  -- Metadata
  timestamp INTEGER NOT NULL,       -- When inspection was recorded
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (call_record_id) REFERENCES call_records(id) ON DELETE CASCADE,
  FOREIGN KEY (hive_id) REFERENCES hives(id) ON DELETE SET NULL
);

CREATE INDEX idx_inspections_call_record ON inspections(call_record_id);
CREATE INDEX idx_inspections_hive ON inspections(hive_id);
CREATE INDEX idx_inspections_matched ON inspections(matched);
```

**Example (matched inspection):**

```json
{
	"id": "770e8400-e29b-41d4-a716-446655440222",
	"call_record_id": "550e8400-e29b-41d4-a716-446655440000",
	"hive_id": "660e8400-e29b-41d4-a716-446655440111",
	"hive_name_transcript": "main hive",
	"matched": 1,
	"queen_present": "ja",
	"fresh_eggs": "ja",
	"bee_health": 4,
	"bee_quantity": 5,
	"timestamp": 1761028028440
}
```

**Example (unmatched inspection):**

```json
{
	"id": "880e8400-e29b-41d4-a716-446655440333",
	"call_record_id": "550e8400-e29b-41d4-a716-446655440000",
	"hive_id": null,
	"hive_name_transcript": "bikupa 5",
	"matched": 0,
	"queen_present": "nej",
	"fresh_eggs": "nej",
	"bee_health": 2,
	"bee_quantity": 3,
	"timestamp": 1761028028440
}
```

## VAPI Integration

### Expected Webhook Payload

VAPI should send `structuredData` in one of two formats:

**Format 1: Array of inspections (preferred)**

```json
{
	"message": {
		"timestamp": 1761028028440,
		"recordingUrl": "https://example.com/recording.wav",
		"analysis": {
			"structuredData": {
				"inspections": [
					{
						"bikupa": "Main Hive",
						"finnsDrottning": "ja",
						"nylagdaÄgg": "ja",
						"binasHälsa": 4,
						"mängdBin": 5
					},
					{
						"bikupa": "North Hive",
						"finnsDrottning": "nej",
						"nylagdaÄgg": "nej",
						"binasHälsa": 2,
						"mängdBin": 3
					}
				]
			}
		}
	}
}
```

**Format 2: Single inspection (fallback)**

```json
{
	"message": {
		"timestamp": 1761028028440,
		"recordingUrl": "https://example.com/recording.wav",
		"analysis": {
			"structuredData": {
				"bikupa": "Main Hive",
				"finnsDrottning": "ja",
				"nylagdaÄgg": "ja",
				"binasHälsa": 4,
				"mängdBin": 5
			}
		}
	}
}
```

### Webhook Processing Flow

1. **Create call_record**: Store recording metadata
2. **Extract inspections**: Parse `structuredData` (array or single)
3. **Match hives**: For each inspection, fuzzy match `bikupa` to existing hives
4. **Create inspection records**: Store each inspection with match status
5. **Return summary**: Report number of inspections created and matched

## API Endpoints

### Call Records

```
GET /api/call-records
Returns: { records: CallRecord[] }
```

Each record includes nested `inspections` array.

### Hives

```
GET /api/hives
Returns: { hives: Hive[] }

POST /api/hives
Body: { name, location?, notes?, color? }
Returns: { hive: Hive }

PUT /api/hives/[id]
Body: { name, location?, notes?, color? }
Returns: { success: true }

PATCH /api/hives/[id]
Archive hive (soft delete)
Returns: { success: true }
```

### Inspections

```
GET /api/inspections
GET /api/inspections?hive_id=xxx
Returns: { inspections: Inspection[] }

POST /api/inspections/[id]/link
Body: { hiveId }
Returns: { success: true }
```

## Common Queries

### Get all inspections for a specific hive

```sql
SELECT * FROM inspections
WHERE hive_id = ?
ORDER BY timestamp DESC;
```

### Get all hives inspected in a specific call

```sql
SELECT h.*, i.queen_present, i.fresh_eggs, i.bee_health, i.bee_quantity
FROM inspections i
JOIN hives h ON i.hive_id = h.id
WHERE i.call_record_id = ?;
```

### Get latest inspection for each hive

```sql
SELECT h.id, h.name, i.*
FROM hives h
LEFT JOIN (
  SELECT *
  FROM inspections
  WHERE matched = 1
  ORDER BY timestamp DESC
) i ON h.id = i.hive_id
GROUP BY h.id;
```

### Get all unmatched inspections

```sql
SELECT * FROM inspections
WHERE matched = 0
ORDER BY timestamp DESC;
```

## Migration from v1

The migration script (`schema_v2.sql`) automatically:

1. Migrates existing `call_records` data
2. Drops old hive-related columns (hive_id, queen_exist, etc.)
3. Creates new `inspections` table

**Note:** Old call records won't have inspection data (it was minimal anyway).

## UI Integration

### Sessions Page (`/sessions`)

- Lists all call records
- Shows multiple inspections per call
- Displays inspection badges (queen, eggs, health, quantity)
- "Link" button for unmatched inspections

### Hives Page (`/hives`)

- Lists all hives
- Shows latest inspection data on each hive card
- Click hive to view full inspection history (TODO)

## Data Flow Example

1. **User makes VAPI call** mentioning "I inspected Main Hive and bikupa 5"
2. **VAPI webhook receives** two inspections in `structuredData.inspections`
3. **Webhook creates**:
   - 1 call_record
   - 2 inspection records:
     - "Main Hive" → matched to existing hive
     - "bikupa 5" → unmatched (no hive exists)
4. **User visits** `/sessions`:
   - Sees call with "2 kupor inspekterade"
   - "Main Hive" shows green badges
   - "bikupa 5" shows "Link" button
5. **User clicks "Link"** on "bikupa 5":
   - Modal opens with hive dropdown
   - User selects or creates hive
   - Inspection linked, badge updates

## Best Practices

1. **Always query with JOINs**: Get hive data with inspections in one query
2. **Use indexes**: Filter by `hive_id`, `call_record_id`, or `matched`
3. **Soft delete only**: Never hard delete hives (set `is_active = 0`)
4. **Validate inspection data**: Ensure health/quantity are 1-5, presence is ja/nej
5. **Batch operations**: When showing call history, fetch all inspections at once

## Future Enhancements

- [ ] Add transcription analysis to extract notes per hive
- [ ] Store environmental data (weather, temperature)
- [ ] Add photo attachments to inspections
- [ ] Create hive health trends/charts
- [ ] Export inspection history as CSV/PDF
