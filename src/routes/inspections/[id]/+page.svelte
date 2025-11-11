<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	interface Inspection {
		id: string;
		call_record_id: string;
		hive_id: string | null;
		hive_name_transcript: string | null;
		matched: number;
		queen_present: 'ja' | 'nej' | null;
		fresh_eggs: 'ja' | 'nej' | null;
		bee_health: number | null;
		bee_quantity: number | null;
		timestamp: number;
		hive_name: string | null;
		hive_color: string | null;
		hive_location: string | null;
		call_recording: string | null;
		call_duration: number | null;
		call_transcription: string | null;
	}

	let inspection = $state<Inspection | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let inspectionId = $derived($page.params.id);

	async function loadInspection() {
		if (!inspectionId) return;

		try {
			loading = true;
			error = null;
			const response = await fetch(`/api/inspections/${inspectionId}`);
			if (!response.ok) {
				if (response.status === 404) {
					error = 'Inspektionen kunde inte hittas';
				} else {
					throw new Error('Failed to fetch inspection');
				}
				return;
			}
			const data = await response.json();
			inspection = data.inspection;
		} catch (err) {
			console.error('Error loading inspection:', err);
			error = err instanceof Error ? err.message : 'Failed to load inspection';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadInspection();
	});

	function formatFullDateTime(dateString: string | number): string {
		const timestamp = typeof dateString === 'number' ? dateString : parseInt(dateString, 10);
		const date = new Date(timestamp);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		const dateStr = date.toDateString();
		const todayStr = today.toDateString();
		const yesterdayStr = yesterday.toDateString();

		let dayPrefix = '';
		if (dateStr === todayStr) {
			dayPrefix = 'Idag';
		} else if (dateStr === yesterdayStr) {
			dayPrefix = 'Igår';
		} else {
			dayPrefix = date.toLocaleDateString('sv-SE', {
				weekday: 'long',
				month: 'long',
				day: 'numeric',
				year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
			});
		}

		const timeStr = date.toLocaleTimeString('sv-SE', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: false
		});

		return `${dayPrefix} kl ${timeStr}`;
	}

	function getHealthColor(level: number | null): string {
		if (!level) return 'text-gray-400';
		if (level >= 4) return 'text-green-600';
		if (level >= 3) return 'text-yellow-600';
		return 'text-red-600';
	}

	function getHealthBgColor(level: number | null): string {
		if (!level) return 'bg-gray-100';
		if (level >= 4) return 'bg-green-100';
		if (level >= 3) return 'bg-yellow-100';
		return 'bg-red-100';
	}
</script>

