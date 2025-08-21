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
 * Clean and sanitize JSON response from OpenAI
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

	cleaned = cleaned.trim();

	// Additional cleaning for common JSON issues
	try {
		// Try parsing first to see if it's already valid
		JSON.parse(cleaned);
		return cleaned;
	} catch {
		// If parsing fails, try to fix common issues
		
		// Replace problematic characters in text fields
		// This regex finds text values and escapes quotes within them
		cleaned = cleaned.replace(
			/"([^"]*)"(\s*:\s*)"([^"]*(?:\\.[^"]*)*)"/g,
			(match, key, separator, value) => {
				// Escape internal quotes and backslashes in the value
				const escapedValue = value
					.replace(/\\/g, '\\\\') // Escape backslashes first
					.replace(/"/g, '\\"')   // Escape quotes
					.replace(/\n/g, '\\n')  // Escape newlines
					.replace(/\r/g, '\\r')  // Escape carriage returns
					.replace(/\t/g, '\\t'); // Escape tabs
				
				return `"${key}"${separator}"${escapedValue}"`;
			}
		);

		// Fix trailing commas before closing brackets/braces
		cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

		// Try parsing again after fixes
		try {
			JSON.parse(cleaned);
			return cleaned;
		} catch {
			// If still failing, return original and let error be handled upstream
			return content.trim();
		}
	}
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

		const prompt = `Extract structured beekeeping inspection data from this Swedish transcription. The recording may contain information about MULTIPLE hives and comprehensive inspection details.

The beekeeper may mention various inspection aspects in Swedish. Extract ALL available information for each hive.

Transcription: "${transcription}"

For EACH hive mentioned, extract these fields (only include fields that are mentioned):

BASIC IDENTIFICATION:
- bigård: Apiary name/location (often mentioned once at the beginning)
- bikupa: Hive identifier (number or name) - REQUIRED for each hive

BASIC STATUS:
- finnsDrottning: "ja" or "nej" for queen presence
- nylagdaÄgg: "ja" or "nej" for fresh eggs present
- mängdBin: Number 1-5 for bee quantity
- binasHälsa: Number 1-5 for bee health

BROOD & FOOD (1-5 scale):
- yngelstatus: Number 1-5 for brood condition (1=poor, 5=excellent)
- foder: Number 1-5 for food/feeding status (1=none, 5=abundant)

BEHAVIOR & RISK (1-5 scale):
- svärmningsrisk: Number 1-5 for swarming risk (1=none, 5=high)
- aktivitetVidFlustret: Number 1-5 for entrance activity (1=low, 5=high)
- aggressivitet: Number 1-5 for bee aggressiveness (1=calm, 5=very aggressive)

ENVIRONMENTAL:
- väder: Free text for weather conditions (e.g., "soligt", "regnigt", "molnigt")
- växtDragförhållanden: Free text for plant and draft conditions

HEALTH & CONDITION:
- fuktMögel: "ja", "nej" for moisture/mold presence
- varroastatus: Number 1-5 for Varroa mite status (1=none, 5=severe)
- kupansSkick: Number 1-5 for hive condition (1=poor, 5=excellent)

HONEY PRODUCTION:
- antalSkattlådar: Number for count of honey supers/boxes
- skattlådorFulla: "ja", "nej" for honey supers full

PLANNING:
- planeradÅtgärd: Free text for planned actions for next visit

Handle Swedish speech variations:
- Numbers: "ett"=1, "två"=2, "tre"=3, "fyra"=4, "fem"=5
- "Ja" variations: "ja", "javisst", "jo", "mm", "bra", "ok"
- "Nej" variations: "nej", "nae", "inte", "inget", "inga"
- Quality scale terms: Map Swedish words to 1-5 scale
  - "dålig/illa/mycket dålig" = 1
  - "lite dålig/inte så bra" = 2  
  - "okej/medel/genomsnittlig" = 3
  - "bra/ganska bra" = 4
  - "mycket bra/utmärkt/perfekt" = 5
- Weather: "sol"=sunny, "regn"=rain, "vind"=wind, "kallt"=cold, "varmt"=warm
- Hive identifiers: "bikupa 1", "kupa 2", "hive A", "nummer 3", etc.

Return ONLY valid JSON array of hive objects. Follow these JSON formatting rules:
- NO quotes inside string values (use simple words)
- NO line breaks in text fields
- NO trailing commas
- Use only basic alphanumeric characters in text fields
- Include extractionConfidence for each hive

Format:
[
  {
    "bigård": "string or omit if not mentioned",
    "bikupa": "string - REQUIRED",
    "finnsDrottning": "ja/nej or omit",
    "nylagdaÄgg": "ja/nej or omit", 
    "mängdBin": 1-5 or omit,
    "binasHälsa": 1-5 or omit,
    "yngelstatus": 1-5 or omit,
    "foder": 1-5 or omit,
    "svärmningsrisk": 1-5 or omit,
    "aktivitetVidFlustret": 1-5 or omit,
    "aggressivitet": 1-5 or omit,
    "väder": "simple text only or omit",
    "växtDragförhållanden": "simple text only or omit",
    "fuktMögel": "ja/nej or omit",
    "varroastatus": 1-5 or omit,
    "kupansSkick": 1-5 or omit,
    "antalSkattlådar": number or omit,
    "skattlådorFulla": "ja/nej or omit",
    "planeradÅtgärd": "simple text only or omit",
    "extractionConfidence": 0.0-1.0
  }
]

CRITICAL: Return ONLY the JSON array, no explanations, no markdown formatting.`;

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
				max_tokens: 800,
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

		// Clean and parse JSON response with enhanced error handling
		const cleanedContent = cleanJsonResponse(content);
		
		let extractedData;
		try {
			extractedData = JSON.parse(cleanedContent);
		} catch (parseError) {
			// Log the problematic response for debugging
			console.error('JSON Parse Error:', parseError);
			console.error('Raw AI Response:', content);
			console.error('Cleaned Content:', cleanedContent);
			
			// Try to extract partial data or provide a helpful error
			const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown JSON parsing error';
			return {
				success: false,
				error: `Failed to parse AI response as JSON: ${errorMessage}. The AI may have generated invalid JSON format.`
			};
		}

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
			// Extended fields - Brood & Food (1-5 scale)
			if (
				typeof hiveData.yngelstatus === 'number' &&
				hiveData.yngelstatus >= 1 &&
				hiveData.yngelstatus <= 5
			) {
				inspectionResult.yngelstatus = hiveData.yngelstatus;
			}
			if (
				typeof hiveData.foder === 'number' &&
				hiveData.foder >= 1 &&
				hiveData.foder <= 5
			) {
				inspectionResult.foder = hiveData.foder;
			}

			// Extended fields - Behavior & Risk (1-5 scale)
			if (
				typeof hiveData.svärmningsrisk === 'number' &&
				hiveData.svärmningsrisk >= 1 &&
				hiveData.svärmningsrisk <= 5
			) {
				inspectionResult.svärmningsrisk = hiveData.svärmningsrisk;
			}
			if (
				typeof hiveData.aktivitetVidFlustret === 'number' &&
				hiveData.aktivitetVidFlustret >= 1 &&
				hiveData.aktivitetVidFlustret <= 5
			) {
				inspectionResult.aktivitetVidFlustret = hiveData.aktivitetVidFlustret;
			}
			if (
				typeof hiveData.aggressivitet === 'number' &&
				hiveData.aggressivitet >= 1 &&
				hiveData.aggressivitet <= 5
			) {
				inspectionResult.aggressivitet = hiveData.aggressivitet;
			}

			// Extended fields - Environmental
			if (typeof hiveData.väder === 'string' && hiveData.väder.trim()) {
				inspectionResult.väder = hiveData.väder.trim();
			}
			if (typeof hiveData.växtDragförhållanden === 'string' && hiveData.växtDragförhållanden.trim()) {
				inspectionResult.växtDragförhållanden = hiveData.växtDragförhållanden.trim();
			}

			// Extended fields - Health & Condition (ja/nej and 1-5)
			if (hiveData.fuktMögel === 'ja' || hiveData.fuktMögel === 'nej') {
				inspectionResult.fuktMögel = hiveData.fuktMögel;
			}
			if (
				typeof hiveData.varroastatus === 'number' &&
				hiveData.varroastatus >= 1 &&
				hiveData.varroastatus <= 5
			) {
				inspectionResult.varroastatus = hiveData.varroastatus;
			}
			if (
				typeof hiveData.kupansSkick === 'number' &&
				hiveData.kupansSkick >= 1 &&
				hiveData.kupansSkick <= 5
			) {
				inspectionResult.kupansSkick = hiveData.kupansSkick;
			}

			// Extended fields - Honey Production (numbers and ja/nej)
			if (typeof hiveData.antalSkattlådar === 'number' && hiveData.antalSkattlådar >= 0) {
				inspectionResult.antalSkattlådar = Math.floor(hiveData.antalSkattlådar);
			}
			if (hiveData.skattlådorFulla === 'ja' || hiveData.skattlådorFulla === 'nej') {
				inspectionResult.skattlådorFulla = hiveData.skattlådorFulla;
			}

			// Extended fields - Planning
			if (typeof hiveData.planeradÅtgärd === 'string' && hiveData.planeradÅtgärd.trim()) {
				inspectionResult.planeradÅtgärd = hiveData.planeradÅtgärd.trim();
			}

			// Confidence tracking
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
