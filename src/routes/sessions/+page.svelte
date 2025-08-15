<script lang="ts">
	import { onMount } from 'svelte';
	import { sessions, hives } from '$lib/stores.js';
	import type { InspectionSession, Hive } from '$lib/types.js';

	let allSessions = $state<InspectionSession[]>([]);
	let availableHives = $state<Hive[]>([]);

	onMount(() => {
		sessions.load();
		hives.load();
	});

	$effect(() => {
		allSessions = [...$sessions].reverse();
	});

	$effect(() => {
		availableHives = hives.getActiveHives($hives);
	});

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}

	function formatTime(dateString: string): string {
		return new Date(dateString).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function formatFullDateTime(dateString: string): string {
		const date = new Date(dateString);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		const dateStr = date.toDateString();
		const todayStr = today.toDateString();
		const yesterdayStr = yesterday.toDateString();

		let dayPrefix = '';
		if (dateStr === todayStr) {
			dayPrefix = 'Today';
		} else if (dateStr === yesterdayStr) {
			dayPrefix = 'Yesterday';
		} else {
			dayPrefix = formatDate(dateString);
		}

		return `${dayPrefix} at ${formatTime(dateString)}`;
	}

	function formatDuration(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		return `${minutes}m`;
	}

	function getSessionTitle(session: InspectionSession): string {
		return `Recording Session`;
	}

	function getSessionSubtitle(session: InspectionSession): string {
		return formatFullDateTime(session.startTime);
	}

	function getInspectionSummary(session: InspectionSession): string {
		const hiveCount = session.inspectionResults?.length || 0;
		if (hiveCount === 0) {
			return 'No inspection data';
		}
		const hiveText = hiveCount === 1 ? 'hive' : 'hives';
		return `${hiveCount} ${hiveText} inspected`;
	}

	function getDetailedInspectionSummary(session: InspectionSession) {
		const results = session.inspectionResults || [];
		if (results.length === 0) {
			return null;
		}

		const queens = results.filter((r) => r.finnsDrottning === 'ja').length;
		const eggs = results.filter((r) => r.nylagdaÄgg === 'ja').length;
		const healthScores = results.map((r) => r.binasHälsa).filter(Boolean);
		const avgHealth =
			healthScores.length > 0
				? (healthScores.reduce((a, b) => a! + b!, 0)! / healthScores.length).toFixed(1)
				: null;

		return {
			totalHives: results.length,
			queens,
			eggs,
			avgHealth,
			hasIssues: results.some((r) => r.binasHälsa && r.binasHälsa <= 2)
		};
	}

	function hasTranscription(session: InspectionSession): boolean {
		return Boolean(session.transcription && session.transcription.trim());
	}

	function truncateTranscription(
		text: string,
		maxLength: number = 150
	): { text: string; isTruncated: boolean } {
		if (text.length <= maxLength) {
			return { text, isTruncated: false };
		}
		const truncated = text.substring(0, maxLength).trim();
		const lastSpace = truncated.lastIndexOf(' ');
		const finalText = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
		return { text: finalText + '...', isTruncated: true };
	}

	// State for managing expanded transcriptions
	let expandedSessions = $state<Set<string>>(new Set());

	function toggleTranscription(sessionId: string) {
		const newExpanded = new Set(expandedSessions);
		if (newExpanded.has(sessionId)) {
			newExpanded.delete(sessionId);
		} else {
			newExpanded.add(sessionId);
		}
		expandedSessions = newExpanded;
	}

	function playAudio(session: InspectionSession) {
		if (session.audioUrl || session.audioBlob) {
			// Use audioUrl for current session, audioBlob (base64) for stored sessions
			const audioSrc = session.audioUrl || session.audioBlob;
			const audio = new Audio(audioSrc);
			audio.play();
		}
	}

	function getAudioSrc(session: InspectionSession): string | undefined {
		// Prefer audioUrl (blob URL) for current session, fall back to audioBlob (base64) for stored sessions
		return session.audioUrl || session.audioBlob;
	}
</script>

<!-- Mobile-first sessions page -->
<div class="min-h-full bg-gray-50">
	<!-- Fixed header -->
	<div class="bg-white border-b px-4 py-3">
		<h1 class="text-xl font-bold text-gray-900">Sessions</h1>
		<p class="text-sm text-gray-600">{allSessions.length} recordings</p>
	</div>

	<div class="px-4 py-4">
		{#if allSessions.length === 0}
			<div class="text-center py-12">
				<div class="text-4xl mb-4 text-gray-400">≡</div>
				<h2 class="text-lg font-semibold text-gray-900 mb-2">No Sessions Yet</h2>
				<p class="text-sm text-gray-600 mb-6">Start your first recording</p>
				<a
					href="/"
					class="inline-block bg-amber-600 text-white px-6 py-3 rounded-xl font-medium active:scale-95 transition-all duration-200"
				>
					Start Recording
				</a>
			</div>
		{:else}
			<div class="space-y-3">
				{#each allSessions as session}
					<div class="bg-white rounded-xl border p-4">
						<!-- Session header -->
						<div class="flex items-start justify-between mb-3">
							<div class="min-w-0 flex-1">
								<h3 class="font-medium text-gray-900">{getSessionTitle(session)}</h3>
								<p class="text-sm text-gray-600 mt-0.5">{getSessionSubtitle(session)}</p>
								<div class="flex items-center gap-2 mt-2">
									<span class="text-xs text-gray-600">{getInspectionSummary(session)}</span>
									{#if hasTranscription(session)}
										<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
											Transcribed
										</span>
									{/if}
									{#if !session.endTime}
										<span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
											In Progress
										</span>
									{/if}
								</div>
							</div>
							{#if session.duration}
								<span
									class="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex-shrink-0"
								>
									{formatDuration(session.duration)}
								</span>
							{/if}
						</div>

						<!-- Transcription section -->
						{#if hasTranscription(session)}
							{@const isExpanded = expandedSessions.has(session.id)}
							{@const transcriptionData = isExpanded
								? { text: session.transcription!, isTruncated: false }
								: truncateTranscription(session.transcription!)}
							<div class="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
								<div class="flex items-start justify-between mb-2">
									<h4 class="text-sm font-medium text-blue-900">What you said:</h4>
									{#if transcriptionData.isTruncated || isExpanded}
										<button
											onclick={() => toggleTranscription(session.id)}
											class="text-xs text-blue-600 hover:text-blue-800 font-medium active:scale-95 transition-all"
										>
											{isExpanded ? 'Show less' : 'Show more'}
										</button>
									{/if}
								</div>
								<p class="text-sm text-blue-800 leading-relaxed">
									{transcriptionData.text}
								</p>
							</div>
						{/if}

						<!-- Inspection results summary -->
						{#if session.inspectionResults && session.inspectionResults.length > 0}
							{@const summary = getDetailedInspectionSummary(session)}
							{#if summary}
								<div class="mb-3 p-3 bg-green-50 rounded-lg border border-green-100">
									<h4 class="text-sm font-medium text-green-900 mb-2">Inspection Results:</h4>
									<div class="grid grid-cols-2 gap-3 text-xs">
										<div class="flex items-center gap-1">
											<span class="text-green-700">👑</span>
											<span class="text-green-800"
												>{summary.queens}/{summary.totalHives} queens found</span
											>
										</div>
										<div class="flex items-center gap-1">
											<span class="text-green-700">🥚</span>
											<span class="text-green-800"
												>{summary.eggs}/{summary.totalHives} with eggs</span
											>
										</div>
										{#if summary.avgHealth}
											<div class="flex items-center gap-1">
												<span class="text-green-700">❤️</span>
												<span class="text-green-800 {summary.hasIssues ? 'text-amber-700' : ''}">
													Avg health: {summary.avgHealth}/5
												</span>
											</div>
										{/if}
										<div class="flex items-center gap-1">
											<span class="text-green-700">🐝</span>
											<span class="text-green-800"
												>{summary.totalHives} hive{summary.totalHives > 1 ? 's' : ''}</span
											>
										</div>
									</div>
									{#if summary.hasIssues}
										<div class="mt-2 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
											⚠️ Some hives show health concerns
										</div>
									{/if}
								</div>
							{/if}
						{/if}

						<!-- Audio player -->
						{#if getAudioSrc(session)}
							<div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
								<div class="flex items-center justify-between mb-2">
									<h4 class="text-sm font-medium text-gray-700">Audio Recording</h4>
									<button
										onclick={() => playAudio(session)}
										class="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium active:scale-95 transition-all duration-200 flex items-center gap-1"
									>
										▶ Play
									</button>
								</div>
								<audio controls class="w-full h-8 text-sm" preload="none">
									<source src={getAudioSrc(session)} type="audio/webm" />
									Your browser does not support audio playback.
								</audio>
							</div>
						{:else if !hasTranscription(session)}
							<div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
								<p class="text-sm text-gray-600">No audio or transcription available</p>
							</div>
						{/if}

						<!-- Notes -->
						{#if session.notes}
							<div class="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-3">
								<h4 class="text-sm font-medium text-amber-900 mb-1">Session Notes:</h4>
								<p class="text-sm text-amber-800">{session.notes}</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
