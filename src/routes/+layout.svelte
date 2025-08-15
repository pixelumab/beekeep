<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import type { NavigationTab } from '$lib/types.js';

	let { children } = $props();

	const navigationTabs: NavigationTab[] = [
		{ id: 'record', label: 'Record', icon: '●', path: '/' },
		{ id: 'sessions', label: 'Sessions', icon: '≡', path: '/sessions' },
		{ id: 'hives', label: 'Hives', icon: '▢', path: '/hives' }
	];

	let currentPath = $derived($page.url.pathname);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
	<title>BeeKeep - Beehive Management</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<style>
		/* Mobile-first CSS variables */
		:root {
			--safe-area-inset-top: env(safe-area-inset-top);
			--safe-area-inset-right: env(safe-area-inset-right);
			--safe-area-inset-bottom: env(safe-area-inset-bottom);
			--safe-area-inset-left: env(safe-area-inset-left);
		}

		/* Prevent zoom on input focus on iOS */
		input[type='text'],
		input[type='email'],
		input[type='tel'],
		textarea,
		select {
			font-size: 16px;
		}

		/* Mobile viewport handling */
		.app-container {
			height: 100vh;
			height: 100dvh; /* Dynamic viewport height for mobile */
			height: 100svh; /* Small viewport height for mobile */
		}

		/* Custom scrollbar for desktop */
		@media (min-width: 768px) {
			::-webkit-scrollbar {
				width: 6px;
			}
			::-webkit-scrollbar-track {
				background: #f8fafc;
			}
			::-webkit-scrollbar-thumb {
				background: #cbd5e1;
				border-radius: 3px;
			}
			::-webkit-scrollbar-thumb:hover {
				background: #94a3b8;
			}
		}

		/* Hide scrollbar on mobile */
		@media (max-width: 767px) {
			::-webkit-scrollbar {
				display: none;
			}
		}
	</style>
</svelte:head>

<!-- Mobile-first app container -->
<div class="app-container bg-white flex flex-col">
	<!-- Main content area -->
	<main class="flex-1 overflow-y-auto">
		{@render children?.()}
	</main>

	<!-- Bottom navigation - mobile optimized -->
	<nav
		class="bg-white border-t border-gray-100 px-2 py-1 flex-shrink-0"
		style="padding-bottom: calc(0.5rem + var(--safe-area-inset-bottom));"
	>
		<div class="flex">
			{#each navigationTabs as tab}
				<a
					href={tab.path}
					class="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 active:scale-95 {currentPath ===
						tab.path ||
					(tab.path === '/' && currentPath === '/session')
						? 'text-amber-600 bg-amber-50 shadow-sm'
						: 'text-gray-600 active:bg-gray-50'}"
					data-sveltekit-preload-data="hover"
				>
					<div class="text-lg font-bold mb-0.5">{tab.icon}</div>
					<div class="text-xs font-medium">{tab.label}</div>
				</a>
			{/each}
		</div>
	</nav>
</div>
