<script lang="ts">
	interface Props {
		open?: boolean;
		onClose?: () => void;
		title?: string;
		children: any;
	}

	let { open = false, onClose, title, children }: Props = $props();

	function handleBackdropClick() {
		onClose?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			onClose?.();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && onClose?.()}
		role="dialog"
		aria-modal="true"
		aria-labelledby={title ? 'modal-title' : undefined}
		tabindex="-1"
	>
		<!-- Modal Content -->
		<div
			class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			{#if title || onClose}
				<!-- Header -->
				<div class="flex items-center justify-between p-6 border-b border-gray-200">
					{#if title}
						<h2 id="modal-title" class="text-xl font-bold text-gray-900">{title}</h2>
					{/if}
					{#if onClose}
						<button
							onclick={onClose}
							class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
							aria-label="Close modal"
						>
							✕
						</button>
					{/if}
				</div>
			{/if}

			<!-- Content -->
			<div class="p-6">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
