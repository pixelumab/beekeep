import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { turso } from '$lib/turso';

// GET - List all active hives
export const GET: RequestHandler = async () => {
	try {
		const result = await turso.execute({
			sql: `
        SELECT id, name, location, notes, color, date_added, is_active
        FROM hives
        WHERE is_active = 1
        ORDER BY date_added DESC
      `
		});

		return json({
			hives: result.rows
		});
	} catch (err) {
		console.error('Failed to fetch hives:', err);
		return error(500, 'Failed to fetch hives');
	}
};

// POST - Create new hive
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { name, location, notes, color } = body;

		if (!name || typeof name !== 'string' || !name.trim()) {
			return error(400, 'Hive name is required');
		}

		const id = crypto.randomUUID();
		const dateAdded = Date.now();

		await turso.execute({
			sql: `
        INSERT INTO hives (id, name, location, notes, color, date_added, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `,
			args: [
				id,
				name.trim(),
				location?.trim() || null,
				notes?.trim() || null,
				color || '#10B981',
				dateAdded
			]
		});

		return json({
			hive: {
				id,
				name: name.trim(),
				location: location?.trim() || null,
				notes: notes?.trim() || null,
				color: color || '#10B981',
				date_added: dateAdded,
				is_active: 1
			}
		});
	} catch (err) {
		console.error('Failed to create hive:', err);
		return error(500, 'Failed to create hive');
	}
};
