<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { hives, inspections } from '$lib/stores.js';
	import type { Hive, HiveInspection } from '$lib/types.js';

	let hive = $state<Hive | null>(null);
	let hiveInspections = $state<HiveInspection[]>([]);
	let latestInspection = $state<HiveInspection | null>(null);
	let isEditing = $state(false);
	let showSaveSuccess = $state(false);
	let fromSession = $state(false);

	// Edit form state
	let editFinnsDrottning = $state<'ja' | 'nej' | ''>('');
	let editNylagdaÄgg = $state<'ja' | 'nej' | ''>('');
	let editMängdBin = $state<number | ''>(5);
	let editBinasHälsa = $state<number | ''>(5);
	let editNotes = $state('');

	onMount(() => {
		hives.load();
		inspections.load();
		loadHiveData();

		// Check if we came from session page
		const urlParams = new URLSearchParams(window.location.search);
		fromSession = urlParams.get('from') === 'session';
	});

	$effect(() => {
		loadHiveData();
	});

	function loadHiveData() {
		const hiveId = $page.params.id;
		if (!hiveId) return;

		// Find the hive
		const allHives = $hives;
		hive = allHives.find((h) => h.id === hiveId) || null;

		if (!hive) {
			goto('/hives');
			return;
		}

		// Load inspections for this hive
		const allInspections = $inspections;
		hiveInspections = inspections.getByHiveId(allInspections, hiveId);
		latestInspection = hiveInspections[0] || null;

		// Set edit form with latest values
		if (latestInspection) {
			editFinnsDrottning = latestInspection.finnsDrottning || '';
			editNylagdaÄgg = latestInspection.nylagdaÄgg || '';
			editMängdBin = latestInspection.mängdBin || '';
			editBinasHälsa = latestInspection.binasHälsa || '';
			editNotes = latestInspection.notes || '';
		}
	}

	function startEditing() {
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
		// Reset form to latest values
		if (latestInspection) {
			editFinnsDrottning = latestInspection.finnsDrottning || '';
			editNylagdaÄgg = latestInspection.nylagdaÄgg || '';
			editMängdBin = latestInspection.mängdBin || '';
			editBinasHälsa = latestInspection.binasHälsa || '';
			editNotes = latestInspection.notes || '';
		}
	}

	function saveInspection() {
		if (!hive) return;

		// Create new manual inspection
		const newInspection: HiveInspection = {
			id: crypto.randomUUID(),
			hiveId: hive.id,
			hiveName: hive.name,
			date: new Date().toISOString().split('T')[0],
			timestamp: new Date().toISOString(),
			finnsDrottning: editFinnsDrottning || undefined,
			nylagdaÄgg: editNylagdaÄgg || undefined,
			mängdBin:
				typeof editMängdBin === 'number' && editMängdBin >= 1 && editMängdBin <= 5
					? (editMängdBin as 1 | 2 | 3 | 4 | 5)
					: undefined,
			binasHälsa:
				typeof editBinasHälsa === 'number' && editBinasHälsa >= 1 && editBinasHälsa <= 5
					? (editBinasHälsa as 1 | 2 | 3 | 4 | 5)
					: undefined,
			source: 'manual',
			editedBy: 'beekeeper',
			editedAt: new Date().toISOString(),
			notes: editNotes.trim() || undefined,
			confirmed: true
		};

		inspections.add(newInspection);

		// Update hive with latest inspection
		hives.updateLatestInspection(hive.id, newInspection);

		isEditing = false;
		showSaveSuccess = true;

		// Hide success message after 3 seconds
		setTimeout(() => {
			showSaveSuccess = false;
		}, 3000);

		// Reload data to show new inspection
		loadHiveData();
	}

	function formatDate(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleDateString('sv-SE', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusColor(status: 'ja' | 'nej' | undefined): string {
		if (status === 'ja') return 'text-green-400';
		if (status === 'nej') return 'text-red-400';
		return 'text-gray-400';
	}

	function getHealthColor(level: number | undefined): string {
		if (!level) return 'text-gray-400';
		if (level >= 4) return 'text-green-400';
		if (level >= 3) return 'text-yellow-400';
		return 'text-red-400';
	}
</script>

<div class="min-h-full bg-gray-50 pb-20">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200 px-4 py-4">
		<div class="flex items-center gap-3">
			<button
				onclick={() => (fromSession ? goto('/sessions') : goto('/hives'))}
				class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
			>
				←
			</button>
			{#if hive}
				<div class="flex-1">
					<h1 class="text-xl font-bold text-gray-900">{hive.name}</h1>
					{#if hive.location}
						<p class="text-sm text-gray-600">{hive.location}</p>
					{/if}
				</div>
				<div class="w-4 h-4 rounded-full" style="background-color: {hive.color || '#10B981'}"></div>
			{/if}
		</div>
	</div>

	{#if hive}
		<div class="p-4 space-y-6">
			<!-- Session Context Indicator -->
			{#if fromSession}
				<div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
					<div class="flex items-center gap-2 mb-2">
						<span class="text-blue-600">🎤</span>
						<span class="text-blue-800 font-medium">Viewed from Recording Session</span>
					</div>
					<p class="text-blue-700 text-sm">
						This hive was recently updated from a transcribed recording. Use the back button to
						return to your sessions.
					</p>
				</div>
			{/if}

			<!-- Success Message -->
			{#if showSaveSuccess}
				<div class="bg-green-50 border border-green-200 rounded-xl p-4">
					<div class="flex items-center gap-2">
						<span class="text-green-600">✓</span>
						<span class="text-green-800 font-medium">Inspection saved successfully!</span>
					</div>
					<p class="text-green-700 text-sm mt-1">
						Hive status has been updated with your inspection data.
					</p>
				</div>
			{/if}

			<!-- Latest Status Card -->
			{#if latestInspection}
				<div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
					<div class="flex items-center justify-between mb-3">
						<h2 class="text-lg font-semibold text-gray-900">Latest Status</h2>
						<div class="flex items-center gap-2">
							<span class="text-xs text-gray-500">
								{formatDate(latestInspection.timestamp)}
							</span>
							{#if latestInspection.source === 'ai'}
								<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">AI</span>
							{:else}
								<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full"
									>Manual</span
								>
							{/if}
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						{#if latestInspection.finnsDrottning}
							<div>
								<span class="text-sm text-gray-600">Drottning:</span>
								<span
									class="ml-2 font-medium {getStatusColor(
										latestInspection.finnsDrottning
									)} capitalize"
								>
									{latestInspection.finnsDrottning}
								</span>
							</div>
						{/if}

						{#if latestInspection.nylagdaÄgg}
							<div>
								<span class="text-sm text-gray-600">Nylagda ägg:</span>
								<span
									class="ml-2 font-medium {getStatusColor(latestInspection.nylagdaÄgg)} capitalize"
								>
									{latestInspection.nylagdaÄgg}
								</span>
							</div>
						{/if}

						{#if latestInspection.mängdBin}
							<div>
								<span class="text-sm text-gray-600">Mängd bin:</span>
								<span class="ml-2 font-medium {getHealthColor(latestInspection.mängdBin)}">
									{latestInspection.mängdBin}/5
								</span>
							</div>
						{/if}

						{#if latestInspection.binasHälsa}
							<div>
								<span class="text-sm text-gray-600">Binas hälsa:</span>
								<span class="ml-2 font-medium {getHealthColor(latestInspection.binasHälsa)}">
									{latestInspection.binasHälsa}/5
								</span>
							</div>
						{/if}
					</div>

					{#if latestInspection.notes}
						<div class="mt-3 pt-3 border-t border-gray-100">
							<span class="text-sm text-gray-600">Notes:</span>
							<p class="mt-1 text-sm text-gray-900">{latestInspection.notes}</p>
						</div>
					{/if}

					{#if latestInspection.extractionConfidence}
						<div class="mt-3 pt-3 border-t border-gray-100">
							<span class="text-xs text-gray-500">
								AI Confidence: {Math.round(latestInspection.extractionConfidence * 100)}%
							</span>
						</div>
					{/if}
				</div>
			{:else}
				<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
					<div class="text-gray-400 mb-2">📋</div>
					<h3 class="text-lg font-medium text-gray-900 mb-1">No Inspections Yet</h3>
					<p class="text-sm text-gray-600 mb-4">
						No inspection data has been recorded for this hive.
					</p>
				</div>
			{/if}

			<!-- Manual Update Section -->
			{#if !isEditing}
				<button
					onclick={startEditing}
					class="w-full bg-amber-600 text-white py-3 px-4 rounded-xl font-medium active:scale-95 transition-all duration-200"
				>
					Update Status Manually
				</button>
			{:else}
				<div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">Update Inspection Status</h3>

					<div class="space-y-4">
						<!-- Queen Present -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Finns drottning?</label>
							<select
								bind:value={editFinnsDrottning}
								class="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
							>
								<option value="">Not specified</option>
								<option value="ja">Ja</option>
								<option value="nej">Nej</option>
							</select>
						</div>

						<!-- Fresh Eggs -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Nylagda ägg?</label>
							<select
								bind:value={editNylagdaÄgg}
								class="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
							>
								<option value="">Not specified</option>
								<option value="ja">Ja</option>
								<option value="nej">Nej</option>
							</select>
						</div>

						<!-- Bee Quantity -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Mängd bin (1-5)</label>
							<select
								bind:value={editMängdBin}
								class="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
							>
								<option value="">Not specified</option>
								<option value={1}>1 - Very Low</option>
								<option value={2}>2 - Low</option>
								<option value={3}>3 - Medium</option>
								<option value={4}>4 - High</option>
								<option value={5}>5 - Very High</option>
							</select>
						</div>

						<!-- Bee Health -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Binas hälsa (1-5)</label>
							<select
								bind:value={editBinasHälsa}
								class="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
							>
								<option value="">Not specified</option>
								<option value={1}>1 - Very Poor</option>
								<option value={2}>2 - Poor</option>
								<option value={3}>3 - Average</option>
								<option value={4}>4 - Good</option>
								<option value={5}>5 - Excellent</option>
							</select>
						</div>

						<!-- Notes -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
							<textarea
								bind:value={editNotes}
								placeholder="Additional observations..."
								rows="3"
								class="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
							></textarea>
						</div>
					</div>

					<div class="flex gap-3 mt-6">
						<button
							onclick={cancelEditing}
							class="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium active:scale-95 transition-all duration-200"
						>
							Cancel
						</button>
						<button
							onclick={saveInspection}
							class="flex-1 py-3 px-4 bg-amber-600 text-white rounded-xl font-medium active:scale-95 transition-all duration-200"
						>
							Save Status
						</button>
					</div>
				</div>
			{/if}

			<!-- Inspection History -->
			{#if hiveInspections.length > 0}
				<div class="bg-white rounded-xl shadow-sm border border-gray-200">
					<div class="p-4 border-b border-gray-200">
						<h3 class="text-lg font-semibold text-gray-900">Inspection History</h3>
					</div>

					<div class="divide-y divide-gray-100">
						{#each hiveInspections as inspection}
							<div class="p-4">
								<div class="flex items-center justify-between mb-2">
									<span class="text-sm font-medium text-gray-900">
										{formatDate(inspection.timestamp)}
									</span>
									<div class="flex items-center gap-2">
										{#if inspection.source === 'ai'}
											<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
												>AI</span
											>
										{:else}
											<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full"
												>Manual</span
											>
										{/if}
										{#if inspection.confirmed}
											<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
												>Confirmed</span
											>
										{/if}
									</div>
								</div>

								<div class="grid grid-cols-2 gap-3 text-sm">
									{#if inspection.finnsDrottning}
										<div>
											<span class="text-gray-600">Drottning:</span>
											<span class="ml-1 {getStatusColor(inspection.finnsDrottning)} capitalize">
												{inspection.finnsDrottning}
											</span>
										</div>
									{/if}

									{#if inspection.nylagdaÄgg}
										<div>
											<span class="text-gray-600">Ägg:</span>
											<span class="ml-1 {getStatusColor(inspection.nylagdaÄgg)} capitalize">
												{inspection.nylagdaÄgg}
											</span>
										</div>
									{/if}

									{#if inspection.mängdBin}
										<div>
											<span class="text-gray-600">Bin:</span>
											<span class="ml-1 {getHealthColor(inspection.mängdBin)}">
												{inspection.mängdBin}/5
											</span>
										</div>
									{/if}

									{#if inspection.binasHälsa}
										<div>
											<span class="text-gray-600">Hälsa:</span>
											<span class="ml-1 {getHealthColor(inspection.binasHälsa)}">
												{inspection.binasHälsa}/5
											</span>
										</div>
									{/if}
								</div>

								{#if inspection.notes}
									<p class="mt-2 text-sm text-gray-700">{inspection.notes}</p>
								{/if}

								{#if inspection.extractionConfidence}
									<div class="mt-2">
										<span class="text-xs text-gray-500">
											AI Confidence: {Math.round(inspection.extractionConfidence * 100)}%
										</span>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
