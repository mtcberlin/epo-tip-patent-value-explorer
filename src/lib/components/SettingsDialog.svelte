<script lang="ts">
	import { Eye, EyeOff } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(), onOpenChange }: Props = $props();

	let inputValue = $state('');
	let showKey = $state(false);
	let saved = $state(false);

	const looksValid = $derived(inputValue.length === 0 || inputValue.startsWith('sk-ant-'));

	// Sync input value when dialog opens
	$effect(() => {
		if (open) {
			inputValue = settings.apiKey;
			showKey = false;
			saved = false;
		}
	});

	function handleSave() {
		if (!inputValue.trim()) return;
		settings.saveApiKey(inputValue.trim());
		saved = true;
		setTimeout(() => {
			open = false;
			onOpenChange?.(false);
		}, 600);
	}

	function handleClear() {
		settings.clearApiKey();
		inputValue = '';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && inputValue.trim() && looksValid) {
			event.preventDefault();
			handleSave();
		}
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Settings</Dialog.Title>
			<Dialog.Description>Configure your API keys for AI-powered features.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<label for="api-key-input" class="text-foreground text-sm font-medium">
					Anthropic API Key
				</label>
				<div class="relative">
					<input
						id="api-key-input"
						bind:value={inputValue}
						onkeydown={handleKeydown}
						type={showKey ? 'text' : 'password'}
						placeholder="sk-ant-..."
						autocomplete="off"
						spellcheck="false"
						aria-describedby="api-key-help{looksValid ? '' : ' api-key-error'}"
						aria-invalid={!looksValid}
						class="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-ring h-11 w-full border px-3 pr-10 font-mono focus-visible:outline-2 focus-visible:outline-offset-2"
					/>
					<button
						type="button"
						onclick={() => (showKey = !showKey)}
						class="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
						aria-label={showKey ? 'Hide API key' : 'Show API key'}
					>
						{#if showKey}
							<EyeOff class="size-4" />
						{:else}
							<Eye class="size-4" />
						{/if}
					</button>
				</div>
				{#if !looksValid}
					<p id="api-key-error" class="text-destructive text-xs">
						Anthropic API keys typically start with "sk-ant-"
					</p>
				{/if}
				<p id="api-key-help" class="text-muted-foreground text-xs">
					Required for AI narrative generation. Your key is stored locally in your browser and sent
					only to Anthropic's API.
				</p>
			</div>
		</div>

		<Dialog.Footer class="flex gap-2">
			{#if settings.hasApiKey}
				<Button variant="ghost" onclick={handleClear} class="text-destructive">Clear Key</Button>
			{/if}
			<div class="flex-1"></div>
			<Button
				variant="default"
				onclick={handleSave}
				disabled={!inputValue.trim() || !looksValid || saved}
			>
				{#if saved}
					Saved
				{:else}
					Save
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
