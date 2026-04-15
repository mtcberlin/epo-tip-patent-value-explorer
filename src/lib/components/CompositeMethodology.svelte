<script lang="ts">
	import type { IndicatorName } from '$lib/scoring/types';
	import { STORY_LABELS } from '$lib/scoring/types';
	import ProvenanceBadge from './ProvenanceBadge.svelte';

	interface IndicatorEntry {
		name: IndicatorName;
		storyLabel: string;
	}

	interface ExcludedEntry extends IndicatorEntry {
		reason: string;
	}

	interface Props {
		includedIndicators: IndicatorEntry[];
		excludedIndicators: ExcludedEntry[];
		totalIndicators: number;
	}

	let { includedIndicators, excludedIndicators, totalIndicators }: Props = $props();
</script>

<div class="space-y-3 text-xs">
	<!-- Formula -->
	<div>
		<div class="mb-1 flex items-center gap-1.5">
			<p class="text-muted-foreground font-medium">Formula</p>
			<ProvenanceBadge
				provenance="PVE"
				title="PVE uses 5 of OECD's 6 composite components - Generality is omitted because computing it requires a ~16 GB scan over every citing patent's CPC classes. The component selection itself follows OECD's 'Patent quality: composite index' section."
			/>
		</div>
		<p class="text-foreground" style="font-family: 'JetBrains Mono', monospace;">
			Composite = &Sigma;(normalized scores) / n
		</p>
	</div>

	<!-- Explanation -->
	<p class="text-foreground">
		Equally-weighted average over {totalIndicators} OECD composite components (Forward Citations,
		Family Size, Claims, Originality, Radicalness - Squicciarini, Dernis &amp; Criscuolo 2013, "Patent quality: composite index" section). Generality
		is excluded from the standard composite because computing it requires a ~16 GB scan over every
		citing patent's CPC classes; it is offered on-demand instead. Other PVE indicators (Backward
		Citations, Patent Scope, Grant Lag, Renewal) are reported standalone and do not feed into this
		index.
	</p>

	<!-- Included indicators -->
	{#if includedIndicators.length > 0}
		<div>
			<p class="text-muted-foreground mb-1.5 font-medium">
				Included ({includedIndicators.length}):
			</p>
			<ul class="space-y-1" role="list">
				{#each includedIndicators as indicator}
					<li class="flex items-center gap-2">
						<span class="inline-block h-2 w-2 shrink-0 rounded-full bg-green-600" aria-hidden="true"
						></span>
						<span class="text-foreground">{indicator.storyLabel}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Excluded indicators -->
	{#if excludedIndicators.length > 0}
		<div>
			<p class="text-muted-foreground mb-1.5 font-medium">
				Excluded ({excludedIndicators.length}):
			</p>
			<ul class="space-y-1" role="list">
				{#each excludedIndicators as indicator}
					<li class="flex items-center gap-2">
						<span
							class="inline-block h-2 w-2 shrink-0 rounded-full bg-neutral-300"
							aria-hidden="true"
						></span>
						<span class="text-foreground"
							>{indicator.storyLabel}
							<span class="text-muted-foreground">- {indicator.reason}</span></span
						>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Normalization note -->
	<p class="text-muted-foreground">
		Each indicator is Winsorized at the 98th percentile, then linearly scaled to 0.0–1.0.
	</p>
</div>
