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
		transcribeFormData.append('file', audioFile);
		transcribeFormData.append('model', 'whisper-1');
		transcribeFormData.append('response_format', 'json');

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

		const transcribeResult = await transcribeResponse.json();
		const transcriptionText = transcribeResult.text;

		if (!transcriptionText || transcriptionText.trim() === '') {
			return json({
				transcription: { text: '', success: false, error: 'No speech detected in audio' },
				analysis: { success: false, error: 'No text to analyze' }
			});
		}

		// Analyze the transcription with GPT
		const analysisPrompt = `
You are a beekeeping expert assistant. Analyze the following transcription of a hive inspection and extract structured data.

Extract information about each hive mentioned, including:
- bikupa (hive identifier/name if mentioned)
- bigård (apiary/location if mentioned)
- finnsDrottning (queen present: "ja" or "nej")
- nylagdaÄgg (fresh eggs: "ja" or "nej") 
- mängdBin (bee population: 1-5 scale)
- binasHälsa (bee health: 1-5 scale)
- yngelstatus (brood status: 1-5 scale)
- foder (food stores: 1-5 scale)
- svärmningsrisk (swarming risk: 1-5 scale)
- aktivitetVidFlustret (activity at entrance: 1-5 scale)
- aggressivitet (aggressiveness: 1-5 scale)
- väder (weather description)
- växtDragförhållanden (plant/flow conditions)
- fuktMögel (moisture/mold: "ja" or "nej")
- varroastatus (varroa status: 1-5 scale)
- kupansSkick (hive condition: 1-5 scale)
- antalSkattlådar (number of honey supers)
- skattlådorFulla (honey supers full: "ja" or "nej")
- planeradÅtgärd (planned action/notes)
- extractionConfidence (confidence in extraction: 0-1)

Return ONLY a JSON object with an array of hive inspection results. If multiple hives are mentioned, create separate objects for each.

Transcription: "${transcriptionText}"
`;

		const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.OPENAI_API_KEY}`
			},
			body: JSON.stringify({
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						content: analysisPrompt
					}
				],
				temperature: 0.1,
				max_tokens: 2000
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

		// Clean and parse the JSON response
		let cleanedContent = analysisContent.trim();
		if (cleanedContent.startsWith('```json')) {
			cleanedContent = cleanedContent.substring(7);
		} else if (cleanedContent.startsWith('```')) {
			cleanedContent = cleanedContent.substring(3);
		}
		if (cleanedContent.endsWith('```')) {
			cleanedContent = cleanedContent.substring(0, cleanedContent.length - 3);
		}

		try {
			const parsedAnalysis = JSON.parse(cleanedContent);
			const inspectionResults = Array.isArray(parsedAnalysis) ? parsedAnalysis : [parsedAnalysis];

			return json({
				transcription: { text: transcriptionText, success: true },
				analysis: { inspectionResults, success: true }
			});
		} catch (parseError) {
			console.error('Failed to parse analysis JSON:', parseError);
			console.error('Content:', cleanedContent);
			return json({
				transcription: { text: transcriptionText, success: true },
				analysis: { success: false, error: 'Failed to parse analysis results' }
			});
		}
	} catch (err) {
		console.error('Server error:', err);
		return error(500, 'Internal server error');
	}
};