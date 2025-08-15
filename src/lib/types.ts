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
	bigård?: string; // Apiary name/location
	bikupa?: string; // Hive identifier
	finnsDrottning?: 'ja' | 'nej'; // Queen present
	nylagdaÄgg?: 'ja' | 'nej'; // Fresh eggs present
	mängdBin?: 1 | 2 | 3 | 4 | 5; // Bee quantity scale
	binasHälsa?: 1 | 2 | 3 | 4 | 5; // Bee health scale
	extractionConfidence?: number; // Confidence level for the extraction (0-1)
}

export interface HiveInspection {
	id: string; // Unique inspection ID
	hiveId: string; // Reference to the hive
	hiveName?: string; // Cached hive name for display
	date: string; // Inspection date (ISO string)
	timestamp: string; // Full timestamp (ISO string)

	// Inspection data
	finnsDrottning?: 'ja' | 'nej'; // Queen present
	nylagdaÄgg?: 'ja' | 'nej'; // Fresh eggs present
	mängdBin?: 1 | 2 | 3 | 4 | 5; // Bee quantity scale
	binasHälsa?: 1 | 2 | 3 | 4 | 5; // Bee health scale

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
