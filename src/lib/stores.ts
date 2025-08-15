import { writable } from 'svelte/store';
import type {
	InspectionSession,
	RecordingSession,
	Hive,
	HiveInspection,
	BeekeepingInspectionResult
} from './types.js';

function createSessionStore() {
	const { subscribe, set, update } = writable<InspectionSession[]>([]);

	return {
		subscribe,
		load: () => {
			if (typeof window !== 'undefined') {
				const stored = localStorage.getItem('beekeep-sessions');
				if (stored) {
					set(JSON.parse(stored));
				}
			}
		},
		add: (session: InspectionSession) => {
			update((sessions) => {
				const newSessions = [...sessions, session];
				if (typeof window !== 'undefined') {
					localStorage.setItem('beekeep-sessions', JSON.stringify(newSessions));
				}
				return newSessions;
			});
		}
	};
}

function createActiveSessionStore() {
	const { subscribe, set, update } = writable<InspectionSession | null>(null);

	return {
		subscribe,
		start: (session: InspectionSession) => {
			if (typeof window !== 'undefined') {
				localStorage.setItem('beekeep-active-session', JSON.stringify(session));
			}
			set(session);
		},
		end: () => {
			if (typeof window !== 'undefined') {
				localStorage.removeItem('beekeep-active-session');
			}
			set(null);
		},
		clear: () => {
			if (typeof window !== 'undefined') {
				localStorage.removeItem('beekeep-active-session');
			}
			set(null);
		},
		load: () => {
			if (typeof window !== 'undefined') {
				const stored = localStorage.getItem('beekeep-active-session');
				if (stored) {
					set(JSON.parse(stored));
				}
			}
		}
	};
}

function createHiveStore() {
	const { subscribe, set, update } = writable<Hive[]>([]);

	return {
		subscribe,
		load: () => {
			if (typeof window !== 'undefined') {
				const stored = localStorage.getItem('beekeep-hives');
				if (stored) {
					set(JSON.parse(stored));
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
					set(sampleHives);
					localStorage.setItem('beekeep-hives', JSON.stringify(sampleHives));
				}
			}
		},
		add: (hive: Omit<Hive, 'id' | 'dateAdded'>) => {
			const newHive: Hive = {
				...hive,
				id: crypto.randomUUID(),
				dateAdded: new Date().toISOString().split('T')[0],
				isActive: true
			};

			update((hives) => {
				const newHives = [...hives, newHive];
				if (typeof window !== 'undefined') {
					localStorage.setItem('beekeep-hives', JSON.stringify(newHives));
				}
				return newHives;
			});
			return newHive;
		},
		update: (updatedHive: Hive) => {
			update((hives) => {
				const newHives = hives.map((h) => (h.id === updatedHive.id ? updatedHive : h));
				if (typeof window !== 'undefined') {
					localStorage.setItem('beekeep-hives', JSON.stringify(newHives));
				}
				return newHives;
			});
		},
		remove: (hiveId: string) => {
			update((hives) => {
				const newHives = hives.map((h) => (h.id === hiveId ? { ...h, isActive: false } : h));
				if (typeof window !== 'undefined') {
					localStorage.setItem('beekeep-hives', JSON.stringify(newHives));
				}
				return newHives;
			});
		},
		getActiveHives: (hives: Hive[]) => hives.filter((h) => h.isActive),
		getById: (hives: Hive[], id: string) => hives.find((h) => h.id === id),

		// Update hive with latest inspection data
		updateLatestInspection: (hiveId: string, inspection: HiveInspection) => {
			update((hives) => {
				const newHives = hives.map((h) => {
					if (h.id === hiveId) {
						return {
							...h,
							latestInspection: inspection,
							lastInspectedAt: inspection.timestamp
						};
					}
					return h;
				});
				if (typeof window !== 'undefined') {
					localStorage.setItem('beekeep-hives', JSON.stringify(newHives));
				}
				return newHives;
			});
		},

		// Update multiple hives with their latest inspections
		updateMultipleLatestInspections: (inspectionsByHiveId: Record<string, HiveInspection>) => {
			update((hives) => {
				const newHives = hives.map((h) => {
					const inspection = inspectionsByHiveId[h.id];
					if (inspection) {
						return {
							...h,
							latestInspection: inspection,
							lastInspectedAt: inspection.timestamp
						};
					}
					return h;
				});
				if (typeof window !== 'undefined') {
					localStorage.setItem('beekeep-hives', JSON.stringify(newHives));
				}
				return newHives;
			});
		}
	};
}

