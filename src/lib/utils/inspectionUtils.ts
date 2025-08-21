import type { HiveInspection } from '$lib/types.js';

/**
 * Inspection data utilities and field definitions
 */

// Status field configuration with icons and labels
export const STATUS_FIELD_CONFIG = {
	// Core status fields
	finnsDrottning: {
		label: 'Drottning',
		icon: '👑',
		type: 'boolean' as const,
		group: 'core'
	},
	nylagdaÄgg: {
		label: 'Ägg',
		icon: '🥚',
		type: 'boolean' as const,
		group: 'core'
	},
	mängdBin: {
		label: 'Population',
		icon: '🐝',
		type: 'scale' as const,
		group: 'core'
	},
	binasHälsa: {
		label: 'Hälsa',
		icon: '❤️',
		type: 'scale' as const,
		group: 'core'
	},

	// Brood & Food
	yngelstatus: {
		label: 'Yngelstatus',
		icon: '🍼',
		type: 'scale' as const,
		group: 'brood_food'
	},
	foder: {
		label: 'Foder',
		icon: '🍯',
		type: 'scale' as const,
		group: 'brood_food'
	},

	// Behavior & Risk
	svärmningsrisk: {
		label: 'Svärmningsrisk',
		icon: '⚠️',
		type: 'scale' as const,
		group: 'behavior_risk'
	},
	aktivitetVidFlustret: {
		label: 'Aktivitet',
		icon: '🚪',
		type: 'scale' as const,
		group: 'behavior_risk'
	},
	aggressivitet: {
		label: 'Aggressivitet',
		icon: '🐝',
		type: 'scale' as const,
		group: 'behavior_risk'
	},

	// Health & Condition
	fuktMögel: {
		label: 'Fukt/Mögel',
		icon: '💧',
		type: 'boolean' as const,
		group: 'health_condition'
	},
	varroastatus: {
		label: 'Varroa',
		icon: '🦠',
		type: 'scale' as const,
		group: 'health_condition'
	},
	kupansSkick: {
		label: 'Kupans skick',
		icon: '🏠',
		type: 'scale' as const,
		group: 'health_condition'
	},

	// Honey Production
	antalSkattlådar: {
		label: 'Skattlådor',
		icon: '📦',
		type: 'text' as const,
		group: 'honey_production',
		suffix: ' st'
	},
	skattlådorFulla: {
		label: 'Lådor fulla',
		icon: '📦',
		type: 'boolean' as const,
		group: 'honey_production'
	},

	// Environmental
	väder: {
		label: 'Väder',
		icon: '🌤️',
		type: 'text' as const,
		group: 'environmental'
	},
	växtDragförhållanden: {
		label: 'Växt/Drag',
		icon: '🌿',
		type: 'text' as const,
		group: 'environmental'
	}
} as const;

export const FIELD_GROUPS = {
	core: 'Grundläggande Status',
	brood_food: 'Yngel & Foder',
	behavior_risk: 'Beteende & Risk',
	health_condition: 'Hälsa & Skick',
	honey_production: 'Honungsproduktion',
	environmental: 'Miljö'
} as const;

/**
 * Get all status fields with values from an inspection
 */
export function getInspectionFields(inspection: HiveInspection) {
	const fields: Array<{
		key: string;
		config: (typeof STATUS_FIELD_CONFIG)[keyof typeof STATUS_FIELD_CONFIG];
		value: any;
	}> = [];

	for (const [key, config] of Object.entries(STATUS_FIELD_CONFIG)) {
		const value = inspection[key as keyof HiveInspection];
		if (value !== undefined && value !== null && value !== '') {
			fields.push({ key, config, value });
		}
	}

	return fields;
}

/**
 * Group inspection fields by category
 */
export function groupInspectionFields(inspection: HiveInspection) {
	const fields = getInspectionFields(inspection);
	const grouped: Record<string, typeof fields> = {};

	for (const field of fields) {
		const group = field.config.group;
		if (!grouped[group]) {
			grouped[group] = [];
		}
		grouped[group].push(field);
	}

	return grouped;
}

/**
 * Get core status fields only (for compact display)
 */
export function getCoreStatusFields(inspection: HiveInspection) {
	return getInspectionFields(inspection).filter((field) => field.config.group === 'core');
}

/**
 * Check if inspection has any non-core fields
 */
export function hasExtendedFields(inspection: HiveInspection): boolean {
	return getInspectionFields(inspection).some((field) => field.config.group !== 'core');
}

/**
 * Get inspection confidence level description
 */
export function getConfidenceDescription(confidence?: number): string {
	if (!confidence) return '';

	const percentage = Math.round(confidence * 100);
	if (percentage >= 90) return 'Mycket hög säkerhet';
	if (percentage >= 80) return 'Hög säkerhet';
	if (percentage >= 70) return 'Medel säkerhet';
	if (percentage >= 60) return 'Låg säkerhet';
	return 'Mycket låg säkerhet';
}
