<script lang="ts">
	import type { NormalizedScore } from '$lib/scoring/types';
	import { TECHNICAL_NAMES, STORY_LABELS } from '$lib/scoring/types';
	import { AXIS_ORDER, getDimensionForIndicator } from '$lib/config/chart-config';
	import RadarChart from './RadarChart.svelte';
	import BarChartAlternative from './BarChartAlternative.svelte';

	interface CohortContext {
		size: number;
		fieldName: string;
		filingYear: number;
	}

	interface Props {
		scores: NormalizedScore[];
		cohortContext?: CohortContext | null;
	}

	let { scores, cohortContext = null }: Props = $props();

	/** Detect viewport width for responsive switching */
	let innerWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);

	const isDesktop = $derived(innerWidth >= 768);

	/** Detect dark mode */
	let isDark = $state(false);

	/** Ordered scores for the accessible table */
	const scoreMap = $derived(new Map(scores.map((s) => [s.indicator, s])));
</script>

<svelte:window bind:innerWidth />

<div>
	<!-- Responsive chart: radar on desktop, bars on mobile -->
	{#if isDesktop}
		<RadarChart {scores} {isDark} />
	{:else}
		<BarChartAlternative {scores} {isDark} />
	{/if}

	<!-- Cohort context subtitle -->
	{#if cohortContext}
		<p class="text-muted-foreground mt-3 text-center text-xs">
			Compared to {cohortContext.size.toLocaleString()} patents in {cohortContext.fieldName} filed in
			{cohortContext.filingYear}
		</p>
	{/if}

	<!-- Dimension legend -->
	<div class="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
		{#each [{ name: 'Technological Importance', color: isDark ? '#3B82F6' : '#1E40AF' }, { name: 'Market Relevance', color: isDark ? '#14B8A6' : '#0D7377' }] as dim}
			<span class="text-muted-foreground flex items-center gap-1 text-[10px]">
				<span class="inline-block h-2 w-2 rounded-full" style="background-color: {dim.color}"
				></span>
				{dim.name}
			</span>
		{/each}
	</div>

	<!-- Hidden accessible data table for screen readers -->
	<table class="sr-only" aria-label="Patent quality indicator scores">
		<caption>Quality indicator scores</caption>
		<thead>
			<tr>
				<th scope="col">Indicator</th>
				<th scope="col">Technical Name</th>
				<th scope="col">Score</th>
				<th scope="col">Percentile</th>
				<th scope="col">Dimension</th>
			</tr>
		</thead>
		<tbody>
			{#each AXIS_ORDER as indicatorName}
				{@const score = scoreMap.get(indicatorName)}
				{@const dim = getDimensionForIndicator(indicatorName)}
				<tr>
					<td>{STORY_LABELS[indicatorName]}</td>
					<td>{TECHNICAL_NAMES[indicatorName]}</td>
					<td>
						{#if score?.normalized !== null && score?.normalized !== undefined}
							{score.normalized.toFixed(2)}
						{:else}
							Not available
						{/if}
					</td>
					<td>
						{#if score?.percentile !== null && score?.percentile !== undefined}
							{score.percentile}th percentile
						{:else}
							Not available
						{/if}
					</td>
					<td>{dim.name}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
