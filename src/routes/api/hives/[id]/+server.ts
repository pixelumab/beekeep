import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { turso } from '$lib/turso';

// PUT - Update hive
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const body = await request.json();
		const { name, location, notes, color } = body;

		if (!name || typeof name !== 'string' || !name.trim()) {
			return error(400, 'Hive name is required');
		}

		await turso.execute({
			sql: `
        UPDATE hives
        SET name = ?, location = ?, notes = ?, color = ?
        WHERE id = ? AND is_active = 1
      `,
			args: [name.trim(), location?.trim() || null, notes?.trim() || null, color || '#10B981', id]
		});

		return json({
			success: true,
			message: 'Hive updated successfully'
		});
	} catch (err) {
		console.error('Failed to update hive:', err);
		return error(500, 'Failed to update hive');
	}
};

// PATCH - Archive hive (soft delete)
export const PATCH: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		await turso.execute({
			sql: `
        UPDATE hives
        SET is_active = 0
        WHERE id = ?
      `,
			args: [id]
		});

		return json({
			success: true,
			message: 'Hive archived successfully'
		});
	} catch (err) {
		console.error('Failed to archive hive:', err);
		return error(500, 'Failed to archive hive');
	}
};
