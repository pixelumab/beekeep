import type { BeekeepingInspectionResult } from '$lib/types.js';

export interface TranscriptionResult {
	text: string;
	success: boolean;
	error?: string;
}

export interface HiveAnalysisResult {
	inspectionResults?: BeekeepingInspectionResult[];
	success: boolean;
	error?: string;
}

/**
 * Combined function to transcribe audio and analyze hive status using our secure internal API
 */
export async function transcribeAndAnalyze(audioBlob: Blob): Promise<{
	transcription: TranscriptionResult;
	analysis: HiveAnalysisResult;
}> {
	try {
		// Create form data with audio file
		const formData = new FormData();
		formData.append('audio', audioBlob, 'recording.webm');

		// Call our secure internal API endpoint
		const response = await fetch('/api/transcribe', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const errorText = await response.text();
			return {
				transcription: {
					text: '',
					success: false,
					error: `Server error: ${response.status} - ${errorText}`
				},
				analysis: {
					success: false,
					error: 'Transcription failed, cannot analyze'
				}
			};
		}

		const result = await response.json();
		
		return {
			transcription: result.transcription || {
				text: '',
				success: false,
				error: 'No transcription result received'
			},
			analysis: result.analysis || {
				success: false,
				error: 'No analysis result received'
			}
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			transcription: {
				text: '',
				success: false,
				error: `Network error: ${errorMessage}`
			},
			analysis: {
				success: false,
				error: 'Network error prevented analysis'
			}
		};
	}
}

// Keep these for backward compatibility in case they're used elsewhere
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
	const result = await transcribeAndAnalyze(audioBlob);
	return result.transcription;
}

export async function analyzeHiveStatus(transcription: string): Promise<HiveAnalysisResult> {
	// For now, this would require a separate endpoint or modification
	// Since we're doing this together in the main function, return error
	return {
		success: false,
		error: 'Use transcribeAndAnalyze function for full functionality'
	};
}