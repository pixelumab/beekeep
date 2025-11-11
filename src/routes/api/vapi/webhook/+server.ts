import { VAPI_SECRET } from '$env/static/private';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { turso } from '$lib/turso';

interface InspectionData {
	bikupa?: string;
	finnsDrottning?: 'ja' | 'nej';
	nylagdaÄgg?: 'ja' | 'nej';
	binasHälsa?: number;
	mängdBin?: number;
}

// Fuzzy match hive name from transcript to existing hives
async function findMatchingHive(bikupaName: string | undefined) {
	if (!bikupaName) return null;

	const searchTerm = bikupaName.toLowerCase().trim();

	// Fetch all active hives
	const result = await turso.execute({
		sql: 'SELECT id, name FROM hives WHERE is_active = 1'
	});

	const hives = result.rows;

	// Direct name match
	let match = hives.find((h) => String(h.name).toLowerCase() === searchTerm);
	if (match) return { id: String(match.id), matched: true };

	// Partial name match
	match = hives.find((h) => String(h.name).toLowerCase().includes(searchTerm));
	if (match) return { id: String(match.id), matched: true };

	// Reverse partial match (searchTerm contains hive name)
	match = hives.find((h) => searchTerm.includes(String(h.name).toLowerCase()));
	if (match) return { id: String(match.id), matched: true };

	// Number extraction (e.g., "bikupa 1" matches hive at index 0)
	const numberMatch = searchTerm.match(/\d+/);
	if (numberMatch && hives.length > 0) {
		const num = parseInt(numberMatch[0]);
		if (num > 0 && num <= hives.length) {
			const hive = hives[num - 1];
			return { id: String(hive.id), matched: true };
		}
	}

	// No match found
	return { id: null, matched: false };
}

async function insertCallRecord(callId: string, timestamp: number, recording: string) {
	await turso.execute({
		sql: `INSERT INTO call_records (id, timestamp, recording) VALUES(?, ?, ?)`,
		args: [callId, timestamp, recording]
	});
}

