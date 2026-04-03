<script lang="ts">
	import { base } from '$app/paths';
	import type { ReferencePatentRow } from '$lib/server/data/types';
	import type { NormalizedScore, IndicatorName } from '$lib/scoring/types';
	import { INDICATOR_NAMES } from '$lib/scoring/types';
	import MiniRadarChart from './MiniRadarChart.svelte';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		patent: ReferencePatentRow;
	}

	let { patent }: Props = $props();

	const auth = $derived(patent.publicationNumber.substring(0, 2));
	const number = $derived(patent.publicationNumber.substring(2));

	const NORM_KEYS: Record<IndicatorName, keyof ReferencePatentRow> = {
		forward_citations: 'forwardCitationsNormalized',
		backward_citations: 'backwardCitationsNormalized',
		family_size: 'familySizeNormalized',
		generality_index: 'generalityIndexNormalized',
		radicalness_index: 'radicalnessIndexNormalized',
		claims_count: 'claimsCountNormalized',
		grant_lag_days: 'grantLagNormalized',
		renewal_duration: 'renewalDurationNormalized'
	};

	const normalizedScores: NormalizedScore[] = $derived(
		INDICATOR_NAMES.map((name) => {
			const val = patent[NORM_KEYS[name]] as number | null;
			return {
				indicator: name,
				raw: null,
				normalized: val,
				percentile: null,
				available: val !== null,
				cohortSize: null,
				smallCohort: false
			};
		})
	);
</script>

<a
	href="{base}/patent/{auth}/{number}"
	class="group border-border bg-card hover:border-foreground/30 focus-visible:outline-ring flex h-full gap-3 border p-3 transition-all focus-visible:outline-2 focus-visible:outline-offset-2"
	aria-label="View quality profile for {patent.title} ({patent.publicationNumber})"
>
	<div class="shrink-0">
		<MiniRadarChart scores={normalizedScores} size={80} />
	</div>
	<div class="min-w-0 flex-1">
		<p class="text-muted-foreground font-mono text-[11px]">{patent.publicationNumber}</p>
		<h3
			class="text-foreground mt-0.5 line-clamp-2 text-sm leading-snug font-semibold group-hover:underline"
		>
			{patent.title}
		</h3>
		<p class="text-muted-foreground mt-1 truncate text-xs">{patent.applicant}</p>
		{#if patent.archetype}
			<div class="mt-1.5">
				<Badge variant="secondary" class="text-[10px]">{patent.archetype}</Badge>
			</div>
		{/if}
	</div>
</a>
