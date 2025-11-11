import { env } from '$env/dynamic/private';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	// Check if API key is configured
	if (!env.OPENAI_API_KEY) {
		return error(500, 'OpenAI API key not configured');
	}

	try {
		// Get the audio file from the request
		const formData = await request.formData();
		const audioFile = formData.get('audio') as File;

		if (!audioFile) {
			return error(400, 'No audio file provided');
		}

		// Transcribe with OpenAI Whisper
		const transcribeFormData = new FormData();
		transcribeFormData.append('file', audioFile, 'recording.webm');
		transcribeFormData.append('model', 'whisper-1');
		transcribeFormData.append('response_format', 'text');
		transcribeFormData.append('language', 'sv');
		transcribeFormData.append(
			'prompt',
			'This is a Swedish beekeeping inspection recording. Listen for Swedish words about bees, hives, queen, honey, and beekeeping terminology.'
		);

		const transcribeResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.OPENAI_API_KEY}`
			},
			body: transcribeFormData
		});

		if (!transcribeResponse.ok) {
			const errorData = await transcribeResponse.text();
			console.error('OpenAI transcription error:', errorData);
			return error(500, 'Failed to transcribe audio');
		}

		const transcriptionText = await transcribeResponse.text();

		if (!transcriptionText || transcriptionText.trim() === '') {
			return json({
				transcription: { text: '', success: false, error: 'No speech detected in audio' },
				analysis: { success: false, error: 'No text to analyze' }
			});
		}

		// Analyze the transcription with GPT using the comprehensive prompt from original
		const analysisPrompt = `Extract structured beekeeping inspection data from this Swedish transcription. The recording may contain information about MULTIPLE hives and comprehensive inspection details.

The beekeeper may mention various inspection aspects in Swedish. Extract ALL available information for each hive.

