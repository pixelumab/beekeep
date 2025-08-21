<script lang="ts">
	import StatusField from './StatusField.svelte';
	import type { HiveInspection } from '$lib/types.js';
	import {
		getInspectionFields,
		groupInspectionFields,
		FIELD_GROUPS
	} from '$lib/utils/inspectionUtils.js';

	interface Props {
		inspection: HiveInspection;
		compact?: boolean;
		showGroupHeaders?: boolean;
		coreOnly?: boolean;
		columns?: 2 | 3 | 4;
	}

	let {
		inspection,
		compact = false,
		showGroupHeaders = false,
		coreOnly = false,
		columns = 3
	}: Props = $props();

	let fields = $derived.by(() => {
		const allFields = getInspectionFields(inspection);
		if (coreOnly) {
			return allFields.filter((field) => field.config.group === 'core');
		}
		return allFields;
	});

	let groupedFields = $derived.by(() => {
		if (!showGroupHeaders) return null;

		const grouped = groupInspectionFields(inspection);
		if (coreOnly) {
			return { core: grouped.core || [] };
		}
		return grouped;
	});

	let gridClass = $derived(() => {
		const base = 'grid gap-3';
		if (compact) {
			return `${base} grid-cols-2 sm:grid-cols-3`;
		}
		return `${base} grid-cols-2 sm:grid-cols-${columns} lg:grid-cols-${Math.min(columns + 1, 4)}`;
	});
</script>

{#if fields.length > 0}
	{#if showGroupHeaders && groupedFields}
		<!-- Grouped display with headers -->
		{#each Object.entries(groupedFields) as [groupKey, groupFields]}
			{#if groupFields.length > 0}
				<div class="space-y-3">
					<h4 class="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">
						{FIELD_GROUPS[groupKey as keyof typeof FIELD_GROUPS]}
					</h4>
					<div class={gridClass}>
						{#each groupFields as field (field.key)}
							<StatusField
								label={field.config.label}
								value={field.value}
								type={field.config.type}
								icon={field.config.icon}
								{compact}
								showDots={!compact}
							/>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	{:else}
		<!-- Simple grid without grouping -->
		<div class={gridClass}>
			{#each fields as field (field.key)}
				<StatusField
					label={field.config.label}
					value={field.value}
					type={field.config.type}
					icon={field.config.icon}
					{compact}
					showDots={!compact}
				/>
			{/each}
		</div>
	{/if}
{/if}
