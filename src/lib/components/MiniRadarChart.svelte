<script lang="ts">
	import type { NormalizedScore } from '$lib/scoring/types';
	import {
		AXIS_ORDER,
		getDimensionForIndicator,
		UNAVAILABLE_COLOR
	} from '$lib/config/chart-config';

	interface Props {
		scores: NormalizedScore[];
		size?: number;
		isDark?: boolean;
	}

	let { scores, size = 120, isDark = false }: Props = $props();

	const PADDING = 8;
	const RADIUS = $derived((size - PADDING * 2) / 2);
	const CENTER = $derived(size / 2);

	const scoreMap = $derived(new Map(scores.map((s) => [s.indicator, s])));

	const orderedScores = $derived(AXIS_ORDER.map((name) => scoreMap.get(name) ?? null));

	function getPoint(index: number, value: number) {
		const angle = (2 * Math.PI * index) / AXIS_ORDER.length - Math.PI / 2;
		return {
			x: CENTER + RADIUS * value * Math.cos(angle),
			y: CENTER + RADIUS * value * Math.sin(angle)
		};
	}

	function getColor(index: number): string {
		const score = orderedScores[index];
		if (!score || score.normalized === null) return UNAVAILABLE_COLOR;
		const dim = getDimensionForIndicator(AXIS_ORDER[index]);
		return isDark ? dim.darkColor : dim.color;
	}

	const polygonPath = $derived.by(() => {
		const points = orderedScores.map((score, i) => {
			const value = score?.normalized ?? 0;
			return getPoint(i, value);
		});
		return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
	});
</script>

<svg width={size} height={size} viewBox="0 0 {size} {size}" aria-hidden="true" class="block">
	<!-- Grid -->
	{#each [0.5, 1] as level}
		<polygon
			points={AXIS_ORDER.map((_, i) => {
				const angle = (2 * Math.PI * i) / AXIS_ORDER.length - Math.PI / 2;
				const r = RADIUS * level;
				return `${CENTER + r * Math.cos(angle)},${CENTER + r * Math.sin(angle)}`;
			}).join(' ')}
			fill="none"
			stroke="currentColor"
			stroke-opacity="0.1"
			stroke-width="0.5"
		/>
	{/each}

	<!-- Axis lines -->
	{#each AXIS_ORDER as _, i}
		{@const endpoint = getPoint(i, 1)}
		<line
			x1={CENTER}
			y1={CENTER}
			x2={endpoint.x}
			y2={endpoint.y}
			stroke={getColor(i)}
			stroke-width="1"
			stroke-opacity="0.3"
		/>
	{/each}

	<!-- Shape -->
	<path
		d={polygonPath}
		fill={isDark ? '#3B82F6' : '#1E40AF'}
		fill-opacity="0.15"
		stroke={isDark ? '#3B82F6' : '#1E40AF'}
		stroke-width="1.5"
		stroke-linejoin="round"
	/>

	<!-- Dots -->
	{#each orderedScores as score, i}
		{#if score?.normalized !== null}
			{@const point = getPoint(i, score?.normalized ?? 0)}
			<circle cx={point.x} cy={point.y} r="2.5" fill={getColor(i)} />
		{/if}
	{/each}
</svg>
