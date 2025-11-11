import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { turso } from '$lib/turso';

// POST - Link an inspection to a hive
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const body = await request.json();
		const { hiveId } = body;

		if (!hiveId) {
			return error(400, 'Hive ID is required');
		}

		// Verify the hive exists
		const hiveCheck = await turso.execute({
			sql: 'SELECT id FROM hives WHERE id = ? AND is_active = 1',
			args: [hiveId]
		});

		if (hiveCheck.rows.length === 0) {
			return error(404, 'Hive not found');
		}

		// Update the inspection
		await turso.execute({
			sql: `
        UPDATE inspections
        SET hive_id = ?, matched = 1
        WHERE id = ?
      `,
			args: [hiveId, id]
		});

		return json({
			success: true,
			message: 'Inspection linked to hive successfully'
		});
	} catch (err) {
		console.error('Failed to link inspection to hive:', err);
		return error(500, 'Failed to link inspection to hive');
	}
};
