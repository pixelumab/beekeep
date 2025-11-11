<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';

	let { children } = $props();

	interface NavigationItem {
		path: string;
		label: string;
		icon: string;
	}

	const navigation: NavigationItem[] = [
		{ path: '/', label: 'Översikt', icon: '📊' },
		{ path: '/hives', label: 'Kupor', icon: '🏠' },
		{ path: '/sessions', label: 'Sessioner', icon: '📞' }
	];

	let currentPath = $derived($page.url.pathname);

	function isActive(path: string): boolean {
		if (path === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(path);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
	<title>BeeKeep - Hive Management</title>
	<script src="https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js" async></script>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<!-- Top Navigation Bar -->
	<header class="bg-white border-b sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-16">
				<!-- Logo -->
				<div class="flex items-center gap-3">
					<div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
						<span class="text-lg">🐝</span>
					</div>
					<span class="text-lg font-semibold text-gray-900 hidden sm:inline">BeeKeep</span>
				</div>

				<!-- Desktop Navigation -->
				<nav class="hidden md:flex items-center gap-1">
					{#each navigation as item}
						<a
							href={item.path}
							class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {isActive(item.path)
								? 'bg-amber-50 text-amber-700'
								: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
						>
							<span class="mr-2">{item.icon}</span>
							{item.label}
						</a>
					{/each}
				</nav>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 overflow-y-auto pb-16 md:pb-0">
		{@render children?.()}
	</main>

	<!-- Mobile Bottom Navigation -->
	<nav
		class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-20"
		style="padding-bottom: env(safe-area-inset-bottom);"
	>
		<div class="grid grid-cols-3 h-16">
			{#each navigation as item}
				<a
					href={item.path}
					class="flex flex-col items-center justify-center gap-1 transition-colors {isActive(
						item.path
					)
						? 'text-amber-600'
						: 'text-gray-600'}"
				>
					<span class="text-xl">{item.icon}</span>
					<span class="text-xs font-medium">{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>

	<!-- VAPI Widget - persists across all pages -->
	<!-- Custom elements upgrade automatically when the script loads -->
	{#if browser}
		<vapi-widget
			public-key="b5874460-bc03-4a8c-ba50-3a911545c804"
			assistant-id="902f8839-4539-46cb-9a93-f581aa17a5d4"
			mode="voice"
			theme="dark"
			base-bg-color="#000000"
			accent-color="#F59E0B"
			cta-button-color="#F59E0B"
			cta-button-text-color="#000000"
			border-radius="large"
			size="full"
			position="bottom-right"
			title="TALK WITH AI"
			start-button-text="Start"
			end-button-text="End Call"
			chat-first-message="Hey, How can I help you today?"
			chat-placeholder="Type your message..."
			voice-show-transcript="false"
			consent-required="false"
		></vapi-widget>
	{/if}
</div>
