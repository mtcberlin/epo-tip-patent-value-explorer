<script lang="ts">
	import type { NormalizedScore } from '$lib/scoring/types';
	import { STORY_LABELS, TECHNICAL_NAMES } from '$lib/scoring/types';
	import {
		EPO_DIMENSIONS,
		getDimensionForIndicator,
		UNAVAILABLE_COLOR
	} from '$lib/config/chart-config';

	interface Props {
		scores: NormalizedScore[];
		isDark?: boolean;
	}

	let { scores, isDark = false }: Props = $props();

	const scoreMap = $derived(new Map(scores.map((s) => [s.indicator, s])));

	function getColor(score: NormalizedScore | undefined): string {
		if (!score || score.normalized === null) return UNAVAILABLE_COLOR;
		const dim = getDimensionForIndicator(score.indicator);
		return isDark ? dim.darkColor : dim.color;
	}
</script>

<div class="space-y-6">
	{#each EPO_DIMENSIONS as dimension}
		<div>
			<h4
				class="mb-2 text-xs font-semibold tracking-wider uppercase"
				style="color: {isDark ? dimension.darkColor : dimension.color}"
			>
				{dimension.name}
			</h4>
			<div class="space-y-2">
				{#each dimension.indicators as indicatorName}
					{@const score = scoreMap.get(indicatorName)}
					{@const value = score?.normalized}
					{@const color = getColor(score)}
					<div>
						<div class="mb-0.5 flex items-baseline justify-between gap-2">
							<span class="text-foreground truncate text-xs">
								{TECHNICAL_NAMES[indicatorName]}
							</span>
							{#if value !== null && value !== undefined}
								<span class="shrink-0 text-xs font-medium tabular-nums" style="color: {color}">
									{(value * 100).toFixed(0)}%
								</span>
							{:else}
								<span class="text-muted-foreground shrink-0 text-xs">N/A</span>
							{/if}
						</div>
						<div class="bg-muted h-2 w-full overflow-hidden rounded-full">
							{#if value !== null && value !== undefined}
								<div
									class="h-full rounded-full motion-safe:transition-all motion-safe:duration-500"
									style="width: {value * 100}%; background-color: {color}"
									role="meter"
									aria-valuenow={Math.round(value * 100)}
									aria-valuemin={0}
									aria-valuemax={100}
									aria-label="{TECHNICAL_NAMES[indicatorName]}: {(value * 100).toFixed(0)}%"
								></div>
							{:else}
								<div
									class="text-muted-foreground flex h-full w-full items-center justify-center text-[7px]"
								>
									Not available
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>
