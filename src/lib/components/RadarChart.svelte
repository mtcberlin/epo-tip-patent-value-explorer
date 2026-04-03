<script lang="ts">
	import type { NormalizedScore } from '$lib/scoring/types';
	import { STORY_LABELS, TECHNICAL_NAMES } from '$lib/scoring/types';
	import {
		AXIS_ORDER,
		getDimensionForIndicator,
		UNAVAILABLE_COLOR
	} from '$lib/config/chart-config';

	interface Props {
		scores: NormalizedScore[];
		isDark?: boolean;
	}

	let { scores, isDark = false }: Props = $props();

	const PAD = 90; // extra padding for label text
	const INNER = 300;
	const SIZE = INNER + PAD * 2;
	const CENTER = SIZE / 2;
	const RADIUS = 120;
	const LABEL_RADIUS = RADIUS + 28;
	const LEVELS = 5;

	const scoreMap = $derived(new Map(scores.map((s) => [s.indicator, s])));

	const orderedScores = $derived(AXIS_ORDER.map((name) => scoreMap.get(name) ?? null));

	function getPoint(index: number, value: number): { x: number; y: number } {
		const angle = (2 * Math.PI * index) / AXIS_ORDER.length - Math.PI / 2;
		return {
			x: CENTER + RADIUS * value * Math.cos(angle),
			y: CENTER + RADIUS * value * Math.sin(angle)
		};
	}

	function getLabelPoint(index: number): { x: number; y: number; anchor: string } {
		const angle = (2 * Math.PI * index) / AXIS_ORDER.length - Math.PI / 2;
		const x = CENTER + LABEL_RADIUS * Math.cos(angle);
		const y = CENTER + LABEL_RADIUS * Math.sin(angle);
		const anchor =
			Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
		return { x, y, anchor };
	}

	const polygonPath = $derived(() => {
		const points = orderedScores.map((score, i) => {
			const value = score?.normalized ?? 0;
			return getPoint(i, value);
		});
		return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
	});

	function getColor(
		indicatorName: (typeof AXIS_ORDER)[number],
		score: NormalizedScore | null
	): string {
		if (!score || score.normalized === null) return UNAVAILABLE_COLOR;
		const dim = getDimensionForIndicator(indicatorName);
		return isDark ? dim.darkColor : dim.color;
	}

	/** Hovered/focused axis index */
	let activeAxis = $state<number | null>(null);

	/** Tooltip position in container-relative pixels */
	let tooltipX = $state(0);
	let tooltipY = $state(0);
	let svgEl = $state<SVGSVGElement | null>(null);

	function handleAxisHover(index: number, event: MouseEvent) {
		activeAxis = index;
		if (svgEl) {
			const rect = svgEl.getBoundingClientRect();
			tooltipX = event.clientX - rect.left;
			tooltipY = event.clientY - rect.top - 10;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (activeAxis === null) activeAxis = 0;
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			activeAxis = (activeAxis + 1) % AXIS_ORDER.length;
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			activeAxis = (activeAxis - 1 + AXIS_ORDER.length) % AXIS_ORDER.length;
		}
	}

	const ariaLabel = $derived(() => {
		const parts = AXIS_ORDER.map((name) => {
			const score = scoreMap.get(name);
			if (!score || score.normalized === null) return `${TECHNICAL_NAMES[name]}: not available`;
			return `${TECHNICAL_NAMES[name]}: ${(score.normalized * 100).toFixed(0)} percent`;
		});
		return `Patent quality radar chart. ${parts.join(', ')}`;
	});

	function formatPercentile(p: number): string {
		const suffix = p === 1 ? 'st' : p === 2 ? 'nd' : p === 3 ? 'rd' : 'th';
		return `${p}${suffix}`;
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
<div
	class="relative mx-auto max-w-[600px]"
	role="application"
	aria-label={ariaLabel()}
	tabindex="0"
	onkeydown={handleKeydown}
	onfocusin={() => {
		if (activeAxis === null) activeAxis = 0;
	}}
	onfocusout={() => {
		activeAxis = null;
	}}
>
	<svg
		bind:this={svgEl}
		viewBox="0 0 {SIZE} {SIZE}"
		class="h-auto w-full"
		role="img"
		aria-label={ariaLabel()}
	>
		<!-- Grid levels -->
		{#each Array(LEVELS) as _, level}
			{@const r = (RADIUS * (level + 1)) / LEVELS}
			<polygon
				points={AXIS_ORDER.map((_, i) => {
					const angle = (2 * Math.PI * i) / AXIS_ORDER.length - Math.PI / 2;
					return `${CENTER + r * Math.cos(angle)},${CENTER + r * Math.sin(angle)}`;
				}).join(' ')}
				fill="none"
				stroke="currentColor"
				stroke-opacity="0.1"
				stroke-width="0.5"
			/>
		{/each}

		<!-- Axis lines -->
		{#each AXIS_ORDER as indicatorName, i}
			{@const endpoint = getPoint(i, 1)}
			{@const score = orderedScores[i]}
			{@const color = getColor(indicatorName, score)}
			<line
				x1={CENTER}
				y1={CENTER}
				x2={endpoint.x}
				y2={endpoint.y}
				stroke={color}
				stroke-width={activeAxis === i ? 2 : 1.5}
				stroke-dasharray={score?.normalized === null ? '4 3' : 'none'}
				stroke-opacity={score?.normalized !== null ? 0.6 : 0.3}
			/>
		{/each}

		<!-- Filled polygon -->
		<path
			d={polygonPath()}
			fill={isDark ? '#3B82F6' : '#1E40AF'}
			fill-opacity="0.12"
			stroke={isDark ? '#3B82F6' : '#1E40AF'}
			stroke-width="2"
			stroke-linejoin="round"
			class="motion-safe:transition-all motion-safe:duration-500"
		/>

		<!-- Data points + labels + hover areas -->
		{#each AXIS_ORDER as indicatorName, i}
			{@const score = orderedScores[i]}
			{@const value = score?.normalized ?? 0}
			{@const point = getPoint(i, value)}
			{@const color = getColor(indicatorName, score)}
			{@const labelPos = getLabelPoint(i)}
			{@const isActive = activeAxis === i}

			<!-- Axis label -->
			<text
				x={labelPos.x}
				y={labelPos.y}
				text-anchor={labelPos.anchor}
				dominant-baseline="central"
				class="fill-muted-foreground text-[10px]"
				font-weight={isActive ? '600' : '400'}
			>
				{TECHNICAL_NAMES[indicatorName]}
			</text>

			<line
				x1={CENTER}
				y1={CENTER}
				x2={getPoint(i, 1).x}
				y2={getPoint(i, 1).y}
				stroke="transparent"
				stroke-width="16"
				class="cursor-pointer"
				role="presentation"
				onmouseenter={(e) => handleAxisHover(i, e)}
				onmouseleave={() => (activeAxis = null)}
			/>

			<!-- Data point dot -->
			{#if score?.normalized !== null}
				<circle
					cx={point.x}
					cy={point.y}
					r={isActive ? 5 : 4}
					fill={color}
					stroke="white"
					stroke-width="1.5"
					class="pointer-events-none motion-safe:transition-all motion-safe:duration-200"
				/>
			{/if}
		{/each}
	</svg>

	<!-- HTML tooltip overlay -->
	{#if activeAxis !== null}
		{@const indicatorName = AXIS_ORDER[activeAxis]}
		{@const score = orderedScores[activeAxis]}
		{@const dim = getDimensionForIndicator(indicatorName)}
		{@const color = isDark ? dim.darkColor : dim.color}
		<div
			class="border-border bg-popover pointer-events-none absolute z-10 rounded border px-3 py-2 shadow-md"
			style="left: {tooltipX}px; top: {tooltipY}px; transform: translate(-50%, -100%)"
		>
			<div class="space-y-0.5 text-xs">
				<p class="text-popover-foreground font-medium">{STORY_LABELS[indicatorName]}</p>
				<p class="text-muted-foreground">{TECHNICAL_NAMES[indicatorName]}</p>
				{#if score?.normalized !== null && score?.normalized !== undefined}
					<p class="text-popover-foreground">Score: {score.normalized.toFixed(2)}</p>
					{#if score.percentile !== null}
						<p class="text-popover-foreground">{formatPercentile(score.percentile)} percentile</p>
					{/if}
				{:else}
					<p class="text-muted-foreground">Insufficient data for this indicator</p>
				{/if}
				<p class="text-muted-foreground flex items-center gap-1">
					<span class="inline-block h-2 w-2 rounded-full" style="background-color: {color}"></span>
					{dim.name}
				</p>
			</div>
		</div>
	{/if}
</div>