function createInspectionStore() {
	const { subscribe, set, update } = writable<HiveInspection[]>([]);

	return {
		subscribe,
		load: () => {
			if (typeof window !== 'undefined') {
				const stored = localStorage.getItem('beekeep-inspections');
				if (stored) {
					set(JSON.parse(stored));
				}
			}
		},
		add: (inspection: HiveInspection) => {
			update((inspections) => {
				const newInspections = [...inspections, inspection];
				if (typeof window !== 'undefined') {
					localStorage.setItem('beekeep-inspections', JSON.stringify(newInspections));
				}
				return newInspections;
			});
			return inspection;
		},
		update: (updatedInspection: HiveInspection) => {
			update((inspections) => {
				const newInspections = inspections.map((i) =>
					i.id === updatedInspection.id ? updatedInspection : i
				);
				if (typeof window !== 'undefined') {
					localStorage.setItem('beekeep-inspections', JSON.stringify(newInspections));
				}
				return newInspections;
			});
		},
		getByHiveId: (inspections: HiveInspection[], hiveId: string) =>
			inspections
				.filter((i) => i.hiveId === hiveId)
				.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
		getLatestByHiveId: (inspections: HiveInspection[], hiveId: string) =>
			inspections
				.filter((i) => i.hiveId === hiveId)
				.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0],

		// Process multiple inspection results from a recording session
		processInspectionResults: (
			sessionId: string,
			inspectionResults: BeekeepingInspectionResult[],
			allHives: Hive[]
		): { matched: HiveInspection[]; unmatched: BeekeepingInspectionResult[] } => {
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
						finnsDrottning: result.finnsDrottning,
						nylagdaÄgg: result.nylagdaÄgg,
						mängdBin: result.mängdBin,
						binasHälsa: result.binasHälsa,
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
			update((inspections) => {
				const newInspections = [...inspections, ...createdInspections];
				if (typeof window !== 'undefined') {
					localStorage.setItem('beekeep-inspections', JSON.stringify(newInspections));
				}
				return newInspections;
			});

			// Update hives with latest inspection data
			if (Object.keys(hiveUpdates).length > 0) {
				hives.updateMultipleLatestInspections(hiveUpdates);
			}

			return { matched: createdInspections, unmatched: unmatchedResults };
		},

		// Process manual hive assignments for unmatched inspection results
		processManualAssignments: (
			sessionId: string,
			assignments: Array<{ result: BeekeepingInspectionResult; hiveId: string }>,
			allHives: Hive[]
		): HiveInspection[] => {
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
						finnsDrottning: assignment.result.finnsDrottning,
						nylagdaÄgg: assignment.result.nylagdaÄgg,
						mängdBin: assignment.result.mängdBin,
						binasHälsa: assignment.result.binasHälsa,
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
			update((inspections) => {
				const newInspections = [...inspections, ...createdInspections];
				if (typeof window !== 'undefined') {
					localStorage.setItem('beekeep-inspections', JSON.stringify(newInspections));
				}
				return newInspections;
			});

			// Update hives with latest inspection data
			if (Object.keys(hiveUpdates).length > 0) {
				hives.updateMultipleLatestInspections(hiveUpdates);
			}

			return createdInspections;
		}
	};
}

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

export const sessions = createSessionStore();
export const activeSession = createActiveSessionStore();
export const hives = createHiveStore();
export const inspections = createInspectionStore();
