<script lang="ts">
	interface Props {
		type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number';
		value?: string;
		placeholder?: string;
		label?: string;
		error?: string;
		disabled?: boolean;
		required?: boolean;
		id?: string;
		fullWidth?: boolean;
		oninput?: (event: Event) => void;
	}

	let {
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		label,
		error,
		disabled = false,
		required = false,
		id,
		fullWidth = true,
		oninput
	}: Props = $props();

	const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

	const baseClasses =
		'px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base';
	const errorClasses = error
		? 'border-red-300 focus:ring-red-500 focus:border-red-500'
		: 'border-gray-200';
	const disabledClasses = disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white';
</script>

<div class={fullWidth ? 'w-full' : ''}>
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-gray-700 mb-2">
			{label}
			{#if required}<span class="text-red-500">*</span>{/if}
		</label>
	{/if}

	<input
		{type}
		id={inputId}
		bind:value
		{placeholder}
		{disabled}
		{required}
		{oninput}
		class="{baseClasses} {errorClasses} {disabledClasses} {fullWidth ? 'w-full' : ''}"
	/>

	{#if error}
		<p class="mt-2 text-sm text-red-600">{error}</p>
	{/if}
</div>
