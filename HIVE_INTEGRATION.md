# Hive Integration with VAPI Calls

## Overview

This system integrates VAPI voice calls with database-stored hives, enabling automatic and manual linking of call records to specific beehives.

## Database Schema

### Hives Table

```sql
CREATE TABLE hives (
  id TEXT PRIMARY KEY,              -- UUID
  name TEXT NOT NULL,               -- Hive name (e.g., "Main Hive", "North Hive")
  location TEXT,                    -- Optional location
  notes TEXT,                       -- Optional notes
  color TEXT,                       -- Hex color for UI
  date_added INTEGER NOT NULL,      -- Unix timestamp
  is_active INTEGER DEFAULT 1       -- 1=active, 0=archived
);
```

### Call Records Table (Updated)

```sql
ALTER TABLE call_records ADD COLUMN hive_id TEXT REFERENCES hives(id);
ALTER TABLE call_records ADD COLUMN hive_name_transcript TEXT;
ALTER TABLE call_records ADD COLUMN matched INTEGER DEFAULT 0;
```

## How It Works

### 1. Database Setup

Run the SQL schema from `schema.sql`:

```bash
# Connect to your Turso database and execute:
turso db shell <your-database-name> < schema.sql
```

### 2. VAPI Webhook Flow

When a VAPI call completes:

1. **Extract hive name**: The webhook extracts the `bikupa` field from VAPI's `structuredData`
2. **Fuzzy matching**: Attempts to match the mentioned name against existing hives:
   - Direct name match (case-insensitive)
   - Partial name match ("Main" matches "Main Hive")
   - Reverse match ("Main Hive 1" matches "Main Hive")
   - Number extraction ("bikupa 1" matches first hive)
3. **Store result**:
   - If matched: Sets `hive_id` and `matched = 1`
   - If not matched: Leaves `hive_id = NULL`, `matched = 0`, stores name in `hive_name_transcript`

### 3. Manual Linking UI

For unmatched calls, users can:

1. **View unmatched calls**: Sessions page shows badge "❓ Unmatched: [name]"
2. **Click "Link Hive"**: Opens modal with two options:
   - Select from existing hives (dropdown)
   - Create new hive (text input)
3. **Link or Create**: Button links the call to selected/new hive

## API Endpoints

### Hives Management

```typescript
// Get all active hives
GET /api/hives
Response: { hives: Hive[] }

// Create new hive
POST /api/hives
Body: { name, location?, notes?, color? }
Response: { hive: Hive }

// Update hive
PUT /api/hives/[id]
Body: { name, location?, notes?, color? }
Response: { success: true }

// Archive hive (soft delete)
PATCH /api/hives/[id]
Response: { success: true }
```

### Call Records

```typescript
// Get all call records (includes hive data via JOIN)
GET /api/call-records
Response: { records: CallRecord[] }

// Link call to hive
POST /api/call-records/[id]/link
Body: { hiveId: string }
Response: { success: true }
```

## UI Components

### Hives Page (`/hives`)

- Database-backed hive management (replaces localStorage)
- Create, edit, archive hives
- Color-coded hive cards
- Click to view details (TODO: detail page)

### Sessions Page (`/sessions`)

- Displays all call records from database
- Shows matched hives with color badge
- Shows unmatched calls with "Link Hive" button
- Modal for linking/creating hives

## Usage Example

1. **Add hives** via `/hives` page:
   - "Main Hive" (green)
   - "North Hive" (amber)
   - "East Hive" (blue)

2. **Make VAPI call** mentioning "north hive"
   - Webhook automatically matches to "North Hive"
   - Call record shows blue badge with "North Hive"

3. **Unmatched call** mentions "bikupa 5"
   - No match found (only 3 hives exist)
   - Shows "❓ Unmatched: bikupa 5"
   - User clicks "Link Hive" → selects or creates hive

## Configuration

Ensure VAPI is configured to extract the hive identifier in `structuredData.bikupa`:

```json
{
	"analysis": {
		"structuredData": {
			"bikupa": "Main Hive",
			"finnsDrottning": "ja"
		}
	}
}
```

## Migration Notes

- **Fresh start**: No localStorage migration needed
- Users start fresh with database-backed hives
- Old localStorage hives are ignored
- All new hives must be created via UI or API

## Future Enhancements

- [ ] Hive detail page showing call history
- [ ] Bulk import hives
- [ ] Export call records with hive data
- [ ] Advanced fuzzy matching algorithms
- [ ] Hive statistics dashboard
