<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';

	interface Hive {
		id: string;
		name: string;
		location?: string;
		notes?: string;
		color?: string;
		date_added: number;
		is_active: number;
		latest_inspection?: {
			id: string;
			queen_present: string;
			fresh_eggs: string;
			bee_health: number;
			bee_quantity: number;
			timestamp: number;
		};
		inspection_count?: number;
	}

	let availableHives = $state<Hive[]>([]);
	let filteredHives = $state<Hive[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showDialog = $state(false);
	let editingHive = $state<Hive | null>(null);
	let searchQuery = $state('');
	let activeFilter = $state<'all' | 'warning' | 'healthy' | 'uninspected'>('all');

	// Form fields
	let formName = $state('');
	let formLocation = $state('');
	let formNotes = $state('');
	let formColor = $state('#10B981');
	let submitting = $state(false);

	const hiveColors = [
		{ color: '#10B981', name: 'Emerald' },
		{ color: '#F59E0B', name: 'Amber' },
		{ color: '#EF4444', name: 'Red' },
		{ color: '#3B82F6', name: 'Blue' },
		{ color: '#8B5CF6', name: 'Purple' },
		{ color: '#F97316', name: 'Orange' },
		{ color: '#06B6D4', name: 'Cyan' },
		{ color: '#84CC16', name: 'Lime' }
	];

	async function loadHives() {
		try {
			loading = true;
			error = null;

			const hivesResponse = await fetch('/api/hives');
			if (!hivesResponse.ok) throw new Error('Failed to fetch hives');
			const hivesData = await hivesResponse.json();

			const hivesWithInspections = await Promise.all(
				hivesData.hives.map(async (hive: Hive) => {
					try {
						const inspectionsResponse = await fetch(`/api/inspections?hive_id=${hive.id}`);
						if (inspectionsResponse.ok) {
							const inspectionsData = await inspectionsResponse.json();
							const inspectionCount = inspectionsData.inspections.length;
							if (inspectionCount > 0) {
								const latest = inspectionsData.inspections[0];
								return {
									...hive,
									inspection_count: inspectionCount,
									latest_inspection: {
										id: latest.id,
										queen_present: latest.queen_present,
										fresh_eggs: latest.fresh_eggs,
										bee_health: latest.bee_health,
										bee_quantity: latest.bee_quantity,
										timestamp: latest.timestamp
									}
								};
							}
							return { ...hive, inspection_count: 0 };
						}
					} catch (err) {
						console.error(`Failed to load inspections for hive ${hive.id}`, err);
					}
					return { ...hive, inspection_count: 0 };
				})
			);

			availableHives = hivesWithInspections;
			applyFilters();
		} catch (err) {
			console.error('Error loading hives:', err);
			error = err instanceof Error ? err.message : 'Failed to load hives';
		} finally {
			loading = false;
		}
	}

	function getHealthStatus(hive: Hive): 'warning' | 'healthy' | 'uninspected' {
		if (!hive.latest_inspection) return 'uninspected';
		const { queen_present, bee_health } = hive.latest_inspection;
		if (queen_present === 'nej' || (bee_health && bee_health < 3)) return 'warning';
		if (queen_present === 'ja' && bee_health && bee_health >= 3) return 'healthy';
		return 'uninspected';
	}

	function applyFilters() {
		let result = [...availableHives];

		// Filter by status
		if (activeFilter !== 'all') {
			result = result.filter((h) => getHealthStatus(h) === activeFilter);
		}

		// Search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(h) =>
					h.name.toLowerCase().includes(query) ||
					h.location?.toLowerCase().includes(query) ||
					h.notes?.toLowerCase().includes(query)
			);
		}

		// Sort: warnings first, then by most recent inspection
		result.sort((a, b) => {
			const aStatus = getHealthStatus(a);
			const bStatus = getHealthStatus(b);

			// Warnings first
			if (aStatus === 'warning' && bStatus !== 'warning') return -1;
			if (bStatus === 'warning' && aStatus !== 'warning') return 1;

			// Then by most recent inspection
			const aTime = a.latest_inspection?.timestamp || 0;
			const bTime = b.latest_inspection?.timestamp || 0;
			return bTime - aTime;
		});

		filteredHives = result;
	}

	$effect(() => {
		applyFilters();
	});

	onMount(() => {
		loadHives();
	});

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 60) return diffMins <= 1 ? 'Just nu' : `${diffMins} min sedan`;
		if (diffHours < 24) return `${diffHours}h sedan`;
		if (diffDays === 0) return 'Idag';
		if (diffDays === 1) return 'Igår';
		if (diffDays < 7) return `${diffDays}d sedan`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)}v sedan`;

		return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
	}

	function openHiveDetail(hive: Hive) {
		goto(`/hives/${hive.id}`);
	}

	function openLatestInspection(hive: Hive, event: MouseEvent) {
		event.stopPropagation();
		if (hive.latest_inspection?.id) {
			goto(`/inspections/${hive.latest_inspection.id}`);
		}
	}

	function openAddDialog() {
		resetForm();
		showDialog = true;
		editingHive = null;
	}

	function openEditDialog(hive: Hive, event: MouseEvent) {
		event.stopPropagation();
		formName = hive.name;
		formLocation = hive.location || '';
		formNotes = hive.notes || '';
		formColor = hive.color || '#10B981';
		editingHive = hive;
		showDialog = true;
	}

	function resetForm() {
		formName = '';
		formLocation = '';
		formNotes = '';
		formColor = '#10B981';
		editingHive = null;
		showDialog = false;
	}

	async function saveHive() {
		if (!formName.trim()) return;

		try {
			submitting = true;

			if (editingHive) {
				const response = await fetch(`/api/hives/${editingHive.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: formName.trim(),
						location: formLocation.trim() || null,
						notes: formNotes.trim() || null,
						color: formColor
					})
				});

				if (!response.ok) throw new Error('Failed to update hive');
			} else {
				const response = await fetch('/api/hives', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: formName.trim(),
						location: formLocation.trim() || null,
						notes: formNotes.trim() || null,
						color: formColor
					})
				});

				if (!response.ok) throw new Error('Failed to create hive');
			}

			await loadHives();
			resetForm();
		} catch (err) {
			console.error('Error saving hive:', err);
			alert(err instanceof Error ? err.message : 'Failed to save hive');
		} finally {
			submitting = false;
		}
	}

	async function removeHive(hive: Hive, event: MouseEvent) {
		event.stopPropagation();
		if (!confirm(`Är du säker på att du vill ta bort "${hive.name}"?`)) return;

		try {
			const response = await fetch(`/api/hives/${hive.id}`, {
				method: 'PATCH'
			});

			if (!response.ok) throw new Error('Failed to archive hive');
			await loadHives();
		} catch (err) {
			console.error('Error removing hive:', err);
			alert(err instanceof Error ? err.message : 'Failed to remove hive');
		}
	}

	// Computed counts for filters
	let warningCount = $derived(
		availableHives.filter((h) => getHealthStatus(h) === 'warning').length
	);
	let healthyCount = $derived(
		availableHives.filter((h) => getHealthStatus(h) === 'healthy').length
	);
	let uninspectedCount = $derived(
		availableHives.filter((h) => getHealthStatus(h) === 'uninspected').length
	);