Transcription: "${transcriptionText}"

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

		const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.OPENAI_API_KEY}`
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
						content: analysisPrompt
					}
				],
				max_tokens: 800,
				temperature: 0.3
			})
		});

		if (!analysisResponse.ok) {
			const errorData = await analysisResponse.text();
			console.error('OpenAI analysis error:', errorData);
			return json({
				transcription: { text: transcriptionText, success: true },
				analysis: { success: false, error: 'Failed to analyze transcription' }
			});
		}

		const analysisResult = await analysisResponse.json();
		const analysisContent = analysisResult.choices?.[0]?.message?.content;

		if (!analysisContent) {
			return json({
				transcription: { text: transcriptionText, success: true },
				analysis: { success: false, error: 'No analysis content received' }
			});
		}

		// Clean and parse the JSON response using comprehensive method from original
		let cleanedContent = analysisContent.trim();

		// Remove markdown code blocks (```json and ```)
		if (cleanedContent.startsWith('```json')) {
			cleanedContent = cleanedContent.substring(7);
		} else if (cleanedContent.startsWith('```')) {
			cleanedContent = cleanedContent.substring(3);
		}

		// Remove closing code block
		if (cleanedContent.endsWith('```')) {
			cleanedContent = cleanedContent.substring(0, cleanedContent.length - 3);
		}

		cleanedContent = cleanedContent.trim();

		// Additional cleaning for common JSON issues
		try {
			// Try parsing first to see if it's already valid
			JSON.parse(cleanedContent);
		} catch {
			// If parsing fails, try to fix common issues

			// Replace problematic characters in text fields
			// This regex finds text values and escapes quotes within them
			cleanedContent = cleanedContent.replace(
				/"([^"]*)"(\s*:\s*)"([^"]*(?:\\.[^"]*)*)"/g,
				(match: string, key: string, separator: string, value: string) => {
					// Escape internal quotes and backslashes in the value
					const escapedValue = value
						.replace(/\\/g, '\\\\') // Escape backslashes first
						.replace(/"/g, '\\"') // Escape quotes
						.replace(/\n/g, '\\n') // Escape newlines
						.replace(/\r/g, '\\r') // Escape carriage returns
						.replace(/\t/g, '\\t'); // Escape tabs

					return `"${key}"${separator}"${escapedValue}"`;
				}
			);

			// Fix trailing commas before closing brackets/braces
			cleanedContent = cleanedContent.replace(/,(\s*[}\]])/g, '$1');
		}

		let extractedData;
		try {
			extractedData = JSON.parse(cleanedContent);
		} catch (parseError) {
			console.error('JSON Parse Error:', parseError);
			console.error('Raw AI Response:', analysisContent);
			console.error('Cleaned Content:', cleanedContent);

			return json({
				transcription: { text: transcriptionText, success: true },
				analysis: {
					success: false,
					error: `Failed to parse AI response as JSON: ${
						parseError instanceof Error ? parseError.message : 'Unknown JSON parsing error'
					}. The AI may have generated invalid JSON format.`
				}
			});
		}

		// Ensure we have an array (even if GPT returns a single object)
		const rawResults = Array.isArray(extractedData) ? extractedData : [extractedData];

		// Validate and structure each hive's data using original validation logic
		const inspectionResults = [];

		for (const hiveData of rawResults) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const data = hiveData as any;
			// Skip if no bikupa identifier (required field)
			if (!data.bikupa) continue;

			const inspectionResult: Record<string, unknown> = {
				bikupa: data.bikupa
			};

			// Add all the validation from original code
			if (data.bigård) inspectionResult.bigård = data.bigård;
			if (data.finnsDrottning === 'ja' || data.finnsDrottning === 'nej') {
				inspectionResult.finnsDrottning = data.finnsDrottning;
			}
			if (data.nylagdaÄgg === 'ja' || data.nylagdaÄgg === 'nej') {
				inspectionResult.nylagdaÄgg = data.nylagdaÄgg;
			}
			if (typeof data.mängdBin === 'number' && data.mängdBin >= 1 && data.mängdBin <= 5) {
				inspectionResult.mängdBin = data.mängdBin;
			}
			if (typeof data.binasHälsa === 'number' && data.binasHälsa >= 1 && data.binasHälsa <= 5) {
				inspectionResult.binasHälsa = data.binasHälsa;
			}

			// Extended fields - Brood & Food (1-5 scale)
			if (typeof data.yngelstatus === 'number' && data.yngelstatus >= 1 && data.yngelstatus <= 5) {
				inspectionResult.yngelstatus = data.yngelstatus;
			}
			if (typeof data.foder === 'number' && data.foder >= 1 && data.foder <= 5) {
				inspectionResult.foder = data.foder;
			}

			// Extended fields - Behavior & Risk (1-5 scale)
			if (
				typeof data.svärmningsrisk === 'number' &&
				data.svärmningsrisk >= 1 &&
				data.svärmningsrisk <= 5
			) {
				inspectionResult.svärmningsrisk = data.svärmningsrisk;
			}
			if (
				typeof data.aktivitetVidFlustret === 'number' &&
				data.aktivitetVidFlustret >= 1 &&
				data.aktivitetVidFlustret <= 5
			) {
				inspectionResult.aktivitetVidFlustret = data.aktivitetVidFlustret;
			}
			if (
				typeof data.aggressivitet === 'number' &&
				data.aggressivitet >= 1 &&
				data.aggressivitet <= 5
			) {
				inspectionResult.aggressivitet = data.aggressivitet;
			}

			// Extended fields - Environmental
			if (typeof data.väder === 'string' && data.väder.trim()) {
				inspectionResult.väder = data.väder.trim();
			}
			if (typeof data.växtDragförhållanden === 'string' && data.växtDragförhållanden.trim()) {
				inspectionResult.växtDragförhållanden = data.växtDragförhållanden.trim();
			}

			// Extended fields - Health & Condition (ja/nej and 1-5)
			if (data.fuktMögel === 'ja' || data.fuktMögel === 'nej') {
				inspectionResult.fuktMögel = data.fuktMögel;
			}
			if (
				typeof data.varroastatus === 'number' &&
				data.varroastatus >= 1 &&
				data.varroastatus <= 5
			) {
				inspectionResult.varroastatus = data.varroastatus;
			}
			if (typeof data.kupansSkick === 'number' && data.kupansSkick >= 1 && data.kupansSkick <= 5) {
				inspectionResult.kupansSkick = data.kupansSkick;
			}

			// Extended fields - Honey Production (numbers and ja/nej)
			if (typeof data.antalSkattlådar === 'number' && data.antalSkattlådar >= 0) {
				inspectionResult.antalSkattlådar = Math.floor(data.antalSkattlådar);
			}
			if (data.skattlådorFulla === 'ja' || data.skattlådorFulla === 'nej') {
				inspectionResult.skattlådorFulla = data.skattlådorFulla;
			}

			// Extended fields - Planning
			if (typeof data.planeradÅtgärd === 'string' && data.planeradÅtgärd.trim()) {
				inspectionResult.planeradÅtgärd = data.planeradÅtgärd.trim();
			}

			// Confidence tracking
			if (typeof data.extractionConfidence === 'number') {
				inspectionResult.extractionConfidence = Math.max(0, Math.min(1, data.extractionConfidence));
			}

			inspectionResults.push(inspectionResult);
		}

		return json({
			transcription: { text: transcriptionText, success: true },
			analysis: { inspectionResults, success: true }
		});
	} catch (err) {
		console.error('Server error:', err);
		return error(500, 'Internal server error');
	}
};
