export interface Hive {
	id: string;
	name: string;
	location?: string;
	notes?: string;
	dateAdded: string;
	color?: string; // For UI identification
	isActive: boolean; // For soft delete

	// Inspection tracking
	latestInspection?: HiveInspection; // Most recent inspection data
	lastInspectedAt?: string; // Timestamp of last inspection (ISO string)
}

export interface BeekeepingInspectionResult {
	// Basic identification (existing fields)
	bigård?: string; // Apiary name/location
	bikupa?: string; // Hive identifier

	// Basic status (existing fields)
	finnsDrottning?: 'ja' | 'nej'; // Queen present
	nylagdaÄgg?: 'ja' | 'nej'; // Fresh eggs present
	mängdBin?: 1 | 2 | 3 | 4 | 5; // Bee quantity scale
	binasHälsa?: 1 | 2 | 3 | 4 | 5; // Bee health scale

	// NEW FIELDS - Brood & Food (1-5 scale)
	yngelstatus?: 1 | 2 | 3 | 4 | 5; // Brood condition (1=poor, 5=excellent)
	foder?: 1 | 2 | 3 | 4 | 5; // Food/feeding status (1=none, 5=abundant)

	// NEW FIELDS - Behavior & Risk (1-5 scale)
	svärmningsrisk?: 1 | 2 | 3 | 4 | 5; // Swarming risk (1=none, 5=high)
	aktivitetVidFlustret?: 1 | 2 | 3 | 4 | 5; // Activity at entrance (1=low, 5=high)
	aggressivitet?: 1 | 2 | 3 | 4 | 5; // Bee aggressiveness (1=calm, 5=very aggressive)

	// NEW FIELDS - Environmental (free text - keeping as is)
	väder?: string; // Weather conditions (free text)
	växtDragförhållanden?: string; // Plant and draft conditions (free text)

	// NEW FIELDS - Health & Condition (ja/nej and 1-5)
	fuktMögel?: 'ja' | 'nej'; // Moisture/mold presence
	varroastatus?: 1 | 2 | 3 | 4 | 5; // Varroa mite status (1=none, 5=severe)
	kupansSkick?: 1 | 2 | 3 | 4 | 5; // Hive condition (1=poor, 5=excellent)

	// NEW FIELDS - Honey Production (numbers and ja/nej)
	antalSkattlådar?: number; // Number of honey supers
	skattlådorFulla?: 'ja' | 'nej'; // Honey supers full

	// NEW FIELDS - Planning (free text - keeping as is)
	planeradÅtgärd?: string; // Planned action for next visit (free text)

	// Technical fields
	extractionConfidence?: number; // Confidence level for the extraction (0-1)
}

export interface HiveInspection {
	id: string; // Unique inspection ID
	hiveId: string; // Reference to the hive
	hiveName?: string; // Cached hive name for display
	date: string; // Inspection date (ISO string)
	timestamp: string; // Full timestamp (ISO string)

	// Basic status (existing fields)
	finnsDrottning?: 'ja' | 'nej'; // Queen present
	nylagdaÄgg?: 'ja' | 'nej'; // Fresh eggs present
	mängdBin?: 1 | 2 | 3 | 4 | 5; // Bee quantity scale
	binasHälsa?: 1 | 2 | 3 | 4 | 5; // Bee health scale

	// NEW FIELDS - Brood & Food (1-5 scale)
	yngelstatus?: 1 | 2 | 3 | 4 | 5; // Brood condition (1=poor, 5=excellent)
	foder?: 1 | 2 | 3 | 4 | 5; // Food/feeding status (1=none, 5=abundant)

	// NEW FIELDS - Behavior & Risk (1-5 scale)
	svärmningsrisk?: 1 | 2 | 3 | 4 | 5; // Swarming risk (1=none, 5=high)
	aktivitetVidFlustret?: 1 | 2 | 3 | 4 | 5; // Activity at entrance (1=low, 5=high)
	aggressivitet?: 1 | 2 | 3 | 4 | 5; // Bee aggressiveness (1=calm, 5=very aggressive)

	// NEW FIELDS - Environmental (free text - keeping as is)
	väder?: string; // Weather conditions (free text)
	växtDragförhållanden?: string; // Plant and draft conditions (free text)

	// NEW FIELDS - Health & Condition (ja/nej and 1-5)
	fuktMögel?: 'ja' | 'nej'; // Moisture/mold presence
	varroastatus?: 1 | 2 | 3 | 4 | 5; // Varroa mite status (1=none, 5=severe)
	kupansSkick?: 1 | 2 | 3 | 4 | 5; // Hive condition (1=poor, 5=excellent)

	// NEW FIELDS - Honey Production (numbers and ja/nej)
	antalSkattlådar?: number; // Number of honey supers
	skattlådorFulla?: 'ja' | 'nej'; // Honey supers full

	// NEW FIELDS - Planning (free text - keeping as is)
	planeradÅtgärd?: string; // Planned action for next visit (free text)

	// Source and confidence
	extractionConfidence?: number; // AI confidence (0-1)
	source: 'ai' | 'manual'; // How the data was obtained
	recordingSessionId?: string; // Source recording if AI-extracted

	// Manual editing
	editedBy?: 'beekeeper'; // Who made manual edits
	editedAt?: string; // When manual edits were made
	notes?: string; // Additional beekeeper notes

	// Status flags
	confirmed?: boolean; // Beekeeper has reviewed and confirmed
}

export interface RecordingSession {
	id: string;
	date: string;
	startTime: string;
	endTime?: string;
	notes?: string;
	audioBlob?: string; // Base64 encoded audio data
	audioUrl?: string; // Object URL for playback
	duration?: number; // Recording duration in seconds
	hiveId?: string; // Associated hive (legacy - for single hive sessions)
	hiveName?: string; // Cached hive name for display (legacy)
	fileSize?: number; // Audio file size in bytes
	transcription?: string; // Audio transcription from Whisper
	inspectionResults?: BeekeepingInspectionResult[]; // Multiple hives detected in recording
	processedHiveInspections?: string[]; // IDs of HiveInspection records created from this session
	transcriptionTimestamp?: string; // When transcription was completed

	// Legacy field for backward compatibility
	inspectionResult?: BeekeepingInspectionResult; // Single hive result (deprecated)
}

// Keep for backwards compatibility
export interface InspectionSession extends RecordingSession {
	inspections: any[];
}

export interface NavigationTab {
	id: string;
	label: string;
	icon: string;
	path: string;
}
