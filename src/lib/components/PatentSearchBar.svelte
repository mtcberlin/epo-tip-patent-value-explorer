<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { parsePatentNumber, toDisplay, toUrlParams } from '$lib/utils/patent-number-parser';

	import { Search } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		autoFocus?: boolean;
		initialValue?: string;
		compact?: boolean;
	}

	let { autoFocus = false, initialValue = '', compact = false }: Props = $props();

	let inputValue = $state('');
	let inputEl: HTMLInputElement | undefined = $state();

	const parsed = $derived(parsePatentNumber(inputValue));

	type StatusKind = 'idle' | 'valid' | 'invalid';
	const status: StatusKind = $derived.by(() => {
		if (inputValue.trim().length === 0) return 'idle';
		return parsed ? 'valid' : 'invalid';
	});

	const STATUS_COLORS: Record<StatusKind, string> = {
		idle: '#D4D4D4',
		valid: '#16A34A',
		invalid: '#DC2626'
	};

	// Sync initialValue prop into state on mount
	let initialized = false;
	$effect(() => {
		if (!initialized && initialValue) {
			inputValue = initialValue;
			initialized = true;
		}
	});

	$effect(() => {
		if (autoFocus && inputEl) {
			inputEl.focus();
		}
	});

	function handleSubmit() {
		if (!parsed) return;
		const params = toUrlParams(parsed);
		goto(`${base}/patent/${params.auth}/${params.number}`);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSubmit();
		}
		if (e.key === 'Escape') {
			inputValue = '';
		}
	}
</script>

<div role="search" class="flex w-full max-w-lg items-center gap-2">
	<div class="relative flex-1">
		<input
			bind:this={inputEl}
			bind:value={inputValue}
			onkeydown={handleKeydown}
			type="text"
			inputmode="text"
			autocomplete="off"
			spellcheck="false"
			aria-label="Patent publication number"
			placeholder="EP1234567B1 or US6285999"
			class="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-ring h-11 w-full border px-3 pr-10 font-mono focus-visible:outline-2 focus-visible:outline-offset-2"
		/>
		<!-- Status pixel -->
		<span
			class="absolute top-1/2 right-3 block size-2 -translate-y-1/2"
			style="background-color: {STATUS_COLORS[status]}"
			aria-hidden="true"
		></span>
	</div>

	<Button
		variant="default"
		class="h-11 gap-2 px-4"
		disabled={status !== 'valid'}
		onclick={handleSubmit}
	>
		<Search class="size-4" aria-hidden="true" />
		Search
	</Button>
</div>

{#if !compact}
	{#if status === 'valid' && parsed}
		<p class="text-muted-foreground mt-1 font-mono text-sm">
			{toDisplay(parsed)}
		</p>
	{:else if status === 'invalid'}
		<p class="text-destructive mt-1 text-sm">Try: EP1234567B1 or US6285999</p>
	{/if}
{/if}
