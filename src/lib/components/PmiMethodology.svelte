<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Badge } from '$lib/components/ui/badge';
	import { ChevronDown } from '@lucide/svelte';
	import ProvenanceBadge from './ProvenanceBadge.svelte';

	interface Props {
		pmiClassification: string;
		pmiScore: number;
		activityLevel?: number | null;
		cagr?: number | null;
		wipoFieldName: string;
	}

	let {
		pmiClassification,
		pmiScore,
		activityLevel = null,
		cagr = null,
		wipoFieldName
	}: Props = $props();

	let isOpen = $state(false);

	const contentId = 'pmi-methodology-content';

	const classificationUpper = $derived(pmiClassification.toUpperCase());

	const badgeVariant = $derived.by(() => {
		if (classificationUpper === 'HIGH') return 'default' as const;
		if (classificationUpper === 'MEDIUM') return 'secondary' as const;
		return 'outline' as const;
	});

	const explanation = $derived.by(() => {
		if (classificationUpper === 'HIGH')
			return 'This patent is in a high-activity technology field - filing activity is growing rapidly.';
		if (classificationUpper === 'MEDIUM')
			return 'This patent is in a moderate-activity technology field - filing activity is stable.';
		return 'This patent is in a low-activity technology field - filing activity is declining.';
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			isOpen = false;
			event.stopPropagation();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div onkeydown={handleKeydown}>
	<Collapsible.Root bind:open={isOpen}>
		<Collapsible.Trigger
			class="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 py-2 text-left text-xs font-medium transition-colors"
			aria-controls={contentId}
		>
			<ChevronDown
				class="h-3.5 w-3.5 shrink-0 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
			/>
			About Field Activity Index
		</Collapsible.Trigger>
		<Collapsible.Content>
			<div id={contentId} class="space-y-3 pt-1 text-xs">
				<!-- Field name and classification -->
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-foreground font-medium">{wipoFieldName}</span>
					<Badge variant={badgeVariant}>{classificationUpper}</Badge>
					<ProvenanceBadge
						provenance="PVE"
						title="The Field Activity Index (FAI) is a Patent Value Explorer metric adapted from the WIPO Patent Momentum Indicator. It is not part of the OECD Patent Quality framework and is not an official WIPO product."
					/>
				</div>

				<!-- Contextual explanation -->
				<p class="text-foreground">{explanation}</p>

				<!-- Formula -->
				<div>
					<p class="text-muted-foreground mb-1 font-medium">Formula</p>
					<p class="text-foreground" style="font-family: 'JetBrains Mono', monospace;">
						FAI = Z(Activity Level) + Z(CAGR)
					</p>
				</div>

				<p class="text-muted-foreground text-[10px]">
					Calculated from PATSTAT filing data. Not an official WIPO product.
				</p>

				<!-- Thresholds -->
				<div>
					<p class="text-muted-foreground mb-1 font-medium">Thresholds</p>
					<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
						<dt class="text-foreground font-medium">HIGH</dt>
						<dd class="text-muted-foreground">&gt; 0.81</dd>
						<dt class="text-foreground font-medium">MEDIUM</dt>
						<dd class="text-muted-foreground">-0.18 to 0.81</dd>
						<dt class="text-foreground font-medium">LOW</dt>
						<dd class="text-muted-foreground">&lt; -0.18</dd>
					</dl>
				</div>

				<!-- Actual values (may be unavailable from older cached data) -->
				{#if activityLevel != null && cagr != null}
					<div>
						<p class="text-muted-foreground mb-1 font-medium">Actual Values</p>
						<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
							<dt class="text-muted-foreground">Activity Level</dt>
							<dd class="text-foreground font-medium">{activityLevel.toFixed(2)} (Z-Score)</dd>
							<dt class="text-muted-foreground">CAGR</dt>
							<dd class="text-foreground font-medium">{cagr.toFixed(2)} (Z-Score)</dd>
							<dt class="text-muted-foreground">FAI Score</dt>
							<dd class="text-foreground font-medium">{pmiScore.toFixed(2)}</dd>
						</dl>
					</div>
				{/if}
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
</div>
