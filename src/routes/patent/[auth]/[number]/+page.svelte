<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { parsePatentNumber, toDisplay } from '$lib/utils/patent-number-parser';
	import type { PatentProfile, IndicatorResult, NormalizedScore } from '$lib/scoring/types';
	import { AXIS_ORDER } from '$lib/config/chart-config';
	import { COMPOSITE_INDICATORS } from '$lib/scoring/types';
	import PatentProfileCard from '$lib/components/PatentProfileCard.svelte';
	import CompositeScoreDisplay from '$lib/components/CompositeScoreDisplay.svelte';
	import RadarChartContainer from '$lib/components/RadarChartContainer.svelte';
	import IndicatorCard from '$lib/components/IndicatorCard.svelte';
	import { getPatent } from './data.remote';
	import { calculateGenerality } from './generality.remote';
	import LoadingSection from '$lib/components/LoadingSection.svelte';
	import AINarrativeBlock from '$lib/components/AINarrativeBlock.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Sparkles, Quote } from '@lucide/svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const auth = $derived(page.params.auth ?? '');
	const number = $derived(page.params.number ?? '');
	const parsed = $derived(parsePatentNumber(`${auth}${number}`));
	const displayNumber = $derived(parsed ? toDisplay(parsed) : `${auth} ${number}`);

	const result = $derived(getPatent({ auth, number, apiKey: settings.apiKey || undefined }));

	/** Generality on-demand state */
	let generalityLoading = $state(false);
	let generalityError = $state<string | null>(null);
	let generalityRaw = $state<IndicatorResult | null>(null);
	let generalityNormalized = $state<NormalizedScore | null>(null);

	/** Store resolved patent data in $state for reactive merging */
	let resolvedData = $state<PatentProfile | null>(null);

	// Capture resolved data and reset generality state when patent changes
	$effect(() => {
		const promise = result;
		// Reset on patent change
		resolvedData = null;
		generalityRaw = null;
		generalityNormalized = null;
		generalityError = null;

		promise.then((res) => {
			if (res.success) {
				resolvedData = res.data;
			}
		});
	});

	async function handleCalculateGenerality() {
		if (!resolvedData) return;
		generalityLoading = true;
		generalityError = null;
		try {
			const filingYear = parseInt(resolvedData.filingDate?.substring(0, 4) ?? '0', 10);
			const response = await calculateGenerality({
				applnId: resolvedData.applnId,
				wipoField: resolvedData.wipoFieldNumber,
				filingYear,
				auth,
				number
			});
			generalityRaw = response.raw;
			generalityNormalized = response.normalized;
		} catch (err) {
			generalityError = err instanceof Error ? err.message : 'Calculation failed';
		} finally {
			generalityLoading = false;
		}
	}

	/** Reactively merged indicators & scores (re-evaluates when generality changes) */
	const merged = $derived.by(() => {
		if (!resolvedData) return null;
		const rawIndicators = resolvedData.rawIndicators;
		const normalizedScores = resolvedData.normalizedScores ?? [];

		if (!generalityRaw) {
			return { indicators: rawIndicators, scores: normalizedScores };
		}

		const hasRaw = rawIndicators.some((i) => i.indicator === 'generality_index');
		const indicators = hasRaw
			? rawIndicators.map((ind) => (ind.indicator === 'generality_index' ? generalityRaw! : ind))
			: [...rawIndicators, generalityRaw!];

		const hasScore = normalizedScores.some((s) => s.indicator === 'generality_index');
		const scores = generalityNormalized
			? hasScore
				? normalizedScores.map((s) =>
						s.indicator === 'generality_index' ? generalityNormalized! : s
					)
				: [...normalizedScores, generalityNormalized!]
			: normalizedScores;

		return { indicators, scores };
	});

	/**
	 * Citation-rank tier for the title badge.
	 *
	 * - 'breakthrough': forward-citation percentile >= 99 (OECD §3.12)
	 * - 'highly-cited': forward-citation percentile >= 90
	 * - 'none':         neither — no badge shown
	 *
	 * Returns 'unknown' when the percentile is missing (e.g. cohort stats
	 * not yet computed for this WIPO field/year).
	 */
	const citationTier = $derived.by((): 'breakthrough' | 'highly-cited' | 'none' | 'unknown' => {
		const percentile = merged?.scores.find((s) => s.indicator === 'forward_citations')?.percentile;
		if (percentile == null) return 'unknown';
		if (percentile >= 99) return 'breakthrough';
		if (percentile >= 90) return 'highly-cited';
		return 'none';
	});

	/** Ordered indicator pairs for the card grid */
	const orderedIndicators = $derived.by(() => {
		if (!merged) return [];
		const rawMap = new Map(merged.indicators.map((r) => [r.indicator, r]));
		const normMap = new Map(merged.scores.map((s) => [s.indicator, s]));

		return AXIS_ORDER.map((name) => ({
			raw: rawMap.get(name) ?? {
				indicator: name,
				value: null,
				available: false,
				dataSource: '',
				error: null
			},
			normalized: normMap.get(name) ?? {
				indicator: name,
				raw: null,
				normalized: null,
				percentile: null,
				available: false,
				cohortSize: null,
				smallCohort: false
			}
		}));
	});

	/** Cohort context for display components */
	const cohortContext = $derived.by(() => {
		if (!resolvedData || !merged) return null;
		if (resolvedData.wipoFieldNumber <= 0 || !merged.scores.length) return null;
		return {
			size: merged.scores.find((s) => s.cohortSize)?.cohortSize ?? 0,
			fieldName: resolvedData.wipoFieldName,
			filingYear: parseInt(resolvedData.filingDate?.substring(0, 4) ?? '0', 10)
		};
	});

	/** True once we've attempted calculation (success or not) — hides the button */
	const generalityAttempted = $derived(generalityRaw !== null);
