import type {
	InspectionSession,
	RecordingSession,
	Hive,
	HiveInspection,
	BeekeepingInspectionResult
} from './types.js';

// Global state using Svelte 5 runes
const sessionsState = $state<InspectionSession[]>([]);
let activeSessionState = $state<InspectionSession | null>(null);
const hivesState = $state<Hive[]>([]);
const inspectionsState = $state<HiveInspection[]>([]);

// Export functions to access state
export function getSessions() {
	return sessionsState;
}

export function getActiveSession() {
	return activeSessionState;
}

export function getHives() {
	return hivesState;
}

export function getInspections() {
	return inspectionsState;
}

// Session store functions
export const sessions = {
	get value() {
		return sessionsState;
	},
	load() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('beekeep-sessions');
			if (stored) {
				const parsedSessions = JSON.parse(stored);
				sessionsState.splice(0, sessionsState.length, ...parsedSessions);
			}
		}
	},
	add(session: InspectionSession) {
		sessionsState.push(session);
		if (typeof window !== 'undefined') {
			localStorage.setItem('beekeep-sessions', JSON.stringify(sessionsState));
		}
	}
};

// Active session store functions
export const activeSession = {
	get value() {
		return activeSessionState;
	},
	start(session: InspectionSession) {
		if (typeof window !== 'undefined') {
			localStorage.setItem('beekeep-active-session', JSON.stringify(session));
		}
		activeSessionState = session;
	},
	end() {
		if (typeof window !== 'undefined') {
			localStorage.removeItem('beekeep-active-session');
		}
		activeSessionState = null;
	},
	clear() {
		if (typeof window !== 'undefined') {
			localStorage.removeItem('beekeep-active-session');
		}
		activeSessionState = null;
	},
	load() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('beekeep-active-session');
			if (stored) {
				const parsedSession = JSON.parse(stored);
				activeSessionState = parsedSession;
			}
		}
	}
};

// Hive store functions
export const hives = {
	get value() {
		return hivesState;
	},
	load() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('beekeep-hives');
			if (stored) {
				const parsedHives = JSON.parse(stored);
				hivesState.splice(0, hivesState.length, ...parsedHives);
			} else {
				const today = new Date().toISOString().split('T')[0];
				const sampleHives: Hive[] = [
					{
						id: crypto.randomUUID(),
						name: 'Main Hive',
						location: 'Backyard',
						notes: 'Primary hive with Italian bees',
						dateAdded: today,
						color: '#10B981',
						isActive: true
					},
					{
						id: crypto.randomUUID(),
						name: 'North Hive',
						location: 'Garden',
						notes: 'New colony established this spring',
						dateAdded: today,
						color: '#F59E0B',
						isActive: true
					},
					{
						id: crypto.randomUUID(),
						name: 'East Hive',
						location: 'Field',
						notes: 'Strong colony with new queen',
						dateAdded: today,
						color: '#3B82F6',
						isActive: true
					}
				];
				hivesState.splice(0, hivesState.length, ...sampleHives);
				localStorage.setItem('beekeep-hives', JSON.stringify(hivesState));
			}
		}
	},
	add(hive: Omit<Hive, 'id' | 'dateAdded'>) {
		const newHive: Hive = {
			...hive,
			id: crypto.randomUUID(),
			dateAdded: new Date().toISOString().split('T')[0],
			isActive: true
		};

		hivesState.push(newHive);
		if (typeof window !== 'undefined') {
			localStorage.setItem('beekeep-hives', JSON.stringify(hivesState));
		}
		return newHive;
	},
	update(updatedHive: Hive) {
		const index = hivesState.findIndex((h) => h.id === updatedHive.id);
		if (index !== -1) {
			hivesState[index] = updatedHive;
			if (typeof window !== 'undefined') {
				localStorage.setItem('beekeep-hives', JSON.stringify(hivesState));
			}
		}
	},
	remove(hiveId: string) {
		const index = hivesState.findIndex((h) => h.id === hiveId);
		if (index !== -1) {
			hivesState[index] = { ...hivesState[index], isActive: false };
			if (typeof window !== 'undefined') {
				localStorage.setItem('beekeep-hives', JSON.stringify(hivesState));
			}
		}
	},
	getActiveHives(hives: Hive[]) {
		return hives.filter((h) => h.isActive);
	},
	getById(hives: Hive[], id: string) {
		return hives.find((h) => h.id === id);
	},

	// Update hive with latest inspection data
	updateLatestInspection(hiveId: string, inspection: HiveInspection) {
		const index = hivesState.findIndex((h) => h.id === hiveId);
		if (index !== -1) {
			hivesState[index] = {
				...hivesState[index],
				latestInspection: inspection,
				lastInspectedAt: inspection.timestamp
			};
			if (typeof window !== 'undefined') {
				localStorage.setItem('beekeep-hives', JSON.stringify(hivesState));
			}
		}
	},

	// Update multiple hives with their latest inspections
	updateMultipleLatestInspections(inspectionsByHiveId: Record<string, HiveInspection>) {
		for (let i = 0; i < hivesState.length; i++) {
			const inspection = inspectionsByHiveId[hivesState[i].id];
			if (inspection) {
				hivesState[i] = {
					...hivesState[i],
					latestInspection: inspection,
					lastInspectedAt: inspection.timestamp
				};
			}
		}
		if (typeof window !== 'undefined') {
			localStorage.setItem('beekeep-hives', JSON.stringify(hivesState));
		}
	}
};

