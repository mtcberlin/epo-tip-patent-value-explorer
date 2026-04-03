<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import PatentSearchBar from '$lib/components/PatentSearchBar.svelte';
	import { TriangleAlert } from '@lucide/svelte';

	const is404 = $derived(page.status === 404);
	const heading = $derived(is404 ? 'Patent not found in PATSTAT' : 'Something unexpected happened');
	const description = $derived(
		is404
			? 'The patent number you entered could not be found in the PATSTAT database. Check the format and try again.'
			: 'We encountered an issue while loading the page. Please try again or explore a reference patent.'
	);

	const referencePatents = [
		{ auth: 'US', number: '6285999', label: 'US 6285999', title: 'PageRank — Google Search' },
		{ auth: 'EP', number: '2771468', label: 'EP 2771468', title: 'CRISPR-Cas9 Gene Editing' },
		{ auth: 'US', number: '7041468', label: 'US 7041468', title: 'Blood Glucose Tracking' }
	] as const;
</script>

<svelte:head>
	<title>Error {page.status} – Patent Value Explorer</title>
</svelte:head>

<section class="mx-auto max-w-xl px-4 py-16">
	<div class="border-border bg-card border p-6" role="alert">
		<div class="flex items-start gap-3">
			<TriangleAlert class="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden="true" />
			<div>
				<h1 class="text-foreground text-lg font-semibold">{heading}</h1>
				<p class="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
			</div>
		</div>

		{#if is404}
			<div class="text-muted-foreground mt-4 text-sm">
				<p class="text-foreground font-medium">Supported formats:</p>
				<ul class="mt-1 space-y-0.5">
					<li><span class="font-mono">EP1234567B1</span> — European</li>
					<li><span class="font-mono">US6285999</span> — United States</li>
					<li><span class="font-mono">WO2020001234A1</span> — PCT</li>
				</ul>
			</div>
		{/if}

		<div class="mt-4">
			<a href="{base}/" class="text-foreground text-sm font-medium underline underline-offset-4">
				Back to home
			</a>
		</div>
	</div>

	<div class="mt-8">
		<p class="text-foreground mb-3 text-sm font-medium">Search for a patent:</p>
		<PatentSearchBar autoFocus={true} />
	</div>

	<div class="mt-8">
		<p class="text-foreground mb-3 text-sm font-medium">Or explore a reference patent:</p>
		<ul class="space-y-2">
			{#each referencePatents as patent}
				<li>
					<a
						href="{base}/patent/{patent.auth}/{patent.number}"
						class="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2 transition-colors"
					>
						<span class="font-mono">{patent.label}</span> — {patent.title}
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>
