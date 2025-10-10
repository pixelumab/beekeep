<script lang="ts">
	import { browser } from '$app/environment';
	// VAPI script is loaded in +layout.svelte for persistence across navigation
</script>

<div class="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
	<!-- Header section -->
	<div class="px-4 pt-8 pb-6 text-center">
		<div class="text-5xl mb-3 text-amber-600">🐝</div>
		<h1 class="text-2xl font-bold text-gray-900 mb-1">BeeKeep</h1>
		<p class="text-sm text-gray-600">AI-driven kupinspektion</p>
	</div>

	<!-- Instructions Card -->
	<div class="px-4 pb-6">
		<div class="bg-white rounded-2xl shadow-sm border border-amber-200 p-6 max-w-md mx-auto">
			<div class="text-center mb-4">
				<div
					class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3"
				>
					<div class="text-2xl">🎤</div>
				</div>
				<h2 class="text-xl font-bold text-gray-900 mb-2">Starta Inspektion</h2>
				<p class="text-gray-600 text-sm leading-relaxed">
					Klicka på <span class="font-semibold text-teal-600">"TALK WITH AI"</span> knappen längst ner
					till höger för att börja spela in din kupinspektion med röst-AI-assistenten.
				</p>
			</div>

			<!-- Visual pointer/arrow animation -->
			<div class="flex justify-end items-center mt-4 text-teal-600">
				<svg class="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 13l-5 5m0 0l-5-5m5 5V6"
					></path>
				</svg>
				<svg
					class="w-6 h-6 animate-bounce delay-75"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
					></path>
				</svg>
			</div>
		</div>
	</div>

	<!-- Quick Links -->
	<div class="px-4 pb-4">
		<div class="grid grid-cols-2 gap-3 max-w-md mx-auto">
			<a
				href="/hives"
				class="bg-white rounded-2xl border p-4 text-center active:scale-95 transition-all duration-200 hover:shadow-sm"
			>
				<div class="text-2xl mb-2">▢</div>
				<div class="text-sm font-medium text-gray-900">Hantera Kupor</div>
			</a>
			<a
				href="/sessions"
				class="bg-white rounded-2xl border p-4 text-center active:scale-95 transition-all duration-200 hover:shadow-sm"
			>
				<div class="text-2xl mb-2">≡</div>
				<div class="text-sm font-medium text-gray-900">Visa Sessioner</div>
			</a>
		</div>
	</div>

	<!-- VAPI Widget Container -->
	<div class="px-4 pb-4">
		{#if browser}
			<!-- svelte-ignore a11y_unknown_role -->
			<vapi-widget
				public-key="b5874460-bc03-4a8c-ba50-3a911545c804"
				assistant-id="902f8839-4539-46cb-9a93-f581aa17a5d4"
				mode="voice"
				theme="dark"
				base-bg-color="#000000"
				accent-color="#14B8A6"
				cta-button-color="#000000"
				cta-button-text-color="#ffffff"
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
</div>
