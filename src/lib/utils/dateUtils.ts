/**
 * Date formatting utilities for BeeKeep application
 */

/**
 * Format a timestamp for display in Swedish locale
 */
export function formatDate(timestamp: string): string {
	const date = new Date(timestamp);
	return date.toLocaleDateString('sv-SE', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Format a date added field (just date, no time)
 */
export function formatDateAdded(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString('sv-SE', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

/**
 * Get relative time description (for recent activities)
 */
export function getRelativeTime(timestamp: string): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

	if (diffInHours < 1) return 'Just nu';
	if (diffInHours < 24) return `${diffInHours}h sedan`;

	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays === 1) return 'Igår';
	if (diffInDays < 7) return `${diffInDays} dagar sedan`;

	// For older dates, use full formatting
	return formatDate(timestamp);
}

/**
 * Check if a timestamp is from today
 */
export function isToday(timestamp: string): boolean {
	const date = new Date(timestamp);
	const today = new Date();

	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	);
}

/**
 * Get current date in ISO format (YYYY-MM-DD)
 */
export function getCurrentDateISO(): string {
	return new Date().toISOString().split('T')[0];
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
	return new Date().toISOString();
}
