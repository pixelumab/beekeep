<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		activeSession,
		hives,
		sessions,
		getActiveSession,
		getHives,
		getSessions
	} from '$lib/stores.svelte.js';
	import type { Hive } from '$lib/types.js';

	let isActiveSession = $derived(getActiveSession() !== null);
	let availableHives = $derived(hives.getActiveHives(getHives()));
	let sessionCount = $derived(getSessions().length);

	onMount(() => {
		activeSession.load();
		hives.load();
		sessions.load();
	});

	function startRecordingSession() {
		const session = {
			id: crypto.randomUUID(),
			date: new Date().toISOString().split('T')[0],
			startTime: new Date().toISOString(),
			inspections: []
		};
		activeSession.start(session);
		goto('/session');
	}
</script>

<!-- Mobile-first home page -->
<div class="min-h-full bg-gradient-to-b from-amber-50 to-orange-50">
	<!-- Header section -->
	<div class="px-4 pt-8 pb-6 text-center">
		<div class="text-5xl mb-3 text-amber-600">🐝</div>
		<h1 class="text-2xl font-bold text-gray-900 mb-1">BeeKeep</h1>
		<p class="text-sm text-gray-600">Kupinspektionssessioner</p>
	</div>

	<!-- Main action area -->
	<div class="px-4 pb-4">
		{#if isActiveSession}
			<!-- Active session card -->
			<div class="bg-white rounded-2xl shadow-sm border border-green-100 p-6 mb-4">
				<div class="text-center">
					<div
						class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
					>
						<div class="text-2xl text-green-600 animate-pulse">●</div>
					</div>
					<h2 class="text-xl font-bold text-gray-900 mb-2">Session Aktiv</h2>
					<p class="text-gray-600 text-sm mb-6">Inspelning pågår</p>
					<div class="space-y-3">
						<button
							onclick={() => goto('/session')}
							class="w-full bg-green-600 text-white font-semibold py-4 px-6 rounded-xl active:scale-95 transition-all duration-200"
						>
							Fortsätt Inspelning
						</button>
						<button
							onclick={() => {
								activeSession.clear();
								location.reload();
							}}
							class="w-full border border-red-300 text-red-600 font-medium py-2 px-6 rounded-xl active:scale-95 transition-all duration-200 text-sm"
						>
							Avbryt Session
						</button>
					</div>
				</div>
			</div>
		{:else}
			<!-- Start recording card -->
			<div class="bg-white rounded-2xl shadow-sm border p-6 mb-4">
				<div class="text-center">
					<div
						class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
					>
						<div class="text-2xl text-red-600">●</div>
					</div>
					<h2 class="text-xl font-bold text-gray-900 mb-2">Starta Inspelning</h2>
					<p class="text-gray-600 text-sm mb-6">Börja kupinspektion</p>
					<button
						onclick={startRecordingSession}
						class="w-full bg-red-600 text-white font-semibold py-4 px-6 rounded-xl active:scale-95 transition-all duration-200"
					>
						Starta Inspelning
					</button>
				</div>
			</div>
		{/if}

		<!-- Quick stats -->
		{#if availableHives.length > 0 || sessionCount > 0}
			<div class="bg-white rounded-2xl border p-4 mb-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-gray-900">{availableHives.length}</div>
						<div class="text-sm text-gray-600">Aktiva Kupor</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-gray-900">{sessionCount}</div>
						<div class="text-sm text-gray-600">Sessioner</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Quick actions -->
		<div class="grid grid-cols-2 gap-3">
			<a
				href="/hives"
				class="bg-white rounded-2xl border p-4 text-center active:scale-95 transition-all duration-200 hover:shadow-sm"
			>
				<div class="text-2xl mb-2">▢</div>
				<div class="text-sm font-medium text-gray-900">Hantera Kupor</div>
			</a>
			<a
				href="/sessions"
				class="bg-white rounded-2xl border p-4 text-center active:scale-95 transition-all duration-200 hover:shadow-sm"
			>
				<div class="text-2xl mb-2">≡</div>
				<div class="text-sm font-medium text-gray-900">Visa Sessioner</div>
			</a>
		</div>
	</div>
</div>