<div class="min-h-full bg-gradient-to-b from-gray-50 to-white">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Back Button -->
		<div class="mb-6">
			<button
				onclick={() => goto('/sessions')}
				class="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all duration-200"
			>
				<span class="text-xl">←</span>
				<span>Tillbaka till Sessioner</span>
			</button>
		</div>

		{#if loading}
			<div class="flex flex-col items-center justify-center py-20">
				<div
					class="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4"
				></div>
				<p class="text-gray-600">Laddar inspektion...</p>
			</div>
		{:else if error}
			<div class="bg-white rounded-2xl border-2 border-red-200 shadow-lg p-6">
				<div class="text-center py-8">
					<div
						class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
					>
						<svg class="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<p class="text-red-700 text-xl font-bold mb-2">
						{error}
					</p>
					<button
						onclick={() => goto('/sessions')}
						class="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
					>
						Tillbaka till Sessioner
					</button>
				</div>
			</div>
		{:else if inspection}
			<!-- Header Card -->
			<div
				class="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-lg overflow-hidden"
			>
				<div class="p-6">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-4 mb-2">
								<div
									class="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center shadow-md"
								>
									<svg
										class="w-8 h-8 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
										/>
									</svg>
								</div>
								<div>
									<h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Inspektion</h1>
									<p class="text-base text-gray-600 mt-1">
										{formatFullDateTime(inspection.timestamp)}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Hive Information -->
			{#if inspection.matched && inspection.hive_name}
				<div class="mb-6 bg-white rounded-2xl border-2 border-green-200 shadow-lg overflow-hidden">
					<div class="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200">
						<div class="flex items-center gap-3">
							<div
								class="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-md"
							>
								<svg
									class="w-6 h-6 text-white"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
									/>
								</svg>
							</div>
							<h2 class="text-xl font-bold text-gray-900">Kupa</h2>
						</div>
					</div>
					<div class="p-6">
						<div class="flex items-center gap-4">
							<div
								class="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md"
								style="background-color: {inspection.hive_color || '#10B981'}"
							>
								{inspection.hive_name.substring(0, 2).toUpperCase()}
							</div>
							<div class="flex-1">
								<h3 class="text-xl font-bold text-gray-900 mb-1">{inspection.hive_name}</h3>
								{#if inspection.hive_location}
									<p class="text-sm text-gray-600 flex items-center gap-1">
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
												clip-rule="evenodd"
											/>
										</svg>
										{inspection.hive_location}
									</p>
								{/if}
								{#if inspection?.hive_id}
									<button
										onclick={() => goto(`/hives/${inspection?.hive_id}`)}
										class="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
									>
										<span>Visa kupans historik</span>
										<span>→</span>
									</button>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{:else if inspection.hive_name_transcript}
				<div
					class="mb-6 bg-amber-50 rounded-2xl border-2 border-amber-200 shadow-lg overflow-hidden"
				>
					<div class="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200">
						<div class="flex items-center gap-3">
							<div
								class="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-md"
							>
								<span class="text-2xl">❓</span>
							</div>
							<h2 class="text-xl font-bold text-amber-900">Kupa (Ej Länkad)</h2>
						</div>
					</div>
					<div class="p-6">
						<p class="text-base text-amber-800 mb-3">
							Denna inspektion är inte länkad till en befintlig kupa. Namn från transkription:
							<span class="font-bold">{inspection.hive_name_transcript}</span>
						</p>
						<p class="text-sm text-amber-700">
							Länka denna inspektion från sessionssidan för att koppla den till en kupa.
						</p>
					</div>
				</div>
			{/if}

			<!-- Inspection Data -->
			<div class="mb-6 bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
				<div class="p-6 bg-gradient-to-r from-gray-50 to-slate-50 border-b-2 border-gray-200">
					<div class="flex items-center gap-3">
						<div
							class="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center shadow-md"
						>
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
								/>
							</svg>
						</div>
						<h2 class="text-xl font-bold text-gray-900">Inspektionsdata</h2>
					</div>
				</div>
				<div class="p-6">
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<!-- Queen Present -->
						{#if inspection.queen_present}
							<div
								class="p-4 rounded-lg border {inspection.queen_present === 'ja'
									? 'bg-green-50 border-green-200'
									: 'bg-amber-50 border-amber-200'}"
							>
								<div class="flex items-center gap-3">
									<div class="text-3xl">👑</div>
									<div class="flex-1">
										<div class="text-sm font-medium text-gray-700 mb-1">Drottning</div>
										<div
											class="text-lg font-semibold {inspection.queen_present === 'ja'
												? 'text-green-700'
												: 'text-amber-700'} capitalize"
										>
											{inspection.queen_present}
										</div>
									</div>
								</div>
							</div>
						{/if}

						<!-- Fresh Eggs -->
						{#if inspection.fresh_eggs}
							<div
								class="p-4 rounded-lg border {inspection.fresh_eggs === 'ja'
									? 'bg-green-50 border-green-200'
									: 'bg-gray-50 border-gray-200'}"
							>
								<div class="flex items-center gap-3">
									<div class="text-3xl">🥚</div>
									<div class="flex-1">
										<div class="text-sm font-medium text-gray-700 mb-1">Nylagda Ägg</div>
										<div
											class="text-lg font-semibold {inspection.fresh_eggs === 'ja'
												? 'text-green-700'
												: 'text-gray-700'} capitalize"
										>
											{inspection.fresh_eggs}
										</div>
									</div>
								</div>
							</div>
						{/if}

						<!-- Bee Health -->
						{#if inspection.bee_health}
							<div class="p-4 rounded-lg border {getHealthBgColor(inspection.bee_health)}">
								<div class="flex items-center gap-3">
									<div class="text-3xl">❤️</div>
									<div class="flex-1">
										<div class="text-sm font-medium text-gray-700 mb-2">Binornas Hälsa</div>
										<div class="flex items-center gap-2">
											<div class="text-lg font-semibold {getHealthColor(inspection.bee_health)}">
												{inspection.bee_health}/5
											</div>
											<div class="flex gap-1">
												{#each Array(5) as _, i (i)}
													<div
														class="w-3 h-3 rounded-full {i < inspection.bee_health
															? 'bg-current'
															: 'bg-gray-200'} {getHealthColor(inspection.bee_health)}"
													></div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							</div>
						{/if}

						<!-- Bee Quantity -->
						{#if inspection.bee_quantity}
							<div class="p-4 rounded-lg border {getHealthBgColor(inspection.bee_quantity)}">
								<div class="flex items-center gap-3">
									<div class="text-3xl">🐝</div>
									<div class="flex-1">
										<div class="text-sm font-medium text-gray-700 mb-2">Mängd Bin</div>
										<div class="flex items-center gap-2">
											<div class="text-lg font-semibold {getHealthColor(inspection.bee_quantity)}">
												{inspection.bee_quantity}/5
											</div>
											<div class="flex gap-1">
												{#each Array(5) as _, i (i)}
													<div
														class="w-3 h-3 rounded-full {i < inspection.bee_quantity
															? 'bg-current'
															: 'bg-gray-200'} {getHealthColor(inspection.bee_quantity)}"
													></div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							</div>
						{/if}
					</div>

					{#if !inspection.queen_present && !inspection.fresh_eggs && !inspection.bee_health && !inspection.bee_quantity}
						<p class="text-sm text-gray-600 text-center py-4">Ingen inspektionsdata registrerad</p>
					{/if}
				</div>
			</div>

			<!-- Call Recording -->
			{#if inspection.call_recording}
				<div class="mb-6 bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
					<div class="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200">
						<div class="flex items-center gap-3 mb-2">
							<div
								class="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-md"
							>
								<svg
									class="w-6 h-6 text-white"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
									/>
								</svg>
							</div>
							<div>
								<h2 class="text-xl font-bold text-gray-900">Ljudinspelning</h2>
								{#if inspection.call_duration}
									<p class="text-sm text-gray-600">
										Varaktighet: {Math.floor(inspection.call_duration / 60)} min {inspection.call_duration %
											60} sek
									</p>
								{/if}
							</div>
						</div>
					</div>
					<div class="p-6">
						<audio controls class="w-full rounded-md" preload="metadata" style="height: 48px;">
							<source src={inspection.call_recording} type="audio/wav" />
							<source src={inspection.call_recording} type="audio/mpeg" />
							Din webbläsare stödjer inte ljuduppspelning.
						</audio>

						{#if inspection.call_transcription}
							<div class="my-6 border-t-2 border-gray-200"></div>
							<div>
								<h4 class="text-base font-bold text-gray-900 mb-3">Transkription</h4>
								<div
									class="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 max-h-64 overflow-y-auto border border-gray-200"
								>
									{inspection.call_transcription}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
