<script lang="ts">
	type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
	type ButtonSize = 'sm' | 'md' | 'lg';

	interface Props {
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		loading?: boolean;
		fullWidth?: boolean;
		onclick?: () => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		children: any;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		fullWidth = false,
		onclick,
		children
	}: Props = $props();

	const variants = {
		primary: 'bg-amber-600 text-white hover:bg-amber-700 shadow-md',
		secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 shadow-sm',
		danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md',
		success: 'bg-green-600 text-white hover:bg-green-700 shadow-md',
		ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 border border-gray-300'
	};

	const sizes = {
		sm: 'px-3 py-2 text-sm',
		md: 'px-4 py-3 text-base',
		lg: 'px-6 py-4 text-lg'
	};

	const baseClasses =
		'font-medium rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 min-h-11 touch-manipulation';
</script>

<button
	{onclick}
	{disabled}
	class="{baseClasses} {variants[variant]} {sizes[size]} {fullWidth ? 'w-full' : ''} {disabled ||
	loading
		? 'opacity-50 cursor-not-allowed'
		: 'cursor-pointer'}"
>
	{#if loading}
		<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
	{/if}
	{@render children()}
</button>
