<script lang="ts">
	import type { IndicatorResult, NormalizedScore } from '$lib/scoring/types';
	import { STORY_LABELS, TECHNICAL_NAMES, INDICATOR_PROVENANCE } from '$lib/scoring/types';
	import ProvenanceBadge from './ProvenanceBadge.svelte';
	import { getDimensionForIndicator } from '$lib/config/chart-config';
	import { ordinalSuffix, formatRawValue, percentileInterpretation } from '$lib/utils/format';
	import { METHODOLOGY_CONTENT } from '$lib/config/methodology-content';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Button } from '$lib/components/ui/button';
	import { ChevronDown } from '@lucide/svelte';
	import IndicatorMethodology from './IndicatorMethodology.svelte';

	interface CohortContext {
		size: number;
		fieldName: string;
		filingYear: number;
	}

	interface Props {
		rawIndicator: IndicatorResult;
		normalizedScore: NormalizedScore;
		cohortContext?: CohortContext | null;
		isDark?: boolean;
		onCalculateGenerality?: () => void;
		generalityLoading?: boolean;
		generalityError?: string | null;
	}

	let {
		rawIndicator,
		normalizedScore,
		cohortContext = null,
		isDark = false,
		onCalculateGenerality,
		generalityLoading = false,
		generalityError = null
	}: Props = $props();

	let isOpen = $state(false);

	const dim = $derived(getDimensionForIndicator(rawIndicator.indicator));
	const color = $derived(isDark ? dim.darkColor : dim.color);
	const isAvailable = $derived(normalizedScore.normalized !== null);
	const isGenerality = $derived(rawIndicator.indicator === 'generality_index');
	const showCalculateButton = $derived(isGenerality && !isAvailable && onCalculateGenerality);

	const rawDisplay = $derived(formatRawValue(rawIndicator.indicator, normalizedScore.raw));
	const interpretation = $derived(
		normalizedScore.percentile !== null
			? percentileInterpretation(normalizedScore.percentile, rawIndicator.indicator)
			: null
	);
	const methodologyContent = $derived(METHODOLOGY_CONTENT[rawIndicator.indicator]);
	const contentId = $derived(`methodology-${rawIndicator.indicator}`);

	const rangeDisplay = $derived(methodologyContent.range ?? null);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			isOpen = false;
			event.stopPropagation();
		}
	}
</script>

<Card.Root class="border-border overflow-hidden border" style="border-top: 3px solid {color}">
	<Card.Content class="p-4 pb-0">
		<h3 class="text-foreground text-sm leading-snug font-medium">
			{STORY_LABELS[rawIndicator.indicator]}
		</h3>
		<div class="mt-0.5 flex items-center gap-1.5">
			<p class="text-muted-foreground text-xs">
				{TECHNICAL_NAMES[rawIndicator.indicator]}
			</p>
			<ProvenanceBadge provenance={INDICATOR_PROVENANCE[rawIndicator.indicator]} />
		</div>

		<div class="mt-3">
			{#if isAvailable}
				{#if rawDisplay}
					<p class="text-foreground font-mono text-2xl font-semibold">
						{rawDisplay}
						{#if rangeDisplay}<span class="text-muted-foreground text-sm font-normal"
								>/ {rangeDisplay}</span
							>{/if}
					</p>
				{/if}

				{#if normalizedScore.percentile !== null}
					<div class="mt-1.5 flex items-center gap-2">
						<div
							class="bg-muted h-1.5 flex-1 overflow-hidden rounded-full"
							role="meter"
							aria-valuenow={normalizedScore.percentile}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-label="{ordinalSuffix(normalizedScore.percentile)} percentile"
						>
							<div
								class="h-full rounded-full transition-all duration-500"
								style="width: {normalizedScore.percentile}%; background-color: {color}"
							></div>
						</div>
						<span class="text-muted-foreground shrink-0 text-xs font-medium">
							{ordinalSuffix(normalizedScore.percentile)} percentile
						</span>
					</div>
					{#if interpretation}
						<p class="text-muted-foreground mt-1 text-xs">
							{interpretation}
							{#if cohortContext}among {cohortContext.fieldName} patents filed in {cohortContext.filingYear}{/if}
						</p>
					{/if}
				{/if}

				{#if normalizedScore.smallCohort}
					<p class="text-muted-foreground mt-1 text-[10px]">Small cohort - interpret with care</p>
				{/if}
			{:else if showCalculateButton}
				<Button
					variant="secondary"
					size="sm"
					disabled={generalityLoading}
					onclick={onCalculateGenerality}
				>
					{generalityLoading ? 'Calculating…' : 'Calculate'}
				</Button>
				<p class="text-muted-foreground mt-1 text-[10px]">Requires on-demand computation</p>
				{#if generalityError}
					<p class="text-destructive mt-1 text-[10px]">{generalityError}</p>
				{/if}
			{:else}
				<p class="text-muted-foreground text-sm">Not available</p>
				{#if rawIndicator.error}
					<p class="text-muted-foreground mt-1 text-[10px]">{rawIndicator.error}</p>
				{:else if methodologyContent.unavailableReason}
					<p class="text-muted-foreground mt-1 text-[10px]">
						{methodologyContent.unavailableReason}
					</p>
				{/if}
			{/if}
		</div>

		<!-- Methodology expandable section -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="border-border mt-2 border-t" onkeydown={handleKeydown}>
			<Collapsible.Root bind:open={isOpen}>
				<Collapsible.Trigger
					class="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 py-2 text-left text-xs font-medium transition-colors"
					aria-controls={contentId}
				>
					<ChevronDown
						class="h-3.5 w-3.5 shrink-0 transition-transform duration-200 {isOpen
							? 'rotate-180'
							: ''}"
					/>
					How is this calculated?
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div id={contentId} class="pt-2">
						<IndicatorMethodology
							rawValue={normalizedScore.raw}
							rawUnit={rawDisplay}
							normalizedScore={normalizedScore.normalized}
							percentile={normalizedScore.percentile}
							methodology={methodologyContent}
							{cohortContext}
							available={normalizedScore.available}
							isGeneralityOnDemand={isGenerality && !isAvailable}
							{onCalculateGenerality}
							{generalityLoading}
						/>
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		</div>
	</Card.Content>
</Card.Root>
