<script lang="ts">
	import type { MethodologyContent } from '$lib/config/methodology-content';
	import { ordinalSuffix } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button';
	import { InfoIcon } from '@lucide/svelte';
	import ProvenanceBadge from './ProvenanceBadge.svelte';

	interface CohortContext {
		size: number;
		fieldName: string;
		filingYear: number;
	}

	interface Props {
		rawValue: number | null;
		rawUnit: string | null;
		normalizedScore: number | null;
		percentile: number | null;
		methodology: MethodologyContent;
		cohortContext?: CohortContext | null;
		available: boolean;
		isGeneralityOnDemand?: boolean;
		onCalculateGenerality?: () => void;
		generalityLoading?: boolean;
	}

	let {
		rawValue,
		rawUnit,
		normalizedScore,
		percentile,
		methodology,
		cohortContext = null,
		available,
		isGeneralityOnDemand = false,
		onCalculateGenerality,
		generalityLoading = false
	}: Props = $props();
</script>

<div class="space-y-3 text-xs">
	{#if !available}
		{#if isGeneralityOnDemand}
			<!-- Generality on-demand: not yet calculated -->
			<div class="bg-muted/50 flex items-start gap-2 rounded-md p-2.5">
				<InfoIcon class="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
				<p class="text-muted-foreground">Not yet calculated - approximately 16GB BigQuery query</p>
			</div>
		{:else}
			<!-- Unavailable indicator reason -->
			<div class="bg-muted/50 flex items-start gap-2 rounded-md p-2.5">
				<InfoIcon class="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
				<p class="text-muted-foreground">{methodology.unavailableReason}</p>
			</div>
		{/if}
	{:else}
		<!-- Available indicator: show raw value, normalized, percentile -->
		<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
			{#if rawUnit}
				<dt class="text-muted-foreground">Raw Value</dt>
				<dd class="text-foreground font-medium">{rawUnit}</dd>
			{/if}
			{#if normalizedScore !== null}
				<dt class="text-muted-foreground">Normalized</dt>
				<dd class="text-foreground font-medium">{normalizedScore.toFixed(2)}</dd>
			{/if}
			{#if percentile !== null}
				<dt class="text-muted-foreground">Percentile</dt>
				<dd class="text-foreground font-medium">{ordinalSuffix(percentile)} percentile</dd>
			{/if}
		</dl>
	{/if}

	<!-- Formula (always visible) -->
	<div>
		<p class="text-muted-foreground mb-1 font-medium">Formula</p>
		<p class="text-foreground font-mono" style="font-family: 'JetBrains Mono', monospace;">
			{methodology.formula}
		</p>
		{#if methodology.formulaDisplay}
			<p class="text-muted-foreground mt-0.5">{methodology.formulaDisplay}</p>
		{/if}
	</div>

	<!-- PATSTAT source (always visible) -->
	<p class="text-muted-foreground">
		Source: {methodology.patstatSource}
	</p>

	{#if available}
		<!-- Normalization method -->
		<div>
			<p class="text-muted-foreground mb-1 font-medium">Normalization</p>
			<p class="text-foreground">{methodology.normalizationMethod}</p>
		</div>

		<!-- Cohort definition -->
		{#if cohortContext && cohortContext.size > 0}
			<div>
				<p class="text-muted-foreground mb-1 font-medium">Cohort</p>
				<p class="text-foreground">
					Compared to {cohortContext.size.toLocaleString()} patents in {cohortContext.fieldName} filed
					in {cohortContext.filingYear}
				</p>
			</div>
		{/if}
	{/if}

	<!-- Generality: Calculate button inside methodology -->
	{#if isGeneralityOnDemand && onCalculateGenerality}
		<Button
			variant="secondary"
			size="sm"
			disabled={generalityLoading}
			onclick={onCalculateGenerality}
		>
			{generalityLoading ? 'Calculating…' : 'Calculate Generality Index'}
		</Button>
	{/if}

	<!-- OECD reference (always visible) -->
	<p class="text-muted-foreground text-[10px]">
		Reference: OECD Patent Quality Indicators, Section {methodology.oecdSection}
	</p>

	<!-- PVE-specific UX layer disclaimer -->
	<div class="border-border bg-muted/40 mt-2 flex items-start gap-2 rounded-md border p-2">
		<ProvenanceBadge provenance="PVE" class="mt-0.5 shrink-0" />
		<p class="text-muted-foreground text-[10px] leading-snug">
			The headline above each card (e.g. <em>"This idea sparked many others"</em>) and the
			percentile interpretation labels (<em>"Exceptionally high"</em>, <em>"Average"</em>, …) are
			Patent Value Explorer phrasings - they are not part of the OECD framework. The underlying
			indicator and its calculation are OECD-defined.
		</p>
	</div>
</div>
