<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		activeSession,
		sessions,
		hives,
		inspections,
		getActiveSession,
		getHives
	} from '$lib/stores.svelte.js';
	import type { InspectionSession, Hive, BeekeepingInspectionResult } from '$lib/types.js';
	import { transcribeAndAnalyze } from '$lib/services/openai.js';

	let session = $derived(getActiveSession());
	let availableHives = $derived(hives.getActiveHives(getHives()));

	// Audio recording state
	let mediaRecorder: MediaRecorder | null = $state(null);
	let audioStream: MediaStream | null = $state(null);
	let isRecording = $state(false);
	let audioChunks: Blob[] = $state([]);
	let recordedAudio: string | null = $state(null);
	let recordingDuration = $state(0);
	let durationInterval: number | null = $state(null);
	let permissionStatus = $state<'requesting' | 'granted' | 'denied' | 'unsupported'>('requesting');

	// Transcription state
	let isTranscribing = $state(false);
	let transcriptionResult = $state<string>('');
	let inspectionData = $state<BeekeepingInspectionResult[]>([]);
	let transcriptionError = $state<string>('');
	let savedInspections = $state<string[]>([]); // Track saved hive names
	let savedHiveIds = $state<string[]>([]); // Track saved hive IDs for navigation
	let unmatchedData = $state<BeekeepingInspectionResult[]>([]); // Track unmatched inspection data
	let manualAssignments = $state<Record<number, string>>({}); // Track manual hive assignments by index

	onMount(() => {
		activeSession.load();
		hives.load();
		inspections.load();

		if (!session) {
			goto('/');
			return;
		}

		// Check microphone support and start recording
		checkMicrophoneSupport();
	});

	function checkMicrophoneSupport() {
		if (
			!navigator.mediaDevices ||
			!navigator.mediaDevices.getUserMedia ||
			typeof MediaRecorder === 'undefined'
		) {
			permissionStatus = 'unsupported';
			return;
		}
		requestMicrophoneAccess();
	}

	function requestMicrophoneAccess() {
		permissionStatus = 'requesting';

		navigator.mediaDevices
			.getUserMedia({ audio: true })
			.then((stream) => {
				audioStream = stream;
				permissionStatus = 'granted';
				setupMediaRecorder(stream);
			})
			.catch((err) => {
				permissionStatus = 'denied';
			});
	}

	function setupMediaRecorder(stream: MediaStream) {
		audioChunks = [];
		mediaRecorder = new MediaRecorder(stream);

		mediaRecorder.ondataavailable = (e) => {
			audioChunks.push(e.data);
		};

		mediaRecorder.onstop = () => {
			const blob = new Blob(audioChunks, { type: 'audio/webm' });
			audioChunks = [];
			recordedAudio = window.URL.createObjectURL(blob);
		};

		startRecording();
	}

	function startRecording() {
		if (!mediaRecorder) return;

		mediaRecorder.start();
		isRecording = true;
		recordingDuration = 0;

		if (durationInterval) clearInterval(durationInterval);
		durationInterval = setInterval(() => {
			recordingDuration++;
		}, 1000);
	}

	function stopRecording() {
		if (mediaRecorder && isRecording) {
			mediaRecorder.stop();
			isRecording = false;

			if (durationInterval) {
				clearInterval(durationInterval);
			}
		}
	}

	function formatRecordingDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const remainingSeconds = seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
		} else {
			return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
		}
	}

	async function endSession() {
		if (isRecording) stopRecording();

		if (session) {
			let audioBlob: string | undefined;

			// Convert recorded audio to base64 for persistent storage
			if (recordedAudio) {
				try {
					const response = await fetch(recordedAudio);
					const blob = await response.blob();
					const reader = new FileReader();
					audioBlob = await new Promise((resolve) => {
						reader.onload = () => resolve(reader.result as string);
						reader.readAsDataURL(blob);
					});
				} catch (error) {
					console.error('Failed to convert audio to base64:', error);
				}
			}

			const updatedSession: InspectionSession = {
				...session,
				endTime: new Date().toISOString(),
				duration: recordingDuration,
				hiveId: undefined,
				hiveName: undefined,
				notes: undefined,
				audioUrl: recordedAudio || undefined, // Keep for current session playback
				audioBlob: audioBlob || undefined, // Store for persistent playback
				transcription: transcriptionResult || undefined,
				inspectionResults: inspectionData.length > 0 ? inspectionData : undefined,
				transcriptionTimestamp: transcriptionResult ? new Date().toISOString() : undefined
			};

			sessions.add(updatedSession);
			activeSession.clear();
		}

		if (audioStream) {
			audioStream.getTracks().forEach((track) => track.stop());
		}

		goto('/');
	}

	// Helper function to match bikupa identifier to existing hives (copied from stores)
	function findMatchingHive(bikupaId: string | undefined, allHives: Hive[]): Hive | null {
		if (!bikupaId) return null;

		const searchTerm = bikupaId.toLowerCase().trim();

		// Direct name match
		let match = allHives.find((h) => h.name.toLowerCase() === searchTerm);
		if (match) return match;

		// Partial name match
		match = allHives.find((h) => h.name.toLowerCase().includes(searchTerm));
		if (match) return match;

		// Number extraction (e.g., "bikupa 1" matches hive named "Main Hive" if it's the first one)
		const numberMatch = searchTerm.match(/\d+/);
		if (numberMatch) {
			const num = parseInt(numberMatch[0]);
			// Try to match by position (1-indexed)
			if (num > 0 && num <= allHives.length) {
				return allHives[num - 1];
			}
		}

		return null;
	}

	async function processManualAssignments() {
		if (!session || unmatchedData.length === 0) return;

		// Build assignments array from manual selections
		const assignments = Object.entries(manualAssignments)
			.filter(([_, hiveId]) => hiveId) // Only include assignments with selected hives
			.map(([indexStr, hiveId]) => ({
				result: unmatchedData[parseInt(indexStr)],
				hiveId: hiveId as string
			}));

		if (assignments.length === 0) return;

		console.log('📝 Processing manual assignments:', assignments);

		// Process manual assignments using the store function
		const newInspections = inspections.processManualAssignments(
			session.id,
			assignments,
			availableHives
		);

		console.log('✅ Manual assignments saved:', newInspections);

		// Update UI state
		const assignedIndices = Object.keys(manualAssignments)
			.filter((key) => manualAssignments[parseInt(key)])
			.map((key) => parseInt(key));

		// Remove assigned items from unmatched data
		unmatchedData = unmatchedData.filter((_, index) => !assignedIndices.includes(index));

		// Clear manual assignments
		manualAssignments = {};

		// Add new inspections to saved lists for navigation
		const newHiveNames = newInspections
			.map((inspection) => inspection.hiveName)
			.filter((name): name is string => name !== undefined);
		const newHiveIds = newInspections.map((inspection) => inspection.hiveId);

		savedInspections = [...savedInspections, ...newHiveNames];
		savedHiveIds = [...savedHiveIds, ...newHiveIds];
	}

	async function handleTranscription() {
		if (!recordedAudio) return;

		isTranscribing = true;
		transcriptionError = '';

		try {
			// Convert audio URL back to blob for API
			const response = await fetch(recordedAudio);
			const audioBlob = await response.blob();

			console.log('🎤 Starting transcription...', { audioBlob: audioBlob.size + ' bytes' });

			const { transcription, analysis } = await transcribeAndAnalyze(audioBlob);

			console.log('🎤 Transcription result:', transcription);
			console.log('🧠 Analysis result:', analysis);

			if (transcription.success) {
				transcriptionResult = transcription.text;
				console.log('✅ Transcription successful:', transcription.text);

				if (
					analysis.success &&
					analysis.inspectionResults &&
					analysis.inspectionResults.length > 0
				) {
					inspectionData = analysis.inspectionResults;
					console.log('✅ Analysis successful:', analysis.inspectionResults);

					// Process inspections and save to store
					if (session) {
						const { matched, unmatched } = inspections.processInspectionResults(
							session.id,
							analysis.inspectionResults,
							availableHives
						);
						console.log('📊 Created inspections:', matched);
						console.log('📊 Unmatched data:', unmatched);

						// Store unmatched data for manual assignment
						unmatchedData = unmatched;

						// Track saved hive names and IDs for success feedback and navigation
						savedInspections = matched
							.map((inspection) => inspection.hiveName)
							.filter((name): name is string => name !== undefined);
						savedHiveIds = matched.map((inspection) => inspection.hiveId);
					}
				} else {
					transcriptionError = analysis.error || 'Failed to analyze transcription';
					console.error('❌ Analysis failed:', analysis.error);
				}
			} else {
				transcriptionError = transcription.error || 'Failed to transcribe audio';
				console.error('❌ Transcription failed:', transcription.error);
			}
		} catch (error) {
			transcriptionError = error instanceof Error ? error.message : 'Transcription failed';
			console.error('❌ Transcription error:', error);
		} finally {
			isTranscribing = false;
		}
	}
