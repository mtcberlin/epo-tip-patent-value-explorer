<script lang="ts">
	import type { IndicatorName } from '$lib/scoring/types';
	import { STORY_LABELS } from '$lib/scoring/types';
	import { METHODOLOGY_CONTENT } from '$lib/config/methodology-content';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { ChevronDown } from '@lucide/svelte';
	import CompositeMethodology from './CompositeMethodology.svelte';
	import PmiMethodology from './PmiMethodology.svelte';

	interface IndicatorAvailability {
		name: IndicatorName;
		available: boolean;
	}

	interface CohortContext {
		size: number;
		fieldName: string;
		filingYear: number;
	}

	interface PmiData {
		classification: string;
		pmiScore: number;
		activityLevel?: number | null;
		cagr?: number | null;
	}

	interface Props {
		compositeScore: number | null;
		indicatorCount: number;
		totalIndicators: number;
		cohortContext?: CohortContext | null;
		indicators?: IndicatorAvailability[];
		pmiData?: PmiData | null;
		wipoFieldName?: string;
	}

	let {
		compositeScore,
		indicatorCount,
		totalIndicators,
		cohortContext = null,
		indicators = [],
		pmiData = null,
		wipoFieldName = ''
	}: Props = $props();

	let isOpen = $state(false);
	const contentId = 'composite-methodology-content';

	const scoreDisplay = $derived(
		compositeScore !== null && Number.isFinite(compositeScore) ? compositeScore.toFixed(2) : null
	);

	const gaugePercent = $derived(
		compositeScore !== null && Number.isFinite(compositeScore)
			? Math.round(compositeScore * 100)
			: null
	);

	const interpretation = $derived.by(() => {
		if (compositeScore === null) return null;
		if (compositeScore >= 0.6) return 'Exceptionally high quality';
		if (compositeScore >= 0.45) return 'Well above average quality';
		if (compositeScore >= 0.3) return 'Above average quality';
		if (compositeScore >= 0.2) return 'Average quality';
		return 'Below average quality';
	});

	const ariaLabel = $derived(() => {
		if (!scoreDisplay) return 'Composite Quality Score: insufficient data';
		const parts = [`Composite Quality Score: ${scoreDisplay}`];
		if (cohortContext) parts.push(`compared to patents in ${cohortContext.fieldName}`);
		if (indicatorCount < totalIndicators)
			parts.push(`based on ${indicatorCount} of ${totalIndicators} indicators`);
		return parts.join(', ');
	});

	const includedIndicators = $derived(
		indicators
			.filter((i) => i.available)
			.map((i) => ({ name: i.name, storyLabel: STORY_LABELS[i.name] }))
	);

	const excludedIndicators = $derived(
		indicators
			.filter((i) => !i.available)
			.map((i) => ({
				name: i.name,
				storyLabel: STORY_LABELS[i.name],
				reason: METHODOLOGY_CONTENT[i.name].unavailableReason
			}))
	);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			isOpen = false;
			event.stopPropagation();
		}
	}
</script>

<Card.Root class="border-border border" aria-label={ariaLabel()}>
	<Card.Header>
		<Card.Title>Overall Quality</Card.Title>
	</Card.Header>
	<Card.Content class="pb-0">
		{#if scoreDisplay && gaugePercent !== null}
			<div class="space-y-3">
				<div class="flex items-baseline gap-1">
					<p class="text-foreground font-mono text-4xl font-semibold">
						{scoreDisplay}
					</p>
					<span class="text-muted-foreground text-sm">/ 1.0</span>
				</div>

				<div>
					<div
						class="bg-muted h-2 w-full overflow-hidden rounded-full"
						role="meter"
						aria-valuenow={compositeScore !== null ? +compositeScore.toFixed(2) : 0}
						aria-valuemin={0}
						aria-valuemax={1}
						aria-label="Overall quality: {scoreDisplay}"
					>
						<div
							class="bg-primary h-full rounded-full transition-all duration-700"
							style="width: {gaugePercent}%"
						></div>
					</div>
				</div>

				{#if interpretation}
					<p class="text-foreground text-sm font-medium">
						{interpretation}
					</p>
				{/if}

				{#if cohortContext && cohortContext.size > 0}
					<p class="text-muted-foreground text-xs">
						vs. {cohortContext.size.toLocaleString()} patents in {cohortContext.fieldName} filed in {cohortContext.filingYear}
					</p>
				{/if}

				{#if indicatorCount < totalIndicators}
					<p class="text-muted-foreground text-xs">
						Based on {indicatorCount} of {totalIndicators} indicators
					</p>
				{/if}
			</div>
		{:else}
			<div class="flex items-center gap-2">
				<span class="inline-block h-2 w-2 rounded-full bg-neutral-300" aria-hidden="true"></span>
				<p class="text-muted-foreground text-sm">Insufficient data to calculate overall quality</p>
			</div>
		{/if}

		<!-- Methodology expandable -->
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
					<div id={contentId} class="pt-1 pb-3">
						<CompositeMethodology {includedIndicators} {excludedIndicators} {totalIndicators} />
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		</div>

		{#if pmiData}
			<div class="border-border border-t">
				<PmiMethodology
					pmiClassification={pmiData.classification}
					pmiScore={pmiData.pmiScore}
					activityLevel={pmiData.activityLevel}
					cagr={pmiData.cagr}
					{wipoFieldName}
				/>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