</script>

<div class="min-h-full bg-gradient-to-b from-gray-50 to-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Mina Kupor</h1>
					<p class="text-base text-gray-600">
						{loading ? 'Laddar...' : `${availableHives.length} kupor totalt`}
					</p>
				</div>
				<Button onclick={openAddDialog} size="lg" class="gap-2 shadow-sm">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
							clip-rule="evenodd"
						/>
					</svg>
					<span class="hidden sm:inline">Ny Kupa</span>
					<span class="sm:hidden">Ny</span>
				</Button>
			</div>

			<!-- Search & Filters -->
			{#if !loading && availableHives.length > 0}
				<div class="space-y-4">
					<!-- Search -->
					<div class="relative">
						<svg
							class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						<Input
							type="search"
							placeholder="Sök kupor efter namn, plats eller anteckningar..."
							bind:value={searchQuery}
							class="pl-10 h-12 text-base"
						/>
					</div>

					<!-- Filter Pills -->
					<div class="flex flex-wrap gap-2">
						<button
							onclick={() => (activeFilter = 'all')}
							class="px-4 py-2 rounded-full text-sm font-medium transition-all {activeFilter ===
							'all'
								? 'bg-gray-900 text-white shadow-md'
								: 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'}"
						>
							Alla ({availableHives.length})
						</button>
						<button
							onclick={() => (activeFilter = 'warning')}
							class="px-4 py-2 rounded-full text-sm font-medium transition-all {activeFilter ===
							'warning'
								? 'bg-red-600 text-white shadow-md'
								: 'bg-white text-gray-700 border border-gray-300 hover:border-red-200'}"
						>
							<span class="flex items-center gap-1.5">
								{#if warningCount > 0}
									<span
										class="w-2 h-2 bg-red-500 rounded-full {activeFilter === 'warning'
											? 'bg-white'
											: ''}"
									></span>
								{/if}
								Behöver Uppmärksamhet ({warningCount})
							</span>
						</button>
						<button
							onclick={() => (activeFilter = 'healthy')}
							class="px-4 py-2 rounded-full text-sm font-medium transition-all {activeFilter ===
							'healthy'
								? 'bg-green-600 text-white shadow-md'
								: 'bg-white text-gray-700 border border-gray-300 hover:border-green-200'}"
						>
							Friska ({healthyCount})
						</button>
						<button
							onclick={() => (activeFilter = 'uninspected')}
							class="px-4 py-2 rounded-full text-sm font-medium transition-all {activeFilter ===
							'uninspected'
								? 'bg-gray-600 text-white shadow-md'
								: 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'}"
						>
							Ej Inspekterade ({uninspectedCount})
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Content -->
		{#if loading}
			<div class="flex flex-col items-center justify-center py-20">
				<div
					class="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4"
				></div>
				<p class="text-gray-600">Laddar kupor...</p>
			</div>
		{:else if error}
			<Card.Root class="border-red-200 bg-red-50">
				<Card.Content class="pt-6">
					<div class="flex items-start gap-3">
						<svg class="h-6 w-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
						<div>
							<h3 class="text-red-900 font-semibold mb-1">Något gick fel</h3>
							<p class="text-red-700 text-sm">{error}</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if availableHives.length === 0}
			<Card.Root class="border-dashed border-2">
				<Card.Content class="flex flex-col items-center justify-center py-20">
					<div class="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4">
						<svg
							class="w-10 h-10 text-amber-600"
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
					<h2 class="text-2xl font-bold text-gray-900 mb-2">Välkommen till BeeKeep!</h2>
					<p class="text-gray-600 mb-6 text-center max-w-md">
						Börja med att lägga till din första kupa för att hålla koll på dina bin och deras hälsa
					</p>
					<Button onclick={openAddDialog} size="lg">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 mr-2"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
								clip-rule="evenodd"
							/>
						</svg>
						Lägg till din första kupa
					</Button>
				</Card.Content>
			</Card.Root>
		{:else if filteredHives.length === 0}
			<Card.Root class="border-dashed border-2">
				<Card.Content class="flex flex-col items-center justify-center py-16">
					<div class="text-6xl mb-4">🔍</div>
					<h3 class="text-xl font-semibold text-gray-900 mb-2">Inga matchande kupor</h3>
					<p class="text-gray-600 mb-4">Prova att justera dina filter eller sökord</p>
					<Button
						variant="outline"
						onclick={() => {
							searchQuery = '';
							activeFilter = 'all';
						}}
					>
						Rensa filter
					</Button>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each filteredHives as hive (hive.id)}
					{@const status = getHealthStatus(hive)}
					<div
						class="group relative bg-white rounded-2xl border-2 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer {status ===
						'warning'
							? 'border-red-200 hover:border-red-300'
							: status === 'healthy'
								? 'border-green-200 hover:border-green-300'
								: 'border-gray-200 hover:border-gray-300'}"
					>
						<!-- Clickable overlay -->
						<div
							onclick={() => openHiveDetail(hive)}
							class="absolute inset-0 z-0 rounded-2xl"
							role="button"
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									openHiveDetail(hive);
								}
							}}
						></div>

						<!-- Card Header with Status -->
						<div class="p-6 pb-4 relative z-10">
							<div class="flex items-start justify-between mb-4">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-3 mb-2">
										<div
											class="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md"
											style="background-color: {hive.color || '#10B981'}"
										>
											{hive.name.substring(0, 2).toUpperCase()}
										</div>
										<div class="flex-1 min-w-0">
											<h3
												class="text-xl font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors"
											>
												{hive.name}
											</h3>
											{#if hive.location}
												<p class="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
													<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
															clip-rule="evenodd"
														/>
													</svg>
													{hive.location}
												</p>
											{/if}
										</div>
									</div>
								</div>

								<!-- Action buttons -->
								<div class="flex gap-1 ml-2 relative z-20">
									<button
										onclick={(e) => openEditDialog(hive, e)}
										class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
										title="Redigera"
										aria-label="Redigera"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
									<button
										onclick={(e) => removeHive(hive, e)}
										class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
										title="Ta bort"
										aria-label="Ta bort"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>
							</div>

							<!-- Status Badge -->
							<div class="inline-flex">
								{#if status === 'warning'}
									<div
										class="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium"
									>
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
												clip-rule="evenodd"
											/>
										</svg>
										Behöver uppmärksamhet
									</div>
								{:else if status === 'healthy'}
									<div
										class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium"
									>
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
												clip-rule="evenodd"
											/>
										</svg>
										Frisk
									</div>
								{:else}
									<div
										class="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium"
									>
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
												clip-rule="evenodd"
											/>
										</svg>
										Ej inspekterad
									</div>
								{/if}
							</div>
						</div>

						<!-- Divider -->
						<div class="px-6 relative z-10">
							<div class="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
						</div>

						<!-- Inspection Info -->
						<div class="p-6 pt-4 relative z-10">
							{#if hive.latest_inspection}
								<div class="space-y-3">
									<!-- Quick stats grid -->
									<div class="grid grid-cols-2 gap-3">
										<!-- Queen -->
										<div
											class="flex items-center gap-2 p-2.5 rounded-lg {hive.latest_inspection
												.queen_present === 'ja'
												? 'bg-green-50'
												: 'bg-red-50'}"
										>
											<div
												class="w-8 h-8 rounded-lg flex items-center justify-center {hive
													.latest_inspection.queen_present === 'ja'
													? 'bg-green-100'
													: 'bg-red-100'}"
											>
												<span class="text-lg">👑</span>
											</div>
											<div class="flex-1 min-w-0">
												<div class="text-xs text-gray-600">Drottning</div>
												<div
													class="text-sm font-semibold capitalize {hive.latest_inspection
														.queen_present === 'ja'
														? 'text-green-700'
														: 'text-red-700'}"
												>
													{hive.latest_inspection.queen_present}
												</div>
											</div>
										</div>

										<!-- Eggs -->
										{#if hive.latest_inspection.fresh_eggs}
											<div
												class="flex items-center gap-2 p-2.5 rounded-lg {hive.latest_inspection
													.fresh_eggs === 'ja'
													? 'bg-green-50'
													: 'bg-gray-50'}"
											>
												<div
													class="w-8 h-8 rounded-lg flex items-center justify-center {hive
														.latest_inspection.fresh_eggs === 'ja'
														? 'bg-green-100'
														: 'bg-gray-100'}"
												>
													<span class="text-lg">🥚</span>
												</div>
												<div class="flex-1 min-w-0">
													<div class="text-xs text-gray-600">Ägg</div>
													<div
														class="text-sm font-semibold capitalize {hive.latest_inspection
															.fresh_eggs === 'ja'
															? 'text-green-700'
															: 'text-gray-700'}"
													>
														{hive.latest_inspection.fresh_eggs}
													</div>
												</div>
											</div>
										{/if}

										<!-- Health -->
										{#if hive.latest_inspection.bee_health}
											<div class="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50">
												<div
													class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"
												>
													<span class="text-lg">❤️</span>
												</div>
												<div class="flex-1 min-w-0">
													<div class="text-xs text-gray-600">Hälsa</div>
													<div class="text-sm font-semibold text-blue-700">
														{hive.latest_inspection.bee_health}/5
													</div>
												</div>
											</div>
										{/if}

										<!-- Quantity -->
										{#if hive.latest_inspection.bee_quantity}
											<div class="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50">
												<div
													class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"
												>
													<span class="text-lg">🐝</span>
												</div>
												<div class="flex-1 min-w-0">
													<div class="text-xs text-gray-600">Mängd</div>
													<div class="text-sm font-semibold text-amber-700">
														{hive.latest_inspection.bee_quantity}/5
													</div>
												</div>
											</div>
										{/if}
									</div>

									<!-- Last inspection time -->
									<div class="flex items-center justify-between text-xs pt-2">
										<span class="text-gray-500">
											Senast: {formatDate(hive.latest_inspection.timestamp)}
										</span>
										<button
											onclick={(e) => openLatestInspection(hive, e)}
											class="relative z-20 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
										>
											Visa
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 5l7 7-7 7"
												/>
											</svg>
										</button>
									</div>
								</div>
							{:else}
								<div class="text-center py-6">
									<div
										class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"
									>
										<svg
											class="w-6 h-6 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
											/>
										</svg>
									</div>
									<p class="text-sm text-gray-600 mb-1">Ingen inspektion ännu</p>
									<p class="text-xs text-gray-500">Klicka för att se detaljer</p>
								</div>
							{/if}
						</div>

						<!-- Footer -->
						<div class="px-6 pb-6 relative z-10">
							<div class="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
								<span>
									{hive.inspection_count || 0}
									{hive.inspection_count === 1 ? 'inspektion' : 'inspektioner'}
								</span>
								<span>Skapad {formatDate(hive.date_added)}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Add/Edit Dialog -->
<Dialog.Root bind:open={showDialog}>
	<Dialog.Content class="sm:max-w-[540px]">
		<Dialog.Header>
			<Dialog.Title class="text-2xl">
				{editingHive ? 'Redigera Kupa' : 'Lägg till Ny Kupa'}
			</Dialog.Title>
		</Dialog.Header>
		<div class="space-y-5 py-6">
			<!-- Name -->
			<div class="space-y-2">
				<Label for="name" class="text-base">Kupnamn *</Label>
				<Input
					id="name"
					bind:value={formName}
					placeholder="Huvudkupa, Norra kupan..."
					required
					class="h-11"
				/>
			</div>

			<!-- Location -->
			<div class="space-y-2">
				<Label for="location" class="text-base">Plats</Label>
				<Input
					id="location"
					bind:value={formLocation}
					placeholder="Bakgård, Trädgård..."
					class="h-11"
				/>
			</div>

			<!-- Color -->
			<div class="space-y-3">
				<Label class="text-base">Färg</Label>
				<div class="grid grid-cols-4 gap-3">
					{#each hiveColors as { color, name } (color)}
						<button
							type="button"
							onclick={() => (formColor = color)}
							class="group relative h-14 rounded-xl transition-all {formColor === color
								? 'ring-2 ring-offset-2 ring-gray-900 scale-105'
								: 'hover:scale-105'}"
							style="background-color: {color}"
							title={name}
						>
							{#if formColor === color}
								<div
									class="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl"
								>
									<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<!-- Notes -->
			<div class="space-y-2">
				<Label for="notes" class="text-base">Anteckningar</Label>
				<Textarea
					id="notes"
					bind:value={formNotes}
					placeholder="Ytterligare information om kupan..."
					rows={4}
					class="resize-none"
				/>
			</div>
		</div>
		<Dialog.Footer class="gap-3">
			<Button variant="outline" onclick={resetForm} disabled={submitting} size="lg" class="flex-1">
				Avbryt
			</Button>
			<Button onclick={saveHive} disabled={!formName.trim() || submitting} size="lg" class="flex-1">
				{submitting ? 'Sparar...' : editingHive ? 'Uppdatera' : 'Lägg till'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
