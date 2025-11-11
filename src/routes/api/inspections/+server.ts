import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { turso } from '$lib/turso';

// GET - List all inspections (with optional hive_id filter)
export const GET: RequestHandler = async ({ url }) => {
	try {
		const hiveId = url.searchParams.get('hive_id');

		let sql = `
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
        c.recording as call_recording
      FROM inspections i
      LEFT JOIN hives h ON i.hive_id = h.id
      LEFT JOIN call_records c ON i.call_record_id = c.id
    `;

		const args: any[] = [];

		if (hiveId) {
			sql += ' WHERE i.hive_id = ?';
			args.push(hiveId);
		}

		sql += ' ORDER BY i.timestamp DESC';

		const result = await turso.execute({ sql, args });

		return json({
			inspections: result.rows
		});
	} catch (err) {
		console.error('Failed to fetch inspections:', err);
		return error(500, 'Failed to fetch inspections');
	}
};