</script>

<!-- Mobile-first session recording page -->
<div class="min-h-full bg-gradient-to-b from-gray-900 to-slate-900 text-white">
	{#if permissionStatus === 'requesting'}
		<!-- Requesting permission state -->
		<div class="flex flex-col items-center justify-center min-h-full px-4 text-center">
			<div
				class="animate-spin rounded-full h-12 w-12 border-2 border-amber-400 border-t-transparent mb-6"
			></div>
			<h2 class="text-xl font-bold mb-2">Förbereder Inspelning</h2>
			<p class="text-gray-300 mb-4">Begär mikrofonråtkomst...</p>
			<p class="text-gray-400 text-sm mb-6">Kontrollera efter en rättighetsprompt</p>
			<button
				onclick={() => (permissionStatus = 'denied')}
				class="text-gray-400 text-sm active:text-white transition-colors"
			>
				Avbryt Installation
			</button>
		</div>
	{:else if permissionStatus === 'denied'}
		<!-- Permission denied state -->
		<div class="flex flex-col items-center justify-center min-h-full px-4 text-center">
			<div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
				<div class="text-2xl">●</div>
			</div>
			<h2 class="text-xl font-bold mb-2">Mikrofonråtkomst Krävs</h2>
			<p class="text-gray-300 mb-6 text-sm">
				Vänligen tillåt mikrofonråtkomst för att spela in din kupinspektionssession
			</p>
			<button
				onclick={requestMicrophoneAccess}
				class="bg-amber-600 text-white py-3 px-6 rounded-xl font-medium active:scale-95 transition-all duration-200"
			>
				Försök Igen
			</button>
		</div>
	{:else if permissionStatus === 'unsupported'}
		<div class="flex flex-col items-center justify-center min-h-full px-4 text-center">
			<div class="text-4xl mb-4">❌</div>
			<h2 class="text-xl font-bold mb-2">Inspelning Inte Tillgänglig</h2>
			<p class="text-gray-300 mb-6 text-sm">
				Ljudinspelning kräver en modern webbläsare med mikrofonstöd.
			</p>
			<button
				onclick={() => {
					activeSession.clear();
					goto('/');
				}}
				class="bg-gray-600 text-white py-3 px-6 rounded-xl font-medium active:scale-95 transition-all duration-200"
			>
				Gå Tillbaka
			</button>
		</div>
	{:else}
		<!-- Recording interface -->
		<div class="flex flex-col min-h-full">
			<!-- Header -->
			<div class="px-4 py-4 border-b border-gray-700">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-lg font-bold">Inspelningssession</h1>
						<p class="text-sm text-gray-300">
							{new Date().toLocaleDateString('sv-SE', {
								month: 'short',
								day: 'numeric'
							})}
						</p>
					</div>
					<button
						onclick={endSession}
						class="px-3 py-1.5 bg-red-600/20 border border-red-600 text-red-400 rounded-lg active:bg-red-600/30 transition-colors text-sm font-medium"
					>
						Avsluta Session
					</button>
				</div>
			</div>

			<!-- Main recording area -->
			<div class="flex-1 flex flex-col justify-center items-center px-4 py-8">
				{#if isRecording}
					<!-- Recording active -->
					<div class="text-center">
						<div
							class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6"
						>
							<div class="text-3xl text-green-500 animate-pulse">●</div>
						</div>
						<h2 class="text-2xl font-bold mb-2">Spelar in</h2>
						<p class="text-3xl font-mono text-amber-400 mb-6">
							{formatRecordingDuration(recordingDuration)}
						</p>
						<button
							onclick={stopRecording}
							class="w-full max-w-xs bg-red-600 text-white py-4 px-6 rounded-xl font-medium active:scale-95 transition-all duration-200"
						>
							■ Stoppa Inspelning
						</button>
					</div>
				{:else if recordedAudio}
					<!-- Recording completed -->
					<div class="text-center">
						<div
							class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6"
						>
							<div class="text-3xl text-green-500">✓</div>
						</div>
						<h2 class="text-2xl font-bold mb-2">Inspelning Klar</h2>
						<p class="text-xl text-amber-400 mb-6">{formatRecordingDuration(recordingDuration)}</p>

						<!-- Audio playback following MDN pattern -->
						<div class="w-full max-w-xs mb-6">
							<audio controls class="w-full h-10 rounded-lg" preload="none" src={recordedAudio}>
								Your browser does not support audio playback.
							</audio>
						</div>

						<!-- Transcription section -->
						{#if transcriptionResult}
							<div class="w-full max-w-xs mb-6 p-4 bg-gray-800 rounded-xl text-left">
								<h3 class="text-sm font-medium text-amber-400 mb-2">Transcription</h3>
								<p class="text-sm text-gray-200 mb-3">{transcriptionResult}</p>

								{#if inspectionData.length > 0}
									<div class="border-t border-gray-700 pt-3 space-y-3">
										<h4 class="text-sm font-medium text-green-400 mb-2">
											Extraherad Data ({inspectionData.length} kup{inspectionData.length > 1
												? 'or'
												: 'a'})
										</h4>

										<!-- Assignment Preview Summary -->
										{#if inspectionData.some((hive) => !findMatchingHive(hive.bikupa, availableHives))}
											<div class="text-xs text-gray-400 mb-3 flex items-center gap-4">
												<span class="flex items-center gap-1">
													<span class="text-green-400">✓</span>
													{inspectionData.filter((hive) =>
														findMatchingHive(hive.bikupa, availableHives)
													).length} auto-matchade
												</span>
												<span class="flex items-center gap-1">
													<span class="text-orange-400">!</span>
													{inspectionData.filter(
														(hive) => !findMatchingHive(hive.bikupa, availableHives)
													).length} behöver manuell tilldelning
												</span>
											</div>
										{:else}
											<div class="text-xs text-gray-400 mb-3">
												<span class="flex items-center gap-1">
													<span class="text-green-400">✓</span>
													Alla {inspectionData.length} kup{inspectionData.length > 1 ? 'or' : 'a'} auto-matchade
												</span>
											</div>
										{/if}

										{#if savedInspections.length > 0}
											<div class="bg-green-900/20 border border-green-600 rounded-lg p-3 mb-3">
												<div class="flex items-center gap-2 mb-2">
													<span class="text-green-400 text-sm">✓</span>
													<span class="text-green-400 text-sm font-medium">
														Sparad till {savedInspections.length} kup{savedInspections.length > 1
															? 'or'
															: 'a'}:
													</span>
												</div>
												<div class="space-y-2">
													{#each savedInspections as hiveName, index}
														<div
															class="flex items-center justify-between bg-green-800/30 px-2 py-1 rounded-lg"
														>
															<span class="text-xs text-green-300">{hiveName}</span>
															<button
																onclick={() => goto(`/hives/${savedHiveIds[index]}?from=session`)}
																class="text-xs bg-green-600 text-white px-2 py-1 rounded active:scale-95 transition-transform"
															>
																Visa
															</button>
														</div>
													{/each}
													<button
														onclick={() => goto('/hives')}
														class="w-full text-xs bg-green-700 text-white py-2 px-3 rounded-lg active:scale-95 transition-transform mt-2"
													>
														Visa Alla Kupor
													</button>
												</div>
											</div>
										{/if}

										{#each inspectionData as hiveData, index}
											{@const matchedHive = findMatchingHive(hiveData.bikupa, availableHives)}
											<div class="bg-gray-700 rounded-lg p-3 space-y-2">
												<div class="flex items-center justify-between">
													<div class="text-xs font-medium text-amber-400">
														Hive {index + 1}
														{#if hiveData.bikupa}
															- {hiveData.bikupa}
														{/if}
													</div>
													{#if matchedHive}
														<span
															class="text-xs bg-green-600/30 text-green-300 px-2 py-1 rounded-full"
														>
															→ {matchedHive.name}
														</span>
													{:else}
														<span class="text-xs bg-red-600/30 text-red-300 px-2 py-1 rounded-full">
															Ingen matchning
														</span>
													{/if}
												</div>

												{#if hiveData.bigård}
													<div class="text-xs">
														<span class="text-gray-400">Bigård:</span>
														<span class="text-white ml-1">{hiveData.bigård}</span>
													</div>
												{/if}

												{#if hiveData.finnsDrottning}
													<div class="text-xs">
														<span class="text-gray-400">Finns drottning:</span>
														<span class="text-white ml-1 capitalize">{hiveData.finnsDrottning}</span
														>
													</div>
												{/if}

												{#if hiveData.nylagdaÄgg}
													<div class="text-xs">
														<span class="text-gray-400">Nylagda ägg:</span>
														<span class="text-white ml-1 capitalize">{hiveData.nylagdaÄgg}</span>
													</div>
												{/if}

												{#if hiveData.mängdBin}
													<div class="text-xs">
														<span class="text-gray-400">Mängd bin:</span>
														<span class="text-white ml-1">{hiveData.mängdBin}/5</span>
													</div>
												{/if}

												{#if hiveData.binasHälsa}
													<div class="text-xs">
														<span class="text-gray-400">Binas hälsa:</span>
														<span class="text-white ml-1">{hiveData.binasHälsa}/5</span>
													</div>
												{/if}

												{#if hiveData.yngelstatus}
													<div class="text-xs">
														<span class="text-gray-400">Yngelstatus:</span>
														<span class="text-white ml-1 {hiveData.yngelstatus <= 2 ? 'text-red-300' : hiveData.yngelstatus === 3 ? 'text-yellow-300' : 'text-green-300'}">{hiveData.yngelstatus}/5</span>
													</div>
												{/if}

												{#if hiveData.foder}
													<div class="text-xs">
														<span class="text-gray-400">Foder:</span>
														<span class="text-white ml-1 {hiveData.foder <= 2 ? 'text-red-300' : hiveData.foder === 3 ? 'text-yellow-300' : 'text-green-300'}">{hiveData.foder}/5</span>
													</div>
												{/if}

												{#if hiveData.svärmningsrisk}
													<div class="text-xs">
														<span class="text-gray-400">Svärmningsrisk:</span>
														<span class="text-white ml-1 {hiveData.svärmningsrisk >= 4 ? 'text-red-300' : hiveData.svärmningsrisk === 3 ? 'text-yellow-300' : 'text-green-300'}">{hiveData.svärmningsrisk}/5</span>
													</div>
												{/if}

												{#if hiveData.aktivitetVidFlustret}
													<div class="text-xs">
														<span class="text-gray-400">Aktivitet vid flustret:</span>
														<span class="text-white ml-1">{hiveData.aktivitetVidFlustret}/5</span>
													</div>
												{/if}

												{#if hiveData.aggressivitet}
													<div class="text-xs">
														<span class="text-gray-400">Aggressivitet:</span>
														<span class="text-white ml-1 {hiveData.aggressivitet >= 4 ? 'text-red-300' : hiveData.aggressivitet === 3 ? 'text-yellow-300' : 'text-green-300'}">{hiveData.aggressivitet}/5</span>
													</div>
												{/if}

												{#if hiveData.väder}
													<div class="text-xs">
														<span class="text-gray-400">Väder:</span>
														<span class="text-white ml-1">{hiveData.väder}</span>
													</div>
												{/if}

												{#if hiveData.växtDragförhållanden}
													<div class="text-xs">
														<span class="text-gray-400">Växt/dragförhållanden:</span>
														<span class="text-white ml-1">{hiveData.växtDragförhållanden}</span>
													</div>
												{/if}

												{#if hiveData.fuktMögel}
													<div class="text-xs">
														<span class="text-gray-400">Fukt/mögel:</span>
														<span class="text-white ml-1 capitalize {hiveData.fuktMögel === 'ja' ? 'text-red-300' : 'text-green-300'}">{hiveData.fuktMögel}</span>
													</div>
												{/if}

												{#if hiveData.varroastatus}
													<div class="text-xs">
														<span class="text-gray-400">Varroa status:</span>
														<span class="text-white ml-1 {hiveData.varroastatus >= 4 ? 'text-red-300' : hiveData.varroastatus === 3 ? 'text-yellow-300' : 'text-green-300'}">{hiveData.varroastatus}/5</span>
													</div>
												{/if}

												{#if hiveData.kupansSkick}
													<div class="text-xs">
														<span class="text-gray-400">Kupans skick:</span>
														<span class="text-white ml-1 {hiveData.kupansSkick <= 2 ? 'text-red-300' : hiveData.kupansSkick === 3 ? 'text-yellow-300' : 'text-green-300'}">{hiveData.kupansSkick}/5</span>
													</div>
												{/if}

												{#if hiveData.antalSkattlådar !== undefined}
													<div class="text-xs">
														<span class="text-gray-400">Antal skattlådor:</span>
														<span class="text-white ml-1">{hiveData.antalSkattlådar}</span>
													</div>
												{/if}

												{#if hiveData.skattlådorFulla}
													<div class="text-xs">
														<span class="text-gray-400">Skattlådor fulla:</span>
														<span class="text-white ml-1 capitalize">{hiveData.skattlådorFulla}</span>
													</div>
												{/if}

												{#if hiveData.planeradÅtgärd}
													<div class="text-xs">
														<span class="text-gray-400">Planerad åtgärd:</span>
														<span class="text-white ml-1">{hiveData.planeradÅtgärd}</span>
													</div>
												{/if}

												{#if hiveData.extractionConfidence}
													<div class="text-xs text-gray-500">
														Confidence: {Math.round(hiveData.extractionConfidence * 100)}%
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{/if}

								<!-- Omatchade Data Section -->
								{#if unmatchedData.length > 0}
									<div class="border-t border-gray-700 pt-3 space-y-3">
										<h4 class="text-sm font-medium text-orange-400 mb-2">
											Omatchade Data ({unmatchedData.length} kup{unmatchedData.length > 1
												? 'or'
												: 'a'})
										</h4>
										<p class="text-xs text-orange-300 mb-3">
											Dessa kupor kunde inte matchas automatiskt. Vänligen tilldela dem manuellt:
										</p>

										{#each unmatchedData as unmatched, index}
											<div
												class="bg-orange-900/20 border border-orange-600 rounded-lg p-3 space-y-2"
											>
												<div class="flex items-center justify-between">
													<div class="text-xs font-medium text-orange-400">
														Omatchad Kupa {index + 1}
														{#if unmatched.bikupa}
															- {unmatched.bikupa}
														{/if}
													</div>
												</div>

												{#if unmatched.bigård}
													<div class="text-xs">
														<span class="text-gray-400">Bigård:</span>
														<span class="text-white ml-1">{unmatched.bigård}</span>
													</div>
												{/if}

												{#if unmatched.finnsDrottning}
													<div class="text-xs">
														<span class="text-gray-400">Finns drottning:</span>
														<span class="text-white ml-1 capitalize"
															>{unmatched.finnsDrottning}</span
														>
													</div>
												{/if}

												{#if unmatched.nylagdaÄgg}
													<div class="text-xs">
														<span class="text-gray-400">Nylagda ägg:</span>
														<span class="text-white ml-1 capitalize">{unmatched.nylagdaÄgg}</span>
													</div>
												{/if}

												{#if unmatched.mängdBin}
													<div class="text-xs">
														<span class="text-gray-400">Mängd bin:</span>
														<span class="text-white ml-1">{unmatched.mängdBin}/5</span>
													</div>
												{/if}

												{#if unmatched.binasHälsa}
													<div class="text-xs">
														<span class="text-gray-400">Binas hälsa:</span>
														<span class="text-white ml-1">{unmatched.binasHälsa}/5</span>
													</div>
												{/if}

												{#if unmatched.yngelstatus}
													<div class="text-xs">
														<span class="text-gray-400">Yngelstatus:</span>
														<span class="text-white ml-1 {unmatched.yngelstatus <= 2 ? 'text-red-300' : unmatched.yngelstatus === 3 ? 'text-yellow-300' : 'text-green-300'}">{unmatched.yngelstatus}/5</span>
													</div>
												{/if}

												{#if unmatched.foder}
													<div class="text-xs">
														<span class="text-gray-400">Foder:</span>
														<span class="text-white ml-1 {unmatched.foder <= 2 ? 'text-red-300' : unmatched.foder === 3 ? 'text-yellow-300' : 'text-green-300'}">{unmatched.foder}/5</span>
													</div>
												{/if}

												{#if unmatched.svärmningsrisk}
													<div class="text-xs">
														<span class="text-gray-400">Svärmningsrisk:</span>
														<span class="text-white ml-1 {unmatched.svärmningsrisk >= 4 ? 'text-red-300' : unmatched.svärmningsrisk === 3 ? 'text-yellow-300' : 'text-green-300'}">{unmatched.svärmningsrisk}/5</span>
													</div>
												{/if}

												{#if unmatched.aktivitetVidFlustret}
													<div class="text-xs">
														<span class="text-gray-400">Aktivitet vid flustret:</span>
														<span class="text-white ml-1">{unmatched.aktivitetVidFlustret}/5</span>
													</div>
												{/if}

												{#if unmatched.aggressivitet}
													<div class="text-xs">
														<span class="text-gray-400">Aggressivitet:</span>
														<span class="text-white ml-1 {unmatched.aggressivitet >= 4 ? 'text-red-300' : unmatched.aggressivitet === 3 ? 'text-yellow-300' : 'text-green-300'}">{unmatched.aggressivitet}/5</span>
													</div>
												{/if}

												{#if unmatched.väder}
													<div class="text-xs">
														<span class="text-gray-400">Väder:</span>
														<span class="text-white ml-1">{unmatched.väder}</span>
													</div>
												{/if}

												{#if unmatched.växtDragförhållanden}
													<div class="text-xs">
														<span class="text-gray-400">Växt/dragförhållanden:</span>
														<span class="text-white ml-1">{unmatched.växtDragförhållanden}</span>
													</div>
												{/if}

												{#if unmatched.fuktMögel}
													<div class="text-xs">
														<span class="text-gray-400">Fukt/mögel:</span>
														<span class="text-white ml-1 capitalize {unmatched.fuktMögel === 'ja' ? 'text-red-300' : 'text-green-300'}">{unmatched.fuktMögel}</span>
													</div>
												{/if}

												{#if unmatched.varroastatus}
													<div class="text-xs">
														<span class="text-gray-400">Varroa status:</span>
														<span class="text-white ml-1 {unmatched.varroastatus >= 4 ? 'text-red-300' : unmatched.varroastatus === 3 ? 'text-yellow-300' : 'text-green-300'}">{unmatched.varroastatus}/5</span>
													</div>
												{/if}

												{#if unmatched.kupansSkick}
													<div class="text-xs">
														<span class="text-gray-400">Kupans skick:</span>
														<span class="text-white ml-1 {unmatched.kupansSkick <= 2 ? 'text-red-300' : unmatched.kupansSkick === 3 ? 'text-yellow-300' : 'text-green-300'}">{unmatched.kupansSkick}/5</span>
													</div>
												{/if}

												{#if unmatched.antalSkattlådar !== undefined}
													<div class="text-xs">
														<span class="text-gray-400">Antal skattlådor:</span>
														<span class="text-white ml-1">{unmatched.antalSkattlådar}</span>
													</div>
												{/if}

												{#if unmatched.skattlådorFulla}
													<div class="text-xs">
														<span class="text-gray-400">Skattlådor fulla:</span>
														<span class="text-white ml-1 capitalize">{unmatched.skattlådorFulla}</span>
													</div>
												{/if}

												{#if unmatched.planeradÅtgärd}
													<div class="text-xs">
														<span class="text-gray-400">Planerad åtgärd:</span>
														<span class="text-white ml-1">{unmatched.planeradÅtgärd}</span>
													</div>
												{/if}

												{#if unmatched.extractionConfidence}
													<div class="text-xs text-gray-500">
														Confidence: {Math.round(unmatched.extractionConfidence * 100)}%
													</div>
												{/if}

												<!-- Hive Selection Dropdown -->
												<div class="border-t border-orange-700 pt-2">
													<label class="block text-xs text-orange-300 mb-1"
														>Tilldela till kupa:</label
													>
													<select
														bind:value={manualAssignments[index]}
														class="w-full px-2 py-1 bg-gray-800 border border-orange-600 text-white text-xs rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
													>
														<option value="">Välj en kupa...</option>
														{#each availableHives as hive}
															<option value={hive.id}>{hive.name}</option>
														{/each}
													</select>
												</div>
											</div>
										{/each}

										{#if Object.keys(manualAssignments).some((key) => manualAssignments[parseInt(key)])}
											<button
												onclick={processManualAssignments}
												class="w-full text-xs bg-orange-600 text-white py-2 px-3 rounded-lg active:scale-95 transition-transform mt-2"
											>
												Spara Manuella Tilldelningar
											</button>
										{/if}
									</div>
								{/if}
							</div>
						{:else if isTranscribing}
							<div class="w-full max-w-xs mb-6 p-4 bg-gray-800 rounded-xl text-center">
								<div
									class="animate-spin rounded-full h-6 w-6 border-2 border-amber-400 border-t-transparent mx-auto mb-2"
								></div>
								<p class="text-sm text-amber-400">Transkriberar ljud...</p>
							</div>
						{:else}
							<button
								onclick={handleTranscription}
								class="w-full max-w-xs bg-blue-600 text-white py-3 px-6 rounded-xl font-medium active:scale-95 transition-all duration-200 mb-3"
							>
								Transkribera & Analysera
							</button>
						{/if}

						{#if transcriptionError}
							<div class="w-full max-w-xs mb-3 p-3 bg-red-900/20 border border-red-600 rounded-xl">
								<p class="text-sm text-red-400">{transcriptionError}</p>
							</div>
						{/if}

						<button
							onclick={startRecording}
							class="w-full max-w-xs bg-amber-600 text-white py-3 px-6 rounded-xl font-medium active:scale-95 transition-all duration-200 mb-3"
						>
							Spela in Igen
						</button>
					</div>
				{:else}
					<!-- Ready to record -->
					<div class="text-center">
						<div class="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mb-6">
							<div class="text-3xl">●</div>
						</div>
						<h2 class="text-2xl font-bold mb-2">Redo att Spela in</h2>
						<p class="text-gray-300 mb-6 text-sm">Mikrofonen är redo</p>
						<button
							onclick={startRecording}
							class="w-full max-w-xs bg-red-600 text-white py-4 px-6 rounded-xl font-medium active:scale-95 transition-all duration-200"
						>
							● Starta Inspelning
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