// Inspection store functions
export const inspections = {
	get value() {
		return inspectionsState;
	},
	load() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('beekeep-inspections');
			if (stored) {
				const parsedInspections = JSON.parse(stored);

				// Migrate legacy inspections to include new status fields
				const migratedInspections = parsedInspections.map((inspection: any) => {
					// Check if inspection is already migrated (has new fields structure)
					if (inspection._migrated === true) {
						return inspection;
					}

					// Add default values for missing status fields
					return {
						...inspection,
						// Add new status fields with undefined values (will be hidden in UI)
						yngelstatus: inspection.yngelstatus || undefined,
						foder: inspection.foder || undefined,
						svärmningsrisk: inspection.svärmningsrisk || undefined,
						aktivitetVidFlustret: inspection.aktivitetVidFlustret || undefined,
						aggressivitet: inspection.aggressivitet || undefined,
						väder: inspection.väder || undefined,
						växtDragförhållanden: inspection.växtDragförhållanden || undefined,
						fuktMögel: inspection.fuktMögel || undefined,
						varroastatus: inspection.varroastatus || undefined,
						kupansSkick: inspection.kupansSkick || undefined,
						antalSkattlådar: inspection.antalSkattlådar || undefined,
						skattlådorFulla: inspection.skattlådorFulla || undefined,
						planeradÅtgärd: inspection.planeradÅtgärd || undefined,
						_migrated: true // Mark as migrated
					};
				});

				// Save migrated inspections back to localStorage
				localStorage.setItem('beekeep-inspections', JSON.stringify(migratedInspections));
				inspectionsState.splice(0, inspectionsState.length, ...migratedInspections);
			}
		}
	},
	add(inspection: HiveInspection) {
		inspectionsState.push(inspection);
		if (typeof window !== 'undefined') {
			localStorage.setItem('beekeep-inspections', JSON.stringify(inspectionsState));
		}
		return inspection;
	},
	update(updatedInspection: HiveInspection) {
		const index = inspectionsState.findIndex((i) => i.id === updatedInspection.id);
		if (index !== -1) {
			inspectionsState[index] = updatedInspection;
			if (typeof window !== 'undefined') {
				localStorage.setItem('beekeep-inspections', JSON.stringify(inspectionsState));
			}
		}
	},
	getByHiveId(inspections: HiveInspection[], hiveId: string) {
		return inspections
			.filter((i) => i.hiveId === hiveId)
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	},
	getLatestByHiveId(inspections: HiveInspection[], hiveId: string) {
		return inspections
			.filter((i) => i.hiveId === hiveId)
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
	},

	// Process multiple inspection results from a recording session
	processInspectionResults(
		sessionId: string,
		inspectionResults: BeekeepingInspectionResult[],
		allHives: Hive[]
	): { matched: HiveInspection[]; unmatched: BeekeepingInspectionResult[] } {
		const now = new Date().toISOString();
		const createdInspections: HiveInspection[] = [];
		const unmatchedResults: BeekeepingInspectionResult[] = [];
		const hiveUpdates: Record<string, HiveInspection> = {};

		for (const result of inspectionResults) {
			// Find matching hive by name/identifier
			const matchedHive = findMatchingHive(result.bikupa, allHives);

			if (matchedHive) {
				const inspection: HiveInspection = {
					id: crypto.randomUUID(),
					hiveId: matchedHive.id,
					hiveName: matchedHive.name,
					date: now.split('T')[0],
					timestamp: now,
					// Basic status fields
					finnsDrottning: result.finnsDrottning,
					nylagdaÄgg: result.nylagdaÄgg,
					mängdBin: result.mängdBin,
					binasHälsa: result.binasHälsa,
					// Brood & Food fields
					yngelstatus: result.yngelstatus,
					foder: result.foder,
					// Behavior & Risk fields
					svärmningsrisk: result.svärmningsrisk,
					aktivitetVidFlustret: result.aktivitetVidFlustret,
					aggressivitet: result.aggressivitet,
					// Environmental fields
					väder: result.väder,
					växtDragförhållanden: result.växtDragförhållanden,
					// Health & Condition fields
					fuktMögel: result.fuktMögel,
					varroastatus: result.varroastatus,
					kupansSkick: result.kupansSkick,
					// Honey Production fields
					antalSkattlådar: result.antalSkattlådar,
					skattlådorFulla: result.skattlådorFulla,
					// Planning fields
					planeradÅtgärd: result.planeradÅtgärd,
					// Technical fields
					extractionConfidence: result.extractionConfidence,
					source: 'ai',
					recordingSessionId: sessionId,
					confirmed: false
				};

				createdInspections.push(inspection);
				hiveUpdates[matchedHive.id] = inspection;
			} else {
				// Preserve unmatched data for manual assignment
				unmatchedResults.push(result);
			}
		}

		// Add all matched inspections to store
		inspectionsState.push(...createdInspections);
		if (typeof window !== 'undefined') {
			localStorage.setItem('beekeep-inspections', JSON.stringify(inspectionsState));
		}

		// Update hives with latest inspection data
		if (Object.keys(hiveUpdates).length > 0) {
			hives.updateMultipleLatestInspections(hiveUpdates);
		}

		return { matched: createdInspections, unmatched: unmatchedResults };
	},

	// Process manual hive assignments for unmatched inspection results
	processManualAssignments(
		sessionId: string,
		assignments: Array<{ result: BeekeepingInspectionResult; hiveId: string }>,
		allHives: Hive[]
	): HiveInspection[] {
		const now = new Date().toISOString();
		const createdInspections: HiveInspection[] = [];
		const hiveUpdates: Record<string, HiveInspection> = {};

		for (const assignment of assignments) {
			const targetHive = allHives.find((h) => h.id === assignment.hiveId);
			if (targetHive) {
				const inspection: HiveInspection = {
					id: crypto.randomUUID(),
					hiveId: targetHive.id,
					hiveName: targetHive.name,
					date: now.split('T')[0],
					timestamp: now,
					// Basic status fields
					finnsDrottning: assignment.result.finnsDrottning,
					nylagdaÄgg: assignment.result.nylagdaÄgg,
					mängdBin: assignment.result.mängdBin,
					binasHälsa: assignment.result.binasHälsa,
					// Brood & Food fields
					yngelstatus: assignment.result.yngelstatus,
					foder: assignment.result.foder,
					// Behavior & Risk fields
					svärmningsrisk: assignment.result.svärmningsrisk,
					aktivitetVidFlustret: assignment.result.aktivitetVidFlustret,
					aggressivitet: assignment.result.aggressivitet,
					// Environmental fields
					väder: assignment.result.väder,
					växtDragförhållanden: assignment.result.växtDragförhållanden,
					// Health & Condition fields
					fuktMögel: assignment.result.fuktMögel,
					varroastatus: assignment.result.varroastatus,
					kupansSkick: assignment.result.kupansSkick,
					// Honey Production fields
					antalSkattlådar: assignment.result.antalSkattlådar,
					skattlådorFulla: assignment.result.skattlådorFulla,
					// Planning fields
					planeradÅtgärd: assignment.result.planeradÅtgärd,
					// Technical fields
					extractionConfidence: assignment.result.extractionConfidence,
					source: 'ai',
					recordingSessionId: sessionId,
					confirmed: true // Manual assignments are confirmed
				};

				createdInspections.push(inspection);
				hiveUpdates[targetHive.id] = inspection;
			}
		}

		// Add manually assigned inspections to store
		inspectionsState.push(...createdInspections);
		if (typeof window !== 'undefined') {
			localStorage.setItem('beekeep-inspections', JSON.stringify(inspectionsState));
		}

		// Update hives with latest inspection data
		if (Object.keys(hiveUpdates).length > 0) {
			hives.updateMultipleLatestInspections(hiveUpdates);
		}

		return createdInspections;
	}
};

// Helper function to match bikupa identifier to existing hives
function findMatchingHive(bikupaId: string | undefined, allHives: Hive[]): Hive | null {
	if (!bikupaId) return null;

	const searchTerm = bikupaId.toLowerCase().trim();

	// Direct name match
	let match = allHives.find((h) => h.name.toLowerCase() === searchTerm);
	if (match) return match;

	// Partial name match
	match = allHives.find((h) => h.name.toLowerCase().includes(searchTerm));
	if (match) return match;

	// Number extraction (e.g., "bikupa 1" matches hive named "Main Hive" if it's the first one)
	const numberMatch = searchTerm.match(/\d+/);
	if (numberMatch) {
		const num = parseInt(numberMatch[0]);
		// Try to match by position (1-indexed)
		if (num > 0 && num <= allHives.length) {
			return allHives[num - 1];
		}
	}

	return null;
}