</script>

<svelte:head>
	<title>Patent {displayNumber} – Patent Value Explorer</title>
	<meta name="description" content="Quality assessment for patent {displayNumber}" />
</svelte:head>

{#if !parsed}
	<section class="py-16">
		<h1 class="text-foreground font-mono text-4xl font-semibold">{auth}{number}</h1>
		<div class="border-destructive bg-destructive/5 mt-6 border p-6">
			<p class="text-destructive font-medium">Invalid patent number format</p>
			<p class="text-muted-foreground mt-2 text-sm">Please check the URL. Supported formats:</p>
			<ul class="text-muted-foreground mt-2 list-inside list-disc text-sm">
				<li><span class="font-mono">EP1000000B1</span></li>
				<li><span class="font-mono">US6285999</span></li>
				<li><span class="font-mono">WO2020001234</span></li>
			</ul>
			<a href="{base}/" class="text-foreground mt-4 inline-block text-sm font-medium underline">
				Back to search
			</a>
		</div>
	</section>
{:else}
	{#await result}
		<!-- Loading state with content-matching skeletons -->
		<section class="py-16">
			<p class="text-muted-foreground text-sm font-medium tracking-wider uppercase">
				Patent Profile
			</p>
			<h1 class="text-foreground mt-2 font-mono text-4xl font-semibold">{displayNumber}</h1>

			<div class="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
				<div class="space-y-6">
					<Card.Root class="border-border border">
						<Card.Header><Card.Title>Quality Radar</Card.Title></Card.Header>
						<Card.Content>
							<LoadingSection
								isLoading={true}
								loadingLabel="Querying PATSTAT..."
								skeletonType="radar-chart"
							/>
						</Card.Content>
					</Card.Root>

					<div>
						<h2 class="text-foreground mb-4 text-lg font-semibold">Quality Indicators</h2>
						<div class="grid gap-4 sm:grid-cols-2">
							{#each Array(8) as _, i (i)}
								<Card.Root class="border-border overflow-hidden border">
									<Card.Content class="p-4">
										<LoadingSection
											isLoading={true}
											loadingLabel="Calculating indicators..."
											skeletonType="indicator-card"
										/>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					</div>
				</div>

				<aside class="space-y-6">
					<Card.Root class="border-border border">
						<Card.Header><Card.Title>Composite Quality Score</Card.Title></Card.Header>
						<Card.Content>
							<LoadingSection
								isLoading={true}
								loadingLabel="Normalizing scores..."
								skeletonType="composite-score"
							/>
						</Card.Content>
					</Card.Root>

					<Card.Root class="border-border border">
						<Card.Header><Card.Title>Patent Profile</Card.Title></Card.Header>
						<Card.Content>
							<LoadingSection
								isLoading={true}
								loadingLabel="Querying PATSTAT..."
								skeletonType="patent-profile"
							/>
						</Card.Content>
					</Card.Root>
				</aside>
			</div>
		</section>
	{:then data}
		{#if data.success}
			{#if merged}
				<section class="py-16">
					<p class="text-muted-foreground text-sm font-medium tracking-wider uppercase">
						Patent Profile
					</p>
					<div class="mt-2 flex flex-wrap items-center gap-3">
						<h1 class="text-foreground font-mono text-4xl font-semibold">{displayNumber}</h1>
						{#if citationTier === 'breakthrough'}
							<Badge
								variant="default"
								class="gap-1 bg-amber-500 text-amber-50 hover:bg-amber-500"
								title="Forward citations in top 1% of this WIPO field and filing-year cohort (OECD §3.12 Breakthrough Inventions)"
							>
								<Sparkles class="h-3.5 w-3.5" aria-hidden="true" />
								Breakthrough - Top 1%
							</Badge>
						{:else if citationTier === 'highly-cited'}
							<Badge
								variant="default"
								class="gap-1 bg-[#082453] text-white hover:bg-[#082453]"
								title="Forward citations in top 10% of this WIPO field and filing-year cohort"
							>
								<Quote class="h-3.5 w-3.5" aria-hidden="true" />
								Highly Cited - Top 10%
							</Badge>
						{/if}
					</div>

					<div class="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
						<!-- Main content area -->
						<div class="space-y-6">
							<!-- Radar chart -->
							<Card.Root class="border-border border">
								<Card.Header><Card.Title>Quality Radar</Card.Title></Card.Header>
								<Card.Content>
									<RadarChartContainer scores={merged.scores} {cohortContext} />
								</Card.Content>
							</Card.Root>

							<!-- Indicator cards grid -->
							<div>
								<h2 class="text-foreground mb-4 text-lg font-semibold">Quality Indicators</h2>
								<div
									class="grid gap-4 sm:grid-cols-2"
									role="list"
									aria-label="Patent quality indicators"
								>
									{#each orderedIndicators as { raw, normalized } (raw.indicator)}
										<div role="listitem">
											<IndicatorCard
												rawIndicator={raw}
												normalizedScore={normalized}
												{cohortContext}
												onCalculateGenerality={raw.indicator === 'generality_index' &&
												!normalized.available &&
												!generalityAttempted
													? () => handleCalculateGenerality()
													: undefined}
												{generalityLoading}
												generalityError={generalityError ?? (generalityRaw?.error || null)}
											/>
										</div>
									{/each}
								</div>
							</div>

							<!-- AI Narrative -->
							<AINarrativeBlock
								narrative={data.data.narrative}
								narrativeError={data.data.narrativeError}
								onOpenSettings={() => settings.openDialog()}
							/>
						</div>

						<!-- Sidebar -->
						<aside class="space-y-6">
							<CompositeScoreDisplay
								compositeScore={data.data.compositeScore}
								indicatorCount={merged.indicators.filter(
									(i) =>
										COMPOSITE_INDICATORS.includes(i.indicator) && i.available
								).length}
								totalIndicators={COMPOSITE_INDICATORS.length}
								{cohortContext}
								indicators={merged.indicators
									.filter((i) => COMPOSITE_INDICATORS.includes(i.indicator))
									.map((i) => ({
										name: i.indicator,
										available: i.available
									}))}
								pmiData={data.data.pmiData}
								wipoFieldName={data.data.wipoFieldName}
							/>
							<PatentProfileCard patent={data.data} {cohortContext} />
						</aside>
					</div>
				</section>
			{/if}
		{:else}
			<section class="py-16">
				<p class="text-muted-foreground text-sm font-medium tracking-wider uppercase">
					Patent Profile
				</p>
				<h1 class="text-foreground mt-2 font-mono text-4xl font-semibold">{displayNumber}</h1>

				<div class="border-border bg-card mt-6 border p-6" role="alert">
					{#if data.error.type === 'not_found'}
						<p class="text-foreground font-semibold">Patent not found in PATSTAT</p>
						<p class="text-muted-foreground mt-2 text-sm">
							The patent <span class="font-mono">{displayNumber}</span> was not found in the PATSTAT database.
							This may mean the patent hasn't been published yet or the number is incorrect.
						</p>
						<div class="text-muted-foreground mt-3 text-sm">
							<p class="text-foreground font-medium">Supported formats:</p>
							<ul class="mt-1 space-y-0.5">
								<li><span class="font-mono">EP1234567B1</span> — European</li>
								<li><span class="font-mono">US6285999</span> — United States</li>
							</ul>
						</div>
					{:else if data.error.type === 'timeout'}
						<p class="text-foreground font-semibold">The query is taking longer than expected</p>
						<p class="text-muted-foreground mt-2 text-sm">
							BigQuery queries sometimes take longer during peak hours. You can retry or explore a
							reference patent.
						</p>
					{:else}
						<p class="text-foreground font-semibold">Unable to load patent data</p>
						<p class="text-muted-foreground mt-2 text-sm">
							An unexpected error occurred. Please try again or explore a reference patent.
						</p>
					{/if}

					<div class="mt-4 flex items-center gap-4">
						<a
							href="{base}/"
							class="text-foreground text-sm font-medium underline underline-offset-4"
						>
							Back to search
						</a>
						<a
							href="{base}/patent/EP/2771468"
							class="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2"
						>
							Explore: EP 2771468
						</a>
					</div>
				</div>
			</section>
		{/if}
	{:catch}
		<section class="py-16">
			<p class="text-muted-foreground text-sm font-medium tracking-wider uppercase">
				Patent Profile
			</p>
			<h1 class="text-foreground mt-2 font-mono text-4xl font-semibold">{displayNumber}</h1>

			<div class="border-border bg-card mt-6 border p-6" role="alert">
				<p class="text-foreground font-semibold">Something unexpected happened</p>
				<p class="text-muted-foreground mt-2 text-sm">
					We encountered an issue while loading this patent. Try a different patent or explore a
					reference patent.
				</p>
				<div class="mt-4 flex items-center gap-4">
					<a href="{base}/" class="text-foreground text-sm font-medium underline underline-offset-4"
						>Back to search</a
					>
					<a
						href="{base}/patent/EP/2771468"
						class="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2"
					>
						Explore: EP 2771468
					</a>
				</div>
			</div>
		</section>
	{/await}
{/if}
