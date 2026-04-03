<script lang="ts">
	import { base } from '$app/paths';
	import PatentSearchBar from '$lib/components/PatentSearchBar.svelte';
	import ReferencePatentCard from '$lib/components/ReferencePatentCard.svelte';
	import { getAllReferencePatents } from './homepage-data.remote';

	const referencePatents = $derived(getAllReferencePatents());

	const fallbackPatents = [
		{ auth: 'US', number: '6285999', label: 'US 6285999', title: 'PageRank — Google Search' },
		{ auth: 'EP', number: '2771468', label: 'EP 2771468', title: 'CRISPR-Cas9 Gene Editing' },
		{ auth: 'US', number: '7041468', label: 'US 7041468', title: 'Blood Glucose Tracking' }
	] as const;

	const SITE_NAME = 'The Story of Patent Quality';
	const pageTitle = `${SITE_NAME} – Patent Value Explorer`;
	const pageDescription =
		'Explore patent quality indicators through interactive visual storytelling. Understand what makes patents valuable using OECD-based metrics and PATSTAT data.';
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
</svelte:head>

<!-- Hero: centered search -->
<section class="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
	<p class="text-muted-foreground text-xs font-medium tracking-widest uppercase">
		EPO CodeFest 2026
	</p>
	<h1 class="text-foreground mt-3 text-4xl font-semibold text-pretty">{SITE_NAME}</h1>
	<p class="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed text-pretty">
		8 OECD quality indicators. One radar chart. The story behind every patent.
	</p>

	<div class="mt-8 w-full max-w-lg">
		<PatentSearchBar autoFocus={true} />
	</div>
</section>

<!-- Reference Patents -->
{#await referencePatents then patents}
	{#if patents.length > 0}
		<section aria-label="Reference patents" class="mx-auto max-w-6xl px-4 pb-16">
			<h2 class="text-foreground text-lg font-semibold text-pretty">Explore Reference Patents</h2>
			<p class="text-muted-foreground mt-1 text-xs text-pretty">
				Pre-scored patents across diverse technology fields
			</p>
			<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each patents as patent (patent.publicationNumber)}
					<ReferencePatentCard {patent} />
				{/each}
			</div>
		</section>
	{:else}
		{@render fallbackLinks()}
	{/if}
{:catch}
	{@render fallbackLinks()}
{/await}

{#snippet fallbackLinks()}
	<section aria-label="Reference patents" class="mx-auto max-w-6xl px-4 pb-16">
		<h2 class="text-foreground text-lg font-semibold text-pretty">Explore Reference Patents</h2>
		<p class="text-muted-foreground mt-1 text-xs text-pretty">
			Pre-scored patents across diverse technology fields
		</p>
		<ul class="mt-4 space-y-2">
			{#each fallbackPatents as patent}
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
	</section>
{/snippet}

<!-- Minimal footer -->
<footer class="border-border border-t py-6 text-center">
	<p class="text-muted-foreground text-xs text-pretty">
		Data from EPO PATSTAT via BigQuery. Indicators based on the OECD Patent Quality framework.
	</p>
</footer>
