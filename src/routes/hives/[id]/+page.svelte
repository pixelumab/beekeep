<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { hives, inspections, getHives, getInspections } from '$lib/stores.svelte.js';
	import type { Hive, HiveInspection } from '$lib/types.js';

	// Core state
	let fromSession = $state(false);
	let dataLoaded = $state(false);

	// Reactive computed values using $derived
	let currentHiveId = $derived($page.params.id);
	let hive = $derived(
		!dataLoaded || !currentHiveId ? null : getHives().find((h) => h.id === currentHiveId) || null
	);
	let hiveInspections = $derived(
		!dataLoaded || !currentHiveId ? [] : inspections.getByHiveId(getInspections(), currentHiveId)
	);
	let latestInspection = $derived(hiveInspections[0] || null);

	onMount(() => {
		hives.load();
		inspections.load();
		dataLoaded = true;

		// Check if we came from session page
		const urlParams = new URLSearchParams(window.location.search);
		fromSession = urlParams.get('from') === 'session';
	});

	// Effect to handle navigation to non-existent hive
	$effect(() => {
		if (dataLoaded && currentHiveId && hive === null) {
			goto('/hives');
		}
	});

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
						<span class="text-blue-800 font-medium">Visad från Inspelningssession</span>
					</div>
					<p class="text-blue-700 text-sm">
						Denna kupa uppdaterades nyligen från en transkriberad inspelning. Använd
						tillbaka-knappen för att återgå till dina sessioner.
					</p>
				</div>
			{/if}

			<!-- Latest Status Card -->
			{#if latestInspection}
				<div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
					<div class="flex items-center justify-between mb-3">
						<h2 class="text-lg font-semibold text-gray-900">Senaste Status</h2>
						<div class="flex items-center gap-2">
							<span class="text-xs text-gray-500">
								{formatDate(latestInspection.timestamp)}
							</span>
							{#if latestInspection.source === 'ai'}
								<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">AI</span>
							{:else}
								<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full"
									>Manuell</span
								>
							{/if}
						</div>
					</div>

					<!-- Status Overview Card -->
					<div
						class="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200"
					>
						<div class="flex items-center gap-2 mb-3">
							<div class="w-2 h-2 rounded-full bg-amber-500"></div>
							<h4 class="font-semibold text-gray-800">Inspektionsöversikt</h4>
							<span class="text-xs text-gray-500 ml-auto">Alla registrerade värden</span>
						</div>
						<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
							<!-- Core Status Fields -->
							{#if latestInspection.finnsDrottning}
								<div class="flex items-center gap-2">
									<span class="text-lg">👑</span>
									<div>
										<div class="text-xs text-gray-600">Drottning</div>
										<span
											class="text-sm font-medium {getStatusColor(
												latestInspection.finnsDrottning
											)} capitalize"
										>
											{latestInspection.finnsDrottning}
										</span>
									</div>
								</div>
							{/if}

							{#if latestInspection.nylagdaÄgg}
								<div class="flex items-center gap-2">
									<span class="text-lg">🥚</span>
									<div>
										<div class="text-xs text-gray-600">Ägg</div>
										<span
											class="text-sm font-medium {getStatusColor(
												latestInspection.nylagdaÄgg
											)} capitalize"
										>
											{latestInspection.nylagdaÄgg}
										</span>
									</div>
								</div>
							{/if}

							{#if latestInspection.mängdBin}
								<div class="flex items-center gap-2">
									<span class="text-lg">🐝</span>
									<div>
										<div class="text-xs text-gray-600">Population</div>
										<div class="flex items-center gap-1">
											<span class="text-sm font-medium {getHealthColor(latestInspection.mängdBin)}">
												{latestInspection.mängdBin}/5
											</span>
											<div class="flex gap-0.5">
												{#each Array(5) as _, i}
													<div
														class="w-1.5 h-1.5 rounded-full {i < latestInspection.mängdBin
															? 'bg-current'
															: 'bg-gray-200'} {getHealthColor(latestInspection.mängdBin)}"
													></div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{/if}

							{#if latestInspection.binasHälsa}
								<div class="flex items-center gap-2">
									<span class="text-lg">❤️</span>
									<div>
										<div class="text-xs text-gray-600">Hälsa</div>
										<div class="flex items-center gap-1">
											<span
												class="text-sm font-medium {getHealthColor(latestInspection.binasHälsa)}"
											>
												{latestInspection.binasHälsa}/5
											</span>
											<div class="flex gap-0.5">
												{#each Array(5) as _, i}
													<div
														class="w-1.5 h-1.5 rounded-full {i < latestInspection.binasHälsa
															? 'bg-current'
															: 'bg-gray-200'} {getHealthColor(latestInspection.binasHälsa)}"
													></div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{/if}

							<!-- Brood & Food -->
							{#if latestInspection.yngelstatus}
								<div class="flex items-center gap-2">
									<span class="text-lg">🍼</span>
									<div>
										<div class="text-xs text-gray-600">Yngelstatus</div>
										<div class="flex items-center gap-1">
											<span
												class="text-sm font-medium {getHealthColor(latestInspection.yngelstatus)}"
											>
												{latestInspection.yngelstatus}/5
											</span>
											<div class="flex gap-0.5">
												{#each Array(5) as _, i}
													<div
														class="w-1.5 h-1.5 rounded-full {i < latestInspection.yngelstatus
															? 'bg-current'
															: 'bg-gray-200'} {getHealthColor(latestInspection.yngelstatus)}"
													></div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{/if}

							{#if latestInspection.foder}
								<div class="flex items-center gap-2">
									<span class="text-lg">🍯</span>
									<div>
										<div class="text-xs text-gray-600">Foder</div>
										<div class="flex items-center gap-1">
											<span class="text-sm font-medium {getHealthColor(latestInspection.foder)}">
												{latestInspection.foder}/5
											</span>
											<div class="flex gap-0.5">
												{#each Array(5) as _, i}
													<div
														class="w-1.5 h-1.5 rounded-full {i < latestInspection.foder
															? 'bg-current'
															: 'bg-gray-200'} {getHealthColor(latestInspection.foder)}"
													></div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{/if}

							<!-- Behavior & Risk -->
							{#if latestInspection.svärmningsrisk}
								<div class="flex items-center gap-2">
									<span class="text-lg">⚠️</span>
									<div>
										<div class="text-xs text-gray-600">Svärmningsrisk</div>
										<div class="flex items-center gap-1">
											<span
												class="text-sm font-medium {latestInspection.svärmningsrisk >= 4
													? 'text-red-600'
													: latestInspection.svärmningsrisk === 3
														? 'text-yellow-600'
														: 'text-green-600'}"
											>
												{latestInspection.svärmningsrisk}/5
											</span>
											<div class="flex gap-0.5">
												{#each Array(5) as _, i}
													<div
														class="w-1.5 h-1.5 rounded-full {i < latestInspection.svärmningsrisk
															? 'bg-current'
															: 'bg-gray-200'} {latestInspection.svärmningsrisk >= 4
															? 'text-red-600'
															: latestInspection.svärmningsrisk === 3
																? 'text-yellow-600'
																: 'text-green-600'}"
													></div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{/if}

							{#if latestInspection.aktivitetVidFlustret}
								<div class="flex items-center gap-2">
									<span class="text-lg">🚪</span>
									<div>
										<div class="text-xs text-gray-600">Aktivitet</div>
										<div class="flex items-center gap-1">
											<span
												class="text-sm font-medium {getHealthColor(
													latestInspection.aktivitetVidFlustret
												)}"
											>
												{latestInspection.aktivitetVidFlustret}/5
											</span>
											<div class="flex gap-0.5">
												{#each Array(5) as _, i}
													<div
														class="w-1.5 h-1.5 rounded-full {i <
														latestInspection.aktivitetVidFlustret
															? 'bg-current'
															: 'bg-gray-200'} {getHealthColor(
															latestInspection.aktivitetVidFlustret
														)}"
													></div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{/if}

							{#if latestInspection.aggressivitet}
								<div class="flex items-center gap-2">
									<span class="text-lg">🐝</span>
									<div>
										<div class="text-xs text-gray-600">Aggressivitet</div>
										<div class="flex items-center gap-1">
											<span
												class="text-sm font-medium {latestInspection.aggressivitet >= 4
													? 'text-red-600'
													: latestInspection.aggressivitet === 3
														? 'text-yellow-600'
														: 'text-green-600'}"
											>
												{latestInspection.aggressivitet}/5
											</span>
											<div class="flex gap-0.5">
												{#each Array(5) as _, i}
													<div
														class="w-1.5 h-1.5 rounded-full {i < latestInspection.aggressivitet
															? 'bg-current'
															: 'bg-gray-200'} {latestInspection.aggressivitet >= 4
															? 'text-red-600'
															: latestInspection.aggressivitet === 3
																? 'text-yellow-600'
																: 'text-green-600'}"
													></div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{/if}

							<!-- Health & Condition -->
							{#if latestInspection.fuktMögel}
								<div class="flex items-center gap-2">
									<span class="text-lg">💧</span>
									<div>
										<div class="text-xs text-gray-600">Fukt/Mögel</div>
										<span
											class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {latestInspection.fuktMögel ===
											'ja'
												? 'bg-red-100 text-red-800'
												: 'bg-green-100 text-green-800'} capitalize"
										>
											{latestInspection.fuktMögel}
										</span>
									</div>
								</div>
							{/if}

							{#if latestInspection.varroastatus}
								<div class="flex items-center gap-2">
									<span class="text-lg">🦠</span>
									<div>
										<div class="text-xs text-gray-600">Varroa</div>
										<div class="flex items-center gap-1">
											<span
												class="text-sm font-medium {latestInspection.varroastatus >= 4
													? 'text-red-600'
													: latestInspection.varroastatus === 3
														? 'text-yellow-600'
														: 'text-green-600'}"
											>
												{latestInspection.varroastatus}/5
											</span>
											<div class="flex gap-0.5">
												{#each Array(5) as _, i}
													<div
														class="w-1.5 h-1.5 rounded-full {i < latestInspection.varroastatus
															? 'bg-current'
															: 'bg-gray-200'} {latestInspection.varroastatus >= 4
															? 'text-red-600'
															: latestInspection.varroastatus === 3
																? 'text-yellow-600'
																: 'text-green-600'}"
													></div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{/if}

							{#if latestInspection.kupansSkick}
								<div class="flex items-center gap-2">
									<span class="text-lg">🏠</span>
									<div>
										<div class="text-xs text-gray-600">Kupans skick</div>
										<div class="flex items-center gap-1">
											<span
												class="text-sm font-medium {latestInspection.kupansSkick <= 2
													? 'text-red-600'
													: latestInspection.kupansSkick === 3
														? 'text-yellow-600'
														: 'text-green-600'}"
											>
												{latestInspection.kupansSkick}/5
											</span>
											<div class="flex gap-0.5">
												{#each Array(5) as _, i}
													<div
														class="w-1.5 h-1.5 rounded-full {i < latestInspection.kupansSkick
															? 'bg-current'
															: 'bg-gray-200'} {latestInspection.kupansSkick <= 2
															? 'text-red-600'
															: latestInspection.kupansSkick === 3
																? 'text-yellow-600'
																: 'text-green-600'}"
													></div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{/if}

							<!-- Honey Production -->
							{#if latestInspection.antalSkattlådar}
								<div class="flex items-center gap-2">
									<span class="text-lg">📦</span>
									<div>
										<div class="text-xs text-gray-600">Skattlådor</div>
										<span class="text-sm font-medium text-gray-900">
											{latestInspection.antalSkattlådar} st
										</span>
									</div>
								</div>
							{/if}

							{#if latestInspection.skattlådorFulla}
								<div class="flex items-center gap-2">
									<span class="text-lg">📊</span>
									<div>
										<div class="text-xs text-gray-600">Lådor fulla</div>
										<span
											class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {latestInspection.skattlådorFulla ===
											'ja'
												? 'bg-green-100 text-green-800'
												: 'bg-gray-100 text-gray-800'} capitalize"
										>
											{latestInspection.skattlådorFulla}
										</span>
									</div>
								</div>
							{/if}

							<!-- Environmental (show only if compact) -->
							{#if latestInspection.väder}
								<div class="flex items-center gap-2">
									<span class="text-lg">🌤️</span>
									<div>
										<div class="text-xs text-gray-600">Väder</div>
										<span class="text-sm text-gray-900 truncate max-w-20">
											{latestInspection.väder}
										</span>
									</div>
								</div>
							{/if}
						</div>
					</div>

					<!-- Notes if available -->
					{#if latestInspection.notes}
						<div class="bg-white rounded-lg border border-gray-200 p-4 mt-4">
							<div class="flex items-center gap-2 mb-3">
								<div class="w-2 h-2 rounded-full bg-gray-500"></div>
								<h4 class="font-semibold text-gray-800">Anteckningar</h4>
							</div>
							<div class="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
								{latestInspection.notes}
							</div>
						</div>
					{/if}

					<!-- Planned Actions if available -->
					{#if latestInspection.planeradÅtgärd}
						<div class="bg-blue-50 rounded-lg border border-blue-200 p-4 mt-4">
							<div class="flex items-center gap-2 mb-3">
								<div class="w-2 h-2 rounded-full bg-blue-500"></div>
								<h4 class="font-semibold text-gray-800">Planerade Åtgärder</h4>
							</div>
							<div class="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100">
								<span class="text-xl">📋</span>
								<div class="flex-1">
									<div class="text-sm font-medium text-gray-900 mb-1">Nästa steg</div>
									<div class="text-sm text-gray-700">{latestInspection.planeradÅtgärd}</div>
								</div>
							</div>
						</div>
					{/if}

					{#if latestInspection.extractionConfidence}
						<div class="mt-3 pt-3 border-t border-gray-100">
							<span class="text-xs text-gray-500">
								AI Säkerhet: {Math.round(latestInspection.extractionConfidence * 100)}%
							</span>
						</div>
					{/if}
				</div>
			{:else}
				<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
					<div class="text-gray-400 mb-2">📋</div>
					<h3 class="text-lg font-medium text-gray-900 mb-1">Inga Inspektioner Än</h3>
					<p class="text-sm text-gray-600 mb-4">
						Ingen inspektionsdata har registrerats för denna kupa.
					</p>
				</div>
			{/if}

			<!-- Inspektionshistorik -->
			{#if hiveInspections.length > 0}
				<div class="bg-white rounded-xl shadow-sm border border-gray-200">
					<div class="p-4 border-b border-gray-200">
						<h3 class="text-lg font-semibold text-gray-900">Inspektionshistorik</h3>
					</div>

					<div class="divide-y divide-gray-100">
						{#each hiveInspections as inspection (inspection.id)}
							{@const typedInspection = inspection as HiveInspection}
							<div class="p-4">
								<div class="flex items-center justify-between mb-2">
									<span class="text-sm font-medium text-gray-900">
										{formatDate(typedInspection.timestamp)}
									</span>
									<div class="flex items-center gap-2">
										{#if typedInspection.source === 'ai'}
											<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
												>AI</span
											>
										{:else}
											<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full"
												>Manuell</span
											>
										{/if}
										{#if typedInspection.confirmed}
											<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
												>Bekräftad</span
											>
										{/if}
									</div>
								</div>

								<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
									<!-- Core Status Fields -->
									{#if typedInspection.finnsDrottning}
										<div>
											<span class="text-gray-600">Drottning:</span>
											<span
												class="ml-1 {getStatusColor(typedInspection.finnsDrottning)} capitalize"
											>
												{typedInspection.finnsDrottning}
											</span>
										</div>
									{/if}

									{#if typedInspection.nylagdaÄgg}
										<div>
											<span class="text-gray-600">Ägg:</span>
											<span class="ml-1 {getStatusColor(typedInspection.nylagdaÄgg)} capitalize">
												{typedInspection.nylagdaÄgg}
											</span>
										</div>
									{/if}

									{#if typedInspection.mängdBin}
										<div>
											<span class="text-gray-600">Population:</span>
											<span class="ml-1 {getHealthColor(typedInspection.mängdBin)}">
												{typedInspection.mängdBin}/5
											</span>
										</div>
									{/if}

									{#if typedInspection.binasHälsa}
										<div>
											<span class="text-gray-600">Hälsa:</span>
											<span class="ml-1 {getHealthColor(typedInspection.binasHälsa)}">
												{typedInspection.binasHälsa}/5
											</span>
										</div>
									{/if}

									<!-- Brood & Food -->
									{#if typedInspection.yngelstatus}
										<div>
											<span class="text-gray-600">Yngelstatus:</span>
											<span class="ml-1 {getHealthColor(typedInspection.yngelstatus)}">
												{typedInspection.yngelstatus}/5
											</span>
										</div>
									{/if}

									{#if typedInspection.foder}
										<div>
											<span class="text-gray-600">Foder:</span>
											<span class="ml-1 {getHealthColor(typedInspection.foder)}">
												{typedInspection.foder}/5
											</span>
										</div>
									{/if}

									<!-- Behavior & Risk -->
									{#if typedInspection.svärmningsrisk}
										<div>
											<span class="text-gray-600">Svärmningsrisk:</span>
											<span
												class="ml-1 {typedInspection.svärmningsrisk >= 4
													? 'text-red-600'
													: typedInspection.svärmningsrisk === 3
														? 'text-yellow-600'
														: 'text-green-600'}"
											>
												{typedInspection.svärmningsrisk}/5
											</span>
										</div>
									{/if}

									{#if typedInspection.aktivitetVidFlustret}
										<div>
											<span class="text-gray-600">Aktivitet:</span>
											<span class="ml-1 {getHealthColor(typedInspection.aktivitetVidFlustret)}">
												{typedInspection.aktivitetVidFlustret}/5
											</span>
										</div>
									{/if}

									{#if typedInspection.aggressivitet}
										<div>
											<span class="text-gray-600">Aggressivitet:</span>
											<span
												class="ml-1 {typedInspection.aggressivitet >= 4
													? 'text-red-600'
													: typedInspection.aggressivitet === 3
														? 'text-yellow-600'
														: 'text-green-600'}"
											>
												{typedInspection.aggressivitet}/5
											</span>
										</div>
									{/if}

									<!-- Health & Condition -->
									{#if typedInspection.fuktMögel}
										<div>
											<span class="text-gray-600">Fukt/Mögel:</span>
											<span
												class="ml-1 {typedInspection.fuktMögel === 'ja'
													? 'text-red-600'
													: 'text-green-600'} capitalize"
											>
												{typedInspection.fuktMögel}
											</span>
										</div>
									{/if}

									{#if typedInspection.varroastatus}
										<div>
											<span class="text-gray-600">Varroa:</span>
											<span
												class="ml-1 {typedInspection.varroastatus >= 4
													? 'text-red-600'
													: typedInspection.varroastatus === 3
														? 'text-yellow-600'
														: 'text-green-600'}"
											>
												{typedInspection.varroastatus}/5
											</span>
										</div>
									{/if}

									{#if typedInspection.kupansSkick}
										<div>
											<span class="text-gray-600">Kupans skick:</span>
											<span
												class="ml-1 {typedInspection.kupansSkick <= 2
													? 'text-red-600'
													: typedInspection.kupansSkick === 3
														? 'text-yellow-600'
														: 'text-green-600'}"
											>
												{typedInspection.kupansSkick}/5
											</span>
										</div>
									{/if}

									<!-- Honey Production -->
									{#if typedInspection.antalSkattlådar}
										<div>
											<span class="text-gray-600">Skattlådor:</span>
											<span class="ml-1 text-gray-900">
												{typedInspection.antalSkattlådar} st
											</span>
										</div>
									{/if}

									{#if typedInspection.skattlådorFulla}
										<div>
											<span class="text-gray-600">Lådor fulla:</span>
											<span
												class="ml-1 {typedInspection.skattlådorFulla === 'ja'
													? 'text-green-600'
													: 'text-gray-600'} capitalize"
											>
												{typedInspection.skattlådorFulla}
											</span>
										</div>
									{/if}

									<!-- Environmental -->
									{#if typedInspection.väder}
										<div>
											<span class="text-gray-600">Väder:</span>
											<span class="ml-1 text-gray-900">
												{typedInspection.väder}
											</span>
										</div>
									{/if}

									{#if typedInspection.växtDragförhållanden}
										<div>
											<span class="text-gray-600">Växt/Drag:</span>
											<span class="ml-1 text-gray-900 truncate">
												{typedInspection.växtDragförhållanden}
											</span>
										</div>
									{/if}
								</div>

								<!-- Planned Actions for history -->
								{#if typedInspection.planeradÅtgärd}
									<div class="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
										<span class="text-xs text-blue-600 font-medium">Planerad åtgärd:</span>
										<p class="text-sm text-blue-800 mt-1">{typedInspection.planeradÅtgärd}</p>
									</div>
								{/if}

								{#if typedInspection.notes}
									<p class="mt-2 text-sm text-gray-700">{typedInspection.notes}</p>
								{/if}

								{#if typedInspection.extractionConfidence}
									<div class="mt-2">
										<span class="text-xs text-gray-500">
											AI Säkerhet: {Math.round(typedInspection.extractionConfidence * 100)}%
										</span>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="p-4">
			<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
				<div class="text-gray-400 mb-4 text-4xl">⚠️</div>
				<h2 class="text-lg font-semibold text-gray-900 mb-2">Kupan Hittades Inte</h2>
				<p class="text-sm text-gray-600 mb-6">
					Kupan du letar efter existerar inte eller kan ha tagits bort.
				</p>
				<button
					onclick={() => goto('/hives')}
					class="bg-amber-600 text-white px-6 py-3 rounded-xl font-medium active:scale-95 transition-all duration-200"
				>
					Tillbaka till Kupor
				</button>
			</div>
		</div>
	{/if}
</div>
