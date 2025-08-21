// Status color utilities for beekeeping inspection data

/**
 * Get color class for ja/nej boolean status fields
 */
export function getStatusColor(status: 'ja' | 'nej' | undefined): string {
	if (status === 'ja') return 'text-green-600';
	if (status === 'nej') return 'text-red-600';
	return 'text-gray-400';
}

/**
 * Get color class for health-related numeric fields (1-5 scale)
 * Higher numbers = better (green), lower numbers = worse (red)
 */
export function getHealthColor(level: number | undefined): string {
	if (!level) return 'text-gray-400';
	if (level >= 4) return 'text-green-600';
	if (level >= 3) return 'text-yellow-600';
	return 'text-red-600';
}

/**
 * Get color class for risk-related numeric fields (1-5 scale)
 * Higher numbers = more risk (red), lower numbers = less risk (green)
 */
export function getRiskColor(level: number | undefined): string {
	if (!level) return 'text-gray-400';
	if (level >= 4) return 'text-red-600';
	if (level === 3) return 'text-yellow-600';
	return 'text-green-600';
}

/**
 * Get appropriate color function based on field name and type
 */
export function getFieldColor(
	fieldName: string,
	value: any,
	type: 'boolean' | 'scale' | 'text'
): string {
	if (type === 'boolean') {
		return getStatusColor(value as 'ja' | 'nej');
	}

	if (type === 'scale') {
		const lowerName = fieldName.toLowerCase();
		if (
			lowerName.includes('risk') ||
			lowerName.includes('aggressiv') ||
			lowerName.includes('varroa')
		) {
			return getRiskColor(value as number);
		}
		return getHealthColor(value as number);
	}

	return 'text-gray-900';
}

/**
 * Get background color class for boolean status badges
 */
export function getStatusBadgeClass(status: 'ja' | 'nej' | undefined): string {
	if (status === 'ja') return 'bg-green-100 text-green-800';
	if (status === 'nej') return 'bg-red-100 text-red-800';
	return 'bg-gray-100 text-gray-800';
}
