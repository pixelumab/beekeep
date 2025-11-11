<script lang="ts">
	interface Props {
		padding?: 'none' | 'sm' | 'md' | 'lg';
		shadow?: 'none' | 'sm' | 'md' | 'lg';
		rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
		border?: boolean;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		children: any;
	}

	let { padding = 'md', shadow = 'sm', rounded = 'xl', border = true, children }: Props = $props();

	const paddingClasses = {
		none: '',
		sm: 'p-3',
		md: 'p-4',
		lg: 'p-6'
	};

	const shadowClasses = {
		none: '',
		sm: 'shadow-sm',
		md: 'shadow-md',
		lg: 'shadow-lg'
	};

	const roundedClasses = {
		none: '',
		sm: 'rounded-sm',
		md: 'rounded-md',
		lg: 'rounded-lg',
		xl: 'rounded-xl'
	};

	const baseClasses = 'bg-white';
	const borderClasses = border ? 'border border-gray-100' : '';
</script>

<div
	class="{baseClasses} {paddingClasses[padding]} {shadowClasses[shadow]} {roundedClasses[
		rounded
	]} {borderClasses}"
>
	{@render children()}
</div>
