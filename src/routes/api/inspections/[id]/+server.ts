import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { turso } from '$lib/turso';

// GET - Fetch a single inspection by ID
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		const sql = `
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
        h.color as hive_color,
        h.location as hive_location,
        c.recording as call_recording,
        c.duration as call_duration,
        c.transcription as call_transcription
      FROM inspections i
      LEFT JOIN hives h ON i.hive_id = h.id
      LEFT JOIN call_records c ON i.call_record_id = c.id
      WHERE i.id = ?
    `;

		const result = await turso.execute({ sql, args: [id] });

		if (result.rows.length === 0) {
			return error(404, 'Inspection not found');
		}

		return json({
			inspection: result.rows[0]
		});
	} catch (err) {
		console.error('Failed to fetch inspection:', err);
		return error(500, 'Failed to fetch inspection');
	}
};
