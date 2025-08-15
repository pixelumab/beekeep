<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { hives, inspections } from '$lib/stores.js';
	import type { Hive, HiveInspection } from '$lib/types.js';

	let availableHives = $state<Hive[]>([]);
	let showAddForm = $state(false);
	let editingHive = $state<Hive | null>(null);

	// Form fields
	let formName = $state('');
	let formLocation = $state('');
	let formNotes = $state('');
	let formColor = $state('#10B981');

	const hiveColors = [
		'#10B981', // Green
		'#F59E0B', // Amber
		'#EF4444', // Red
		'#3B82F6', // Blue
		'#8B5CF6', // Purple
		'#F97316', // Orange
		'#06B6D4', // Cyan
		'#84CC16' // Lime
	];

	onMount(() => {
		hives.load();
		inspections.load();
	});

	$effect(() => {
		availableHives = hives.getActiveHives($hives);
	});

	function getLatestInspection(hive: Hive): HiveInspection | null {
		// Use the hive's latestInspection field if available, fallback to inspections store
		return hive.latestInspection || inspections.getLatestByHiveId($inspections, hive.id);
	}

	function formatDate(timestamp: string): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;

		return date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
	}

	function getStatusColor(status: 'ja' | 'nej' | undefined): string {
		if (status === 'ja') return 'text-green-600';
		if (status === 'nej') return 'text-red-600';
		return 'text-gray-400';
	}

	function getHealthColor(level: number | undefined): string {
		if (!level) return 'text-gray-400';
		if (level >= 4) return 'text-green-600';
		if (level >= 3) return 'text-yellow-600';
		return 'text-red-600';
	}

	function openHiveDetail(hive: Hive) {
		goto(`/hives/${hive.id}`);
	}

	function openAddForm() {
		resetForm();
		showAddForm = true;
		editingHive = null;
	}

	function openEditForm(hive: Hive) {
		formName = hive.name;
		formLocation = hive.location || '';
		formNotes = hive.notes || '';
		formColor = hive.color || '#10B981';
		editingHive = hive;
		showAddForm = true;
	}

	function resetForm() {
		formName = '';
		formLocation = '';
		formNotes = '';
		formColor = '#10B981';
		editingHive = null;
		showAddForm = false;
	}

	function saveHive() {
		if (!formName.trim()) return;

		if (editingHive) {
			// Update existing hive
			const updatedHive: Hive = {
				...editingHive,
				name: formName.trim(),
				location: formLocation.trim() || undefined,
				notes: formNotes.trim() || undefined,
				color: formColor
			};
			hives.update(updatedHive);
		} else {
			// Add new hive
			hives.add({
				name: formName.trim(),
				location: formLocation.trim() || undefined,
				notes: formNotes.trim() || undefined,
				color: formColor,
				isActive: true
			});
		}

		resetForm();
	}

	function removeHive(hiveId: string) {
		if (confirm('Are you sure you want to remove this hive?')) {
			hives.remove(hiveId);
		}
	}

	function formatDateAdded(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<!-- Mobile-first hives page -->
<div class="min-h-full bg-gray-50">
	<!-- Fixed header -->
	<div class="bg-white border-b px-4 py-3">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-xl font-bold text-gray-900">Hives</h1>
				<p class="text-sm text-gray-600">{availableHives.length} active</p>
			</div>
			<button
				onclick={openAddForm}
				class="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium active:scale-95 transition-all duration-200 shadow-sm"
			>
				+ Add
			</button>
		</div>
	</div>

	<!-- Hives content -->
	<div class="px-4 py-4">
		{#if availableHives.length === 0}
			<div class="text-center py-12">
				<div class="text-4xl mb-4 text-gray-400">▢</div>
				<h2 class="text-lg font-semibold text-gray-900 mb-2">No Hives Yet</h2>
				<p class="text-sm text-gray-600 mb-6">Add your first hive to start tracking</p>
				<button
					onclick={openAddForm}
					class="bg-amber-600 text-white px-6 py-3 rounded-xl font-medium active:scale-95 transition-all duration-200"
				>
					Add Your First Hive
				</button>
			</div>
		{:else}
			<div class="space-y-3">
				{#each availableHives as hive}
					{@const latestInspection = getLatestInspection(hive)}
					<div
						class="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] transition-transform"
						onclick={() => openHiveDetail(hive)}
					>
						<!-- Hive header -->
						<div class="flex items-start justify-between mb-3">
							<div class="flex items-start gap-3 min-w-0 flex-1">
								<div
									class="w-4 h-4 rounded-full mt-0.5 flex-shrink-0"
									style="background-color: {hive.color}"
								></div>
								<div class="min-w-0 flex-1">
									<h3 class="font-medium text-gray-900 mb-1">{hive.name}</h3>
									{#if hive.location}
										<p class="text-sm text-gray-600 mb-2">📍 {hive.location}</p>
									{/if}
									{#if hive.notes}
										<div class="text-sm text-gray-700 bg-gray-50 rounded-lg p-2 mb-2">
											{hive.notes}
										</div>
									{/if}
									<p class="text-xs text-gray-500">Added {formatDateAdded(hive.dateAdded)}</p>
								</div>
							</div>

							<!-- Action menu -->
							<div class="flex gap-1 flex-shrink-0">
								<button
									onclick={(e) => {
										e.stopPropagation();
										openEditForm(hive);
									}}
									class="p-2 rounded-lg text-gray-600 active:bg-gray-100 transition-colors"
									aria-label="Edit hive"
								>
									✎
								</button>
								<button
									onclick={(e) => {
										e.stopPropagation();
										removeHive(hive.id);
									}}
									class="p-2 rounded-lg text-gray-600 active:bg-gray-100 transition-colors"
									aria-label="Remove hive"
								>
									🗑
								</button>
							</div>
						</div>

						<!-- Latest Inspection Status -->
						{#if latestInspection}
							<div class="border-t border-gray-100 pt-3 mt-3">
								<div class="flex items-center justify-between mb-2">
									<span class="text-xs font-medium text-gray-600">Latest Status</span>
									<div class="flex items-center gap-1">
										<span class="text-xs text-gray-500"
											>{formatDate(latestInspection.timestamp)}</span
										>
										{#if latestInspection.source === 'ai'}
											<span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">AI</span
											>
										{:else}
											<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded"
												>Manual</span
											>
										{/if}
									</div>
								</div>

								<div class="grid grid-cols-2 gap-3 text-xs">
									{#if latestInspection.finnsDrottning}
										<div class="flex items-center gap-1">
											<span class="text-gray-600">👑</span>
											<span
												class="{getStatusColor(
													latestInspection.finnsDrottning
												)} font-medium capitalize"
											>
												{latestInspection.finnsDrottning}
											</span>
										</div>
									{/if}

									{#if latestInspection.nylagdaÄgg}
										<div class="flex items-center gap-1">
											<span class="text-gray-600">🥚</span>
											<span
												class="{getStatusColor(latestInspection.nylagdaÄgg)} font-medium capitalize"
											>
												{latestInspection.nylagdaÄgg}
											</span>
										</div>
									{/if}

									{#if latestInspection.mängdBin}
										<div class="flex items-center gap-1">
											<span class="text-gray-600">🐝</span>
											<span class="{getHealthColor(latestInspection.mängdBin)} font-medium">
												{latestInspection.mängdBin}/5
											</span>
										</div>
									{/if}

									{#if latestInspection.binasHälsa}
										<div class="flex items-center gap-1">
											<span class="text-gray-600">❤️</span>
											<span class="{getHealthColor(latestInspection.binasHälsa)} font-medium">
												{latestInspection.binasHälsa}/5
											</span>
										</div>
									{/if}
								</div>
							</div>
						{:else}
							<div class="border-t border-gray-100 pt-3 mt-3">
								<div class="text-center">
									<div class="text-gray-400 text-xs mb-1">📋</div>
									<span class="text-xs text-gray-500">No inspection data</span>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Bottom sheet modal -->
	{#if showAddForm}
		<div class="fixed inset-0 bg-black/50 flex items-end z-50" onclick={resetForm}>
			<div
				class="bg-white rounded-t-2xl w-full max-h-[85vh] flex flex-col"
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Modal handle -->
				<div class="flex justify-center pt-3 pb-2">
					<div class="w-10 h-1 bg-gray-300 rounded-full"></div>
				</div>

				<!-- Modal header -->
				<div class="px-4 pb-4 border-b">
					<h2 class="text-lg font-bold text-center">
						{editingHive ? 'Edit Hive' : 'Add New Hive'}
					</h2>
				</div>

				<!-- Form content -->
				<div class="flex-1 overflow-y-auto px-4 py-4">
					<div class="space-y-4">
						<!-- Name -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2"> Hive Name * </label>
							<input
								type="text"
								bind:value={formName}
								placeholder="Main Hive, North Hive..."
								class="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
							/>
						</div>

						<!-- Location -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2"> Location </label>
							<input
								type="text"
								bind:value={formLocation}
								placeholder="Backyard, Garden..."
								class="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
							/>
						</div>

						<!-- Color -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2"> Color </label>
							<div class="grid grid-cols-8 gap-3">
								{#each hiveColors as color}
									<button
										type="button"
										onclick={() => (formColor = color)}
										class="w-8 h-8 rounded-full border-2 active:scale-110 transition-all {formColor ===
										color
											? 'border-gray-800 scale-110'
											: 'border-gray-200'}"
										style="background-color: {color}"
									></button>
								{/each}
							</div>
						</div>

						<!-- Notes -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2"> Notes </label>
							<textarea
								bind:value={formNotes}
								placeholder="Additional notes about this hive..."
								rows="3"
								class="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 resize-none"
							></textarea>
						</div>
					</div>
				</div>

				<!-- Modal footer -->
				<div class="p-4 border-t bg-gray-50">
					<div class="flex gap-3">
						<button
							onclick={resetForm}
							class="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium active:scale-95 transition-all duration-200"
						>
							Cancel
						</button>
						<button
							onclick={saveHive}
							disabled={!formName.trim()}
							class="flex-1 py-3 px-4 bg-amber-600 text-white rounded-xl font-medium active:scale-95 transition-all duration-200 disabled:opacity-50"
						>
							{editingHive ? 'Update' : 'Add'} Hive
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
