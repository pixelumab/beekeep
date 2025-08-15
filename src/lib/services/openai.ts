import { PUBLIC_OPENAI_API_KEY } from '$env/static/public';
import type { BeekeepingInspectionResult } from '$lib/types.js';

export interface TranscriptionResult {
	text: string;
	success: boolean;
	error?: string;
}

export interface HiveAnalysisResult {
	inspectionResults?: BeekeepingInspectionResult[]; // Support multiple hives in one recording
	success: boolean;
	error?: string;
}

/**
 * Clean JSON response by removing markdown code block formatting
 */
function cleanJsonResponse(content: string): string {
	// Remove markdown code blocks (```json and ```)
	let cleaned = content.trim();

	// Remove opening code block
	if (cleaned.startsWith('```json')) {
		cleaned = cleaned.substring(7);
	} else if (cleaned.startsWith('```')) {
		cleaned = cleaned.substring(3);
	}

	// Remove closing code block
	if (cleaned.endsWith('```')) {
		cleaned = cleaned.substring(0, cleaned.length - 3);
	}

	return cleaned.trim();
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
	try {
		if (!PUBLIC_OPENAI_API_KEY) {
			return {
				text: '',
				success: false,
				error: 'OpenAI API key not configured'
			};
		}

		const formData = new FormData();
		formData.append('file', audioBlob, 'recording.webm');
		formData.append('model', 'whisper-1');
		formData.append('response_format', 'text');
		formData.append('language', 'sv');
		formData.append(
			'prompt',
			'This is a Swedish beekeeping inspection recording. Listen for Swedish words about bees, hives, queen, honey, and beekeeping terminology.'
		);

		const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${PUBLIC_OPENAI_API_KEY}`
			},
			body: formData
		});

		if (!response.ok) {
			const errorData = await response.text();
			return {
				text: '',
				success: false,
				error: `API Error: ${response.status} - ${errorData}`
			};
		}

		const transcription = await response.text();

		return {
			text: transcription.trim(),
			success: true
		};
	} catch (error) {
		return {
			text: '',
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error during transcription'
		};
	}
}

/**
 * Extract structured Swedish beekeeping inspection data from transcription
 */
export async function analyzeHiveStatus(transcription: string): Promise<HiveAnalysisResult> {
	try {
		if (!PUBLIC_OPENAI_API_KEY) {
			return {
				success: false,
				error: 'OpenAI API key not configured'
			};
		}

		const prompt = `Extract structured beekeeping inspection data from this Swedish transcription. The recording may contain information about MULTIPLE hives.

The beekeeper typically follows this pattern: "Jag är på bigård [name] och bikupa [id], finns drottning? [ja/nej], nylagda ägg, [ja/nej], mängd bin, [1-5], binas hälsa, [1-5]"

They may mention multiple hives in one recording like:
"bikupa 1, drottning ja, bin 3, hälsa 4, bikupa 2, drottning nej, bin 2, hälsa 3"

Transcription: "${transcription}"

For EACH hive mentioned, extract:
- bigård: Apiary name/location (often mentioned once at the beginning)
- bikupa: Hive identifier (number or name) - REQUIRED for each hive
- finnsDrottning: "ja" or "nej" for queen presence
- nylagdaÄgg: "ja" or "nej" for fresh eggs
- mängdBin: Number 1-5 for bee quantity
- binasHälsa: Number 1-5 for bee health
- extractionConfidence: Your confidence in the extraction for this specific hive (0.0-1.0)

Handle variations in Swedish speech:
- Numbers: "ett", "två", "tre", "fyra", "fem" (1-5)
- "Ja" variations: "ja", "javisst", "jo", "mm"  
- "Nej" variations: "nej", "nae", "inte", "inget"
- Hive identifiers: "bikupa 1", "kupa 2", "hive A", "nummer 3", etc.

IMPORTANT: Return an array of hive objects, even if only one hive is mentioned.

Respond in JSON format:
[
  {
    "bigård": "string or omit",
    "bikupa": "string - REQUIRED", 
    "finnsDrottning": "ja/nej or omit",
    "nylagdaÄgg": "ja/nej or omit",
    "mängdBin": 1-5 or omit,
    "binasHälsa": 1-5 or omit,
    "extractionConfidence": 0.0-1.0
  }
]`;

		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${PUBLIC_OPENAI_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'gpt-4o',
				messages: [
					{
						role: 'system',
						content:
							'You are an expert beekeeping consultant analyzing hive inspection recordings. Provide accurate, helpful assessments based on transcribed observations.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				max_tokens: 200,
				temperature: 0.3
			})
		});

		if (!response.ok) {
			const errorData = await response.text();
			return {
				success: false,
				error: `API Error: ${response.status} - ${errorData}`
			};
		}

		const data = await response.json();
		const content = data.choices[0]?.message?.content;

		if (!content) {
			return {
				success: false,
				error: 'Empty response from API'
			};
		}

		// Clean and parse JSON response (handle markdown code blocks)
		const cleanedContent = cleanJsonResponse(content);
		const extractedData = JSON.parse(cleanedContent);

		// Ensure we have an array (even if GPT returns a single object)
		const rawResults = Array.isArray(extractedData) ? extractedData : [extractedData];

		// Validate and structure each hive's data
		const inspectionResults: BeekeepingInspectionResult[] = [];

		for (const hiveData of rawResults) {
			// Skip if no bikupa identifier (required field)
			if (!hiveData.bikupa) continue;

			const inspectionResult: BeekeepingInspectionResult = {
				bikupa: hiveData.bikupa
			};

			if (hiveData.bigård) inspectionResult.bigård = hiveData.bigård;
			if (hiveData.finnsDrottning === 'ja' || hiveData.finnsDrottning === 'nej') {
				inspectionResult.finnsDrottning = hiveData.finnsDrottning;
			}
			if (hiveData.nylagdaÄgg === 'ja' || hiveData.nylagdaÄgg === 'nej') {
				inspectionResult.nylagdaÄgg = hiveData.nylagdaÄgg;
			}
			if (
				typeof hiveData.mängdBin === 'number' &&
				hiveData.mängdBin >= 1 &&
				hiveData.mängdBin <= 5
			) {
				inspectionResult.mängdBin = hiveData.mängdBin;
			}
			if (
				typeof hiveData.binasHälsa === 'number' &&
				hiveData.binasHälsa >= 1 &&
				hiveData.binasHälsa <= 5
			) {
				inspectionResult.binasHälsa = hiveData.binasHälsa;
			}
			if (typeof hiveData.extractionConfidence === 'number') {
				inspectionResult.extractionConfidence = Math.max(
					0,
					Math.min(1, hiveData.extractionConfidence)
				);
			}

			inspectionResults.push(inspectionResult);
		}

		return {
			inspectionResults,
			success: true
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error during analysis'
		};
	}
}

/**
 * Combined function to transcribe audio and analyze hive status
 */
export async function transcribeAndAnalyze(audioBlob: Blob): Promise<{
	transcription: TranscriptionResult;
	analysis: HiveAnalysisResult;
}> {
	const transcription = await transcribeAudio(audioBlob);

	let analysis: HiveAnalysisResult;
	if (transcription.success && transcription.text.trim()) {
		analysis = await analyzeHiveStatus(transcription.text);
	} else {
		analysis = {
			success: false,
			error: 'Transcription required for analysis'
		};
	}

	return { transcription, analysis };
}
