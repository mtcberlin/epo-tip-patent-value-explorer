<script lang="ts">
	import type { IndicatorProvenance } from '$lib/scoring/types';

	interface Props {
		provenance: IndicatorProvenance;
		/** Optional override tooltip; defaults to a sensible explanation per provenance. */
		title?: string;
		class?: string;
	}

	let { provenance, title, class: extraClass = '' }: Props = $props();

	const defaultTitle = $derived(
		provenance === 'OECD'
			? 'OECD Patent Quality Indicator (Squicciarini, Dernis & Criscuolo 2013)'
			: 'Patent Value Explorer addition - not part of the OECD framework'
	);

	const styles = $derived(
		provenance === 'OECD'
			? 'bg-[#082453] text-white'
			: 'bg-amber-500 text-amber-50 dark:bg-amber-600 dark:text-amber-50'
	);
</script>

<span
	class="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase {styles} {extraClass}"
	title={title ?? defaultTitle}
	aria-label={provenance === 'OECD'
		? 'OECD-defined indicator'
		: 'Patent Value Explorer indicator (not OECD)'}
>
	{provenance}
</span>