async function insertInspection(callId: string, inspectionData: InspectionData, timestamp: number) {
	console.log('🔍 [INSPECTION] Starting insertion for bikupa:', inspectionData.bikupa);

	const hiveMatch = await findMatchingHive(inspectionData.bikupa);
	console.log('🏠 [INSPECTION] Hive match result:', hiveMatch);

	const inspectionId = crypto.randomUUID();
	console.log('🆔 [INSPECTION] Generated inspection ID:', inspectionId);

	const args = [
		inspectionId,
		callId,
		hiveMatch?.id || null,
		inspectionData.bikupa || null,
		hiveMatch?.matched ? 1 : 0,
		inspectionData.finnsDrottning || null,
		inspectionData.nylagdaÄgg || null,
		inspectionData.binasHälsa || null,
		inspectionData.mängdBin || null,
		timestamp
	];

	console.log('📊 [INSPECTION] Insert args:', JSON.stringify(args, null, 2));

	await turso.execute({
		sql: `
      INSERT INTO inspections (
        id, call_record_id, hive_id, hive_name_transcript, matched,
        queen_present, fresh_eggs, bee_health, bee_quantity, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
		args
	});

	console.log('✅ [INSPECTION] Successfully inserted into database');

	return { inspectionId, matched: hiveMatch?.matched || false };
}

export const POST: RequestHandler = async ({ request }) => {
	// Verify VAPI secret is configured
	if (!VAPI_SECRET) {
		console.error('VAPI_SECRET not configured');
		return error(500, 'VAPI webhook secret not configured');
	}

	try {
		console.log('🔔 [WEBHOOK] Received VAPI webhook request');

		// Verify the secret from the request headers
		const secretHeader = request.headers.get('x-vapi-secret');

		if (secretHeader !== VAPI_SECRET) {
			console.error('❌ [WEBHOOK] Invalid VAPI secret provided');
			return error(403, 'Forbidden: Invalid secret');
		}

		console.log('✅ [WEBHOOK] Secret verified');

		// Parse the webhook payload
		const payload = await request.json();
		console.log('📦 [WEBHOOK] Full payload:', JSON.stringify(payload, null, 2));

		const message = payload?.message;

		if (!message || !message.analysis) {
			console.error('❌ [WEBHOOK] Missing message or analysis in payload');
			return error(400, 'Bad Request: Missing message or analysis');
		}

		console.log('📝 [WEBHOOK] Message timestamp:', message.timestamp);
		console.log('🎙️ [WEBHOOK] Recording URL:', message.recordingUrl);
		console.log('🔍 [WEBHOOK] Analysis:', JSON.stringify(message.analysis, null, 2));

		const { structuredData } = message.analysis;
		console.log('📊 [WEBHOOK] Structured data:', JSON.stringify(structuredData, null, 2));

		const callId = crypto.randomUUID();
		console.log('🆔 [WEBHOOK] Generated call ID:', callId);

		// Insert call record first
		console.log('💾 [WEBHOOK] Inserting call record...');
		await insertCallRecord(callId, message.timestamp, message.recordingUrl);
		console.log('✅ [WEBHOOK] Call record inserted successfully');

		// Handle inspections - support multiple formats
		const inspections: InspectionData[] = [];

		// Format 1: structuredData is directly an array of inspections
		if (Array.isArray(structuredData)) {
			console.log('📋 [WEBHOOK] structuredData is array with', structuredData.length, 'items');
			inspections.push(...structuredData);
		}
		// Format 2: structuredData.inspections exists (array format)
		else if (Array.isArray(structuredData.inspections)) {
			console.log(
				'📋 [WEBHOOK] Found structuredData.inspections array with',
				structuredData.inspections.length,
				'items'
			);
			inspections.push(...structuredData.inspections);
		}
		// Format 3: Single inspection format (object with bikupa/finnsDrottning)
		else if (structuredData.bikupa || structuredData.finnsDrottning) {
			console.log('📋 [WEBHOOK] Found single inspection format (object)');
			inspections.push({
				bikupa: structuredData.bikupa,
				finnsDrottning: structuredData.finnsDrottning,
				nylagdaÄgg: structuredData.nylagdaÄgg,
				binasHälsa: structuredData.binasHälsa,
				mängdBin: structuredData.mängdBin
			});
		} else {
			console.warn('⚠️ [WEBHOOK] No inspection data found in structuredData');
		}

		console.log('🔢 [WEBHOOK] Total inspections to process:', inspections.length);

		// Insert all inspections
		const inspectionResults = [];
		for (let i = 0; i < inspections.length; i++) {
			const inspectionData = inspections[i];
			console.log(
				`📝 [WEBHOOK] Processing inspection ${i + 1}/${inspections.length}:`,
				JSON.stringify(inspectionData, null, 2)
			);

			try {
				const result = await insertInspection(callId, inspectionData, message.timestamp);
				inspectionResults.push(result);
				console.log(`✅ [WEBHOOK] Inspection ${i + 1} inserted:`, result);
			} catch (err) {
				console.error(`❌ [WEBHOOK] Failed to insert inspection ${i + 1}:`, err);
				throw err;
			}
		}

		const response = {
			success: true,
			message: 'Webhook received and processed',
			callId,
			inspectionsCreated: inspectionResults.length,
			inspectionsMatched: inspectionResults.filter((r) => r.matched).length
		};

		console.log('🎉 [WEBHOOK] Processing complete:', JSON.stringify(response, null, 2));

		// Return success response
		return json(response);
	} catch (err) {
		console.error('💥 [WEBHOOK] Fatal error:', err);
		console.error('Stack trace:', err instanceof Error ? err.stack : 'No stack trace');
		return error(500, 'Failed to process webhook');
	}
};
