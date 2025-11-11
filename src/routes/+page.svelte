<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	interface Stats {
		totalHives: number;
		activeSessions: number;
		recentInspections: number;
	}

	let stats = $state<Stats>({ totalHives: 0, activeSessions: 0, recentInspections: 0 });
	let loading = $state(true);

	async function loadStats() {
		try {
			const [hivesRes, sessionsRes] = await Promise.all([
				fetch('/api/hives'),
				fetch('/api/call-records')
			]);

			if (hivesRes.ok && sessionsRes.ok) {
				const hivesData = await hivesRes.json();
				const sessionsData = await sessionsRes.json();

				const recentInspections = sessionsData.records.reduce((acc: number, record: any) => {
					return acc + (record.inspections?.length || 0);
				}, 0);

				stats = {
					totalHives: hivesData.hives.length,
					activeSessions: sessionsData.records.length,
					recentInspections
				};
			}
		} catch (err) {
			console.error('Failed to load stats:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadStats();
	});
</script>

<div class="min-h-full bg-gradient-to-b from-amber-50 via-white to-gray-50">
	<!-- Hero Section -->
	<div class="bg-gradient-to-br from-amber-500 via-amber-400 to-orange-400">
		<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
			<div class="text-center">
				<div
					class="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm mb-6 shadow-xl"
				>
					<span class="text-6xl">🐝</span>
				</div>
				<h1 class="text-4xl sm:text-5xl font-bold text-white mb-3">BeeKeep</h1>
				<p class="text-amber-50 text-lg sm:text-xl max-w-2xl mx-auto">
					AI-driven kupinspektion och administration
				</p>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
		<!-- Stats Overview -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 -mt-16">
			<div
				class="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-200"
			>
				<div class="p-6 bg-gradient-to-br from-green-50 to-emerald-50">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-green-700 mb-1">Kupor</p>
							<p class="text-3xl font-bold text-green-900">
								{loading ? '...' : stats.totalHives}
							</p>
							<p class="text-xs text-green-600 mt-1">Registrerade</p>
						</div>
						<div
							class="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-md"
						>
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>

			<div
				class="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-200"
			>
				<div class="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-blue-700 mb-1">Sessioner</p>
							<p class="text-3xl font-bold text-blue-900">
								{loading ? '...' : stats.activeSessions}
							</p>
							<p class="text-xs text-blue-600 mt-1">Inspelningar</p>
						</div>
						<div
							class="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-md"
						>
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>

			<div
				class="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-200"
			>
				<div class="p-6 bg-gradient-to-br from-amber-50 to-orange-50">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-amber-700 mb-1">Inspektioner</p>
							<p class="text-3xl font-bold text-amber-900">
								{loading ? '...' : stats.recentInspections}
							</p>
							<p class="text-xs text-amber-600 mt-1">Genomförda</p>
						</div>
						<div
							class="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-md"
						>
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Primary Action -->
		<div class="mb-12">
			<div
				class="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-8 shadow-xl border-2 border-amber-300"
			>
				<div class="max-w-3xl mx-auto text-center">
					<div
						class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md"
					>
						<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
							/>
						</svg>
					</div>
					<h2 class="text-2xl sm:text-3xl font-bold text-white mb-3">Spela in Ny Inspektion</h2>
					<p class="text-amber-50 text-base sm:text-lg mb-6 max-w-2xl mx-auto">
						Klicka på "TALK WITH AI"-knappen längst ner till höger för att starta din
						röstassisterade kupinspektion
					</p>
					<div class="flex items-center justify-center gap-2 text-amber-100 text-sm">
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
								clip-rule="evenodd"
							/>
						</svg>
						<span>AI-assistenten guidar dig genom hela inspektionen</span>
					</div>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
			<!-- Manage Hives -->
			<button
				onclick={() => (window.location.href = '/hives')}
				class="group bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-green-300 hover:shadow-lg transition-all duration-200 text-left"
			>
				<div class="flex items-start gap-4">
					<div
						class="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-110 transition-transform"
					>
						<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
							/>
						</svg>
					</div>
					<div class="flex-1">
						<h3
							class="text-lg font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors"
						>
							Hantera Kupor
						</h3>
						<p class="text-sm text-gray-600 mb-3">
							Visa och organisera dina bikupor, se inspektionshistorik
						</p>
						<div class="flex items-center gap-2 text-sm font-medium text-green-600">
							<span>Gå till kupor</span>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</div>
				</div>
			</button>

			<!-- Review Sessions -->
			<button
				onclick={() => (window.location.href = '/sessions')}
				class="group bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-200 text-left"
			>
				<div class="flex items-start gap-4">
					<div
						class="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-110 transition-transform"
					>
						<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
							/>
						</svg>
					</div>
					<div class="flex-1">
						<h3
							class="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors"
						>
							Granska Sessioner
						</h3>
						<p class="text-sm text-gray-600 mb-3">
							Lyssna på inspelningar, granska transkriptioner och data
						</p>
						<div class="flex items-center gap-2 text-sm font-medium text-blue-600">
							<span>Gå till sessioner</span>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</div>
				</div>
			</button>
		</div>
	</div>

	<!-- VAPI Widget -->
	{#if browser}
		<vapi-widget
			public-key="b5874460-bc03-4a8c-ba50-3a911545c804"
			assistant-id="902f8839-4539-46cb-9a93-f581aa17a5d4"
			mode="voice"
			theme="dark"
			base-bg-color="#000000"
			accent-color="#F59E0B"
			cta-button-color="#F59E0B"
			cta-button-text-color="#000000"
			border-radius="large"
			size="full"
			position="bottom-right"
			title="TALK WITH AI"
			start-button-text="Start"
			end-button-text="End Call"
			chat-first-message="Hey, How can I help you today?"
			chat-placeholder="Type your message..."
			voice-show-transcript="false"
			consent-required="false"
		></vapi-widget>
	{/if}
</div>
