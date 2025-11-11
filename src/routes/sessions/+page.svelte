<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

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
	}

	interface CallRecord {
		id: string;
		timestamp: number;
		recording: string;
		duration: number | null;
		transcription: string | null;
		inspections: Inspection[];
	}

	interface Hive {
		id: string;
		name: string;
		color?: string;
	}

	let callRecords = $state<CallRecord[]>([]);
	let availableHives = $state<Hive[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showLinkDialog = $state(false);
	let linkingInspection = $state<Inspection | null>(null);
	let selectedHiveId = $state<string>('');
	let newHiveName = $state('');
	let creatingNewHive = $state(false);
	let submitting = $state(false);

	async function loadCallRecords() {
		try {
			loading = true;
			error = null;
			const response = await fetch('/api/call-records');
			if (!response.ok) throw new Error('Failed to fetch call records');
			const data = await response.json();
			callRecords = data.records;
		} catch (err) {
			console.error('Error loading call records:', err);
			error = err instanceof Error ? err.message : 'Failed to load call records';
		} finally {
			loading = false;
		}
	}

	async function loadHives() {
		try {
			const response = await fetch('/api/hives');
			if (!response.ok) throw new Error('Failed to fetch hives');
			const data = await response.json();
			availableHives = data.hives;
		} catch (err) {
			console.error('Error loading hives:', err);
		}
	}

	function openLinkDialog(inspection: Inspection) {
		linkingInspection = inspection;
		selectedHiveId = '';
		newHiveName = inspection.hive_name_transcript || '';
		creatingNewHive = false;
		showLinkDialog = true;
	}

	function closeLinkDialog() {
		showLinkDialog = false;
		linkingInspection = null;
		selectedHiveId = '';
		newHiveName = '';
		creatingNewHive = false;
	}

	async function linkToHive() {
		if (!linkingInspection) return;

		try {
			submitting = true;
			let hiveId = selectedHiveId;

			if (creatingNewHive && newHiveName.trim()) {
				const createResponse = await fetch('/api/hives', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: newHiveName.trim(),
						color: '#10B981'
					})
				});

				if (!createResponse.ok) throw new Error('Failed to create new hive');
				const createData = await createResponse.json();
				hiveId = createData.hive.id;
				await loadHives();
			}

			if (!hiveId) {
				alert('Please select or create a hive');
				return;
			}

			const linkResponse = await fetch(`/api/inspections/${linkingInspection.id}/link`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ hiveId })
			});

			if (!linkResponse.ok) throw new Error('Failed to link inspection to hive');

			await loadCallRecords();
			closeLinkDialog();
		} catch (err) {
			console.error('Error linking inspection:', err);
			alert(err instanceof Error ? err.message : 'Failed to link inspection to hive');
		} finally {
			submitting = false;
		}
	}

	onMount(() => {
		loadCallRecords();
		loadHives();
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

	function formatDuration(seconds: number | null): string {
		if (!seconds) return '';
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<div class="min-h-full bg-gradient-to-b from-gray-50 to-white">
	<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Inspektionssessioner</h1>
			<p class="text-base text-gray-600">
				{loading
					? 'Laddar...'
					: `${callRecords.length} ${callRecords.length === 1 ? 'session' : 'sessioner'} totalt`}
			</p>
		</div>

		<!-- Content -->
		{#if loading}
			<div class="flex flex-col items-center justify-center py-20">
				<div
					class="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4"
				></div>
				<p class="text-gray-600">Laddar sessioner...</p>
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
		{:else if callRecords.length === 0}
			<Card.Root class="border-dashed border-2">
				<Card.Content class="flex flex-col items-center justify-center py-20">
					<div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
						<svg
							class="w-10 h-10 text-blue-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
							/>
						</svg>
					</div>
					<h2 class="text-2xl font-bold text-gray-900 mb-2">Inga Sessioner Än</h2>
					<p class="text-gray-600 mb-6 text-center max-w-md">
						Starta din första inspektionssession med AI-assistenten
					</p>
					<Button href="/" size="lg">
						<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
							/>
						</svg>
						Starta Session
					</Button>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="space-y-6">
				{#each callRecords as record, index (record.id)}
					<div
						class="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200"
					>
						<!-- Session Header -->
						<div class="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
							<div class="flex items-center gap-4">
								<div
									class="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-md"
								>
									<svg
										class="w-7 h-7 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
										/>
									</svg>
								</div>
								<div class="flex-1">
									<h3 class="text-xl font-bold text-gray-900 mb-1">
										Session #{callRecords.length - index}
									</h3>
									<div class="flex items-center gap-3 text-sm text-gray-600">
										<span class="flex items-center gap-1">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
											{formatFullDateTime(record.timestamp)}
										</span>
										{#if record.duration}
											<span class="flex items-center gap-1">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
													/>
												</svg>
												{formatDuration(record.duration)}
											</span>
										{/if}
									</div>
								</div>
							</div>
						</div>

						<!-- Inspections -->
						<div class="p-6">
							{#if record.inspections && record.inspections.length > 0}
								<div class="mb-6">
									<div class="flex items-center gap-2 mb-4">
										<svg
											class="w-5 h-5 text-gray-600"
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
										<span class="text-base font-semibold text-gray-900">
											{record.inspections.length}
											{record.inspections.length === 1 ? 'kupa inspekterad' : 'kupor inspekterade'}
										</span>
									</div>

									<div class="grid gap-3">
										{#each record.inspections as inspection (inspection.id)}
											<div class="group relative">
												<!-- Clickable overlay -->
												<div
													onclick={() => goto(`/inspections/${inspection.id}`)}
													class="absolute inset-0 z-0 rounded-xl cursor-pointer"
													role="button"
													tabindex="0"
													onkeydown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault();
															goto(`/inspections/${inspection.id}`);
														}
													}}
												></div>

												<div
													class="relative z-10 p-4 rounded-xl border-2 transition-all duration-200 {inspection.matched
														? 'border-green-200 bg-green-50/50 hover:bg-green-50'
														: 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'} group-hover:shadow-md"
												>
													<!-- Hive Info -->
													<div class="flex items-center gap-3 mb-3">
														{#if inspection.matched && inspection.hive_name}
															<div
																class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm"
																style="background-color: {inspection.hive_color || '#10B981'}"
															>
																{inspection.hive_name.substring(0, 2).toUpperCase()}
															</div>
															<div class="flex-1">
																<div class="font-semibold text-gray-900">
																	{inspection.hive_name}
																</div>
																<div class="text-xs text-gray-600">Länkad kupa</div>
															</div>
														{:else if inspection.hive_name_transcript}
															<div
																class="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center text-amber-700 text-sm font-bold"
															>
																?
															</div>
															<div class="flex-1">
																<div class="font-semibold text-gray-900">
																	{inspection.hive_name_transcript}
																</div>
																<div class="text-xs text-amber-700">Ej länkad</div>
															</div>
															<Button
																size="sm"
																variant="outline"
																onclick={(e) => {
																	e.stopPropagation();
																	openLinkDialog(inspection);
																}}
																class="relative z-20 h-8 px-3 text-xs border-amber-300 hover:bg-amber-100"
															>
																Länka
															</Button>
														{/if}
													</div>

													<!-- Inspection Stats -->
													<div class="grid grid-cols-2 gap-2">
														{#if inspection.queen_present}
															<div
																class="flex items-center gap-2 px-3 py-2 rounded-lg {inspection.queen_present ===
																'ja'
																	? 'bg-green-100'
																	: 'bg-red-100'}"
															>
																<span class="text-lg">👑</span>
																<div class="flex-1 min-w-0">
																	<div class="text-xs text-gray-600">Drottning</div>
																	<div
																		class="text-sm font-semibold capitalize {inspection.queen_present ===
																		'ja'
																			? 'text-green-700'
																			: 'text-red-700'}"
																	>
																		{inspection.queen_present}
																	</div>
																</div>
															</div>
														{/if}

														{#if inspection.fresh_eggs}
															<div
																class="flex items-center gap-2 px-3 py-2 rounded-lg {inspection.fresh_eggs ===
																'ja'
																	? 'bg-green-100'
																	: 'bg-gray-100'}"
															>
																<span class="text-lg">🥚</span>
																<div class="flex-1 min-w-0">
																	<div class="text-xs text-gray-600">Ägg</div>
																	<div
																		class="text-sm font-semibold capitalize {inspection.fresh_eggs ===
																		'ja'
																			? 'text-green-700'
																			: 'text-gray-700'}"
																	>
																		{inspection.fresh_eggs}
																	</div>
																</div>
															</div>
														{/if}

														{#if inspection.bee_health}
															<div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100">
																<span class="text-lg">❤️</span>
																<div class="flex-1 min-w-0">
																	<div class="text-xs text-gray-600">Hälsa</div>
																	<div class="text-sm font-semibold text-blue-700">
																		{inspection.bee_health}/5
																	</div>
																</div>
															</div>
														{/if}

														{#if inspection.bee_quantity}
															<div
																class="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100"
															>
																<span class="text-lg">🐝</span>
																<div class="flex-1 min-w-0">
																	<div class="text-xs text-gray-600">Mängd</div>
																	<div class="text-sm font-semibold text-amber-700">
																		{inspection.bee_quantity}/5
																	</div>
																</div>
															</div>
														{/if}
													</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{:else}
								<div class="text-center py-8 bg-gray-50 rounded-lg">
									<svg
										class="w-12 h-12 text-gray-400 mx-auto mb-3"
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
									<p class="text-gray-600 text-sm">
										Inga inspektioner registrerade i denna session
									</p>
								</div>
							{/if}

							<!-- Audio Player -->
							{#if record.recording}
								<div class="mt-6 pt-6 border-t">
									<div class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
											/>
										</svg>
										<span>Ljudinspelning</span>
									</div>
									<audio
										controls
										class="w-full rounded-lg"
										preload="metadata"
										style="height: 54px;"
									>
										<source src={record.recording} type="audio/wav" />
										<source src={record.recording} type="audio/mpeg" />
										Din webbläsare stödjer inte ljuduppspelning.
									</audio>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Link Hive Dialog -->
<Dialog.Root bind:open={showLinkDialog}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title class="text-2xl">Länka Inspektion till Kupa</Dialog.Title>
			{#if linkingInspection?.hive_name_transcript}
				<p class="text-sm text-gray-600 mt-2">
					Nämnd i samtal:
					<span class="font-semibold text-gray-900">{linkingInspection.hive_name_transcript}</span>
				</p>
			{/if}
		</Dialog.Header>

		<div class="space-y-5 py-6">
			{#if !creatingNewHive}
				<!-- Select Existing Hive -->
				<div class="space-y-2">
					<Label for="select-hive" class="text-base">Välj befintlig kupa</Label>
					{#if availableHives.length > 0}
						<select
							id="select-hive"
							bind:value={selectedHiveId}
							class="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="">Välj en kupa...</option>
							{#each availableHives as hive (hive.id)}
								<option value={hive.id}>{hive.name}</option>
							{/each}
						</select>
					{:else}
						<div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
							<p class="text-sm text-amber-800">Inga kupor finns ännu. Skapa en ny kupa nedan.</p>
						</div>
					{/if}
				</div>

				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t border-gray-200"></div>
					</div>
					<div class="relative flex justify-center text-sm">
						<span class="px-4 bg-white text-gray-500">eller</span>
					</div>
				</div>

				<Button variant="outline" class="w-full h-11" onclick={() => (creatingNewHive = true)}>
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						/>
					</svg>
					Skapa Ny Kupa
				</Button>
			{:else}
				<!-- Create New Hive -->
				<div class="space-y-2">
					<Label for="new-hive-name" class="text-base">Namn på ny kupa</Label>
					<Input
						id="new-hive-name"
						bind:value={newHiveName}
						placeholder="Huvudkupa, Norra kupan..."
						class="h-11"
					/>
				</div>

				<Button variant="ghost" class="w-full" onclick={() => (creatingNewHive = false)}>
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Tillbaka till befintliga kupor
				</Button>
			{/if}
		</div>

		<Dialog.Footer class="gap-3">
			<Button
				variant="outline"
				onclick={closeLinkDialog}
				disabled={submitting}
				size="lg"
				class="flex-1"
			>
				Avbryt
			</Button>
			<Button
				onclick={linkToHive}
				disabled={submitting ||
					(!creatingNewHive && !selectedHiveId) ||
					(creatingNewHive && !newHiveName.trim())}
				size="lg"
				class="flex-1"
			>
				{submitting ? 'Sparar...' : 'Länka'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
