<script lang="ts">
	import { getFieldColor, getStatusBadgeClass } from '$lib/utils/statusColors.js';

	interface Props {
		label: string;
		value?: string | number | 'ja' | 'nej';
		type?: 'boolean' | 'scale' | 'text';
		icon?: string;
		maxScale?: number;
		compact?: boolean;
		showDots?: boolean;
		suffix?: string;
	}

	let {
		label,
		value,
		type = 'text',
		icon,
		maxScale = 5,
		compact = false,
		showDots = true,
		suffix = ''
	}: Props = $props();

	let displayValue = $derived(() => {
		if (value === undefined || value === null) return null;

		if (type === 'boolean') {
			return String(value);
		}
		if (type === 'scale') {
			return `${value}/${maxScale}`;
		}
		return String(value) + suffix;
	});

	let colorClass = $derived(() => getFieldColor(label, value, type));
	let badgeClass = $derived(() =>
		type === 'boolean' ? getStatusBadgeClass(value as 'ja' | 'nej') : ''
	);
</script>

{#if value !== undefined && value !== null && value !== ''}
	{#if compact}
		<!-- Compact version for lists -->
		<div class="flex items-center gap-1">
			{#if icon}
				<span class="text-gray-600 text-sm">{icon}</span>
			{/if}
			<span class="text-gray-600 text-sm">{label}:</span>
			<span class="ml-1 {colorClass} font-medium text-sm capitalize">
				{displayValue}
			</span>
		</div>
	{:else}
		<!-- Full version for overviews -->
		<div class="flex items-center gap-2">
			{#if icon}
				<span class="text-lg">{icon}</span>
			{/if}
			<div>
				<div class="text-xs text-gray-600">{label}</div>
				{#if type === 'scale' && showDots && typeof value === 'number'}
					<div class="flex items-center gap-1">
						<span class="text-sm font-medium {colorClass}">
							{displayValue}
						</span>
						<div class="flex gap-0.5">
							{#each Array(maxScale) as _, i}
								<div
									class="w-1.5 h-1.5 rounded-full {i < value
										? 'bg-current'
										: 'bg-gray-200'} {colorClass}"
								></div>
							{/each}
						</div>
					</div>
				{:else if type === 'boolean'}
					<span
						class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {badgeClass} capitalize"
					>
						{displayValue}
					</span>
				{:else}
					<span class="text-sm font-medium {colorClass}">
						{displayValue}
					</span>
				{/if}
			</div>
		</div>
	{/if}
{/if}
