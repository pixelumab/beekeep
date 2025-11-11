import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { turso } from '$lib/turso';

export const GET: RequestHandler = async () => {
	try {
		// Get all call records
		const callsResult = await turso.execute({
			sql: `
        SELECT
          id,
          timestamp,
          recording,
          duration,
          transcription
        FROM call_records
        ORDER BY timestamp DESC
      `
		});

		// Get all inspections with hive data
		const inspectionsResult = await turso.execute({
			sql: `
        SELECT
          i.id,
          i.call_record_id,
          i.hive_id,
          i.hive_name_transcript,
          i.matched,
          i.queen_present,
          i.fresh_eggs,
          i.bee_health,
          i.bee_quantity,
          i.timestamp,
          h.name as hive_name,
          h.color as hive_color
        FROM inspections i
        LEFT JOIN hives h ON i.hive_id = h.id
        ORDER BY i.timestamp DESC
      `
		});

		// Group inspections by call_record_id
		const inspectionsByCall = new Map();
		for (const inspection of inspectionsResult.rows) {
			const callId = String(inspection.call_record_id);
			if (!inspectionsByCall.has(callId)) {
				inspectionsByCall.set(callId, []);
			}
			inspectionsByCall.get(callId).push(inspection);
		}

		// Combine calls with their inspections
		const records = callsResult.rows.map((call) => ({
			...call,
			inspections: inspectionsByCall.get(String(call.id)) || []
		}));

		return json({ records });
	} catch (err) {
		console.error('Failed to fetch call records:', err);
		return error(500, 'Failed to fetch call records');
	}
};
