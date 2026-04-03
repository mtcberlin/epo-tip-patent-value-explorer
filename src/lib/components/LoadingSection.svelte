<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';

	type SkeletonType =
		| 'patent-profile'
		| 'radar-chart'
		| 'indicator-card'
		| 'composite-score'
		| 'ai-narrative';

	interface Props {
		isLoading: boolean;
		loadingLabel: string;
		skeletonType: SkeletonType;
		children?: Snippet;
	}

	let { isLoading, loadingLabel, skeletonType, children }: Props = $props();
</script>

<div aria-live="polite">
	{#if isLoading}
		<div aria-hidden="true">
			{#if skeletonType === 'patent-profile'}
				<div class="space-y-3">
					{#each [100, 70, 85, 60, 100, 50, 90] as width}
						<div>
							<Skeleton class="mb-1 h-3 w-24" />
							<Skeleton class="h-4" style="width: {width}%" />
						</div>
					{/each}
				</div>
			{:else if skeletonType === 'radar-chart'}
				<div class="flex justify-center">
					<Skeleton class="aspect-square w-full max-w-[400px] rounded-full" />
				</div>
			{:else if skeletonType === 'indicator-card'}
				<div class="space-y-2.5">
					<Skeleton class="h-4 w-3/5" />
					<Skeleton class="h-3 w-2/5" />
					<Skeleton class="h-7 w-1/2" />
					<Skeleton class="h-1.5 w-full" />
					<Skeleton class="h-3 w-3/4" />
				</div>
			{:else if skeletonType === 'composite-score'}
				<div class="space-y-3">
					<Skeleton class="h-4 w-48" />
					<Skeleton class="h-10 w-28" />
					<Skeleton class="h-5 w-20 rounded-full" />
					<Skeleton class="h-3 w-56" />
				</div>
			{:else if skeletonType === 'ai-narrative'}
				<div class="space-y-2">
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-3/4" />
				</div>
			{/if}
		</div>
		<p class="text-muted-foreground mt-3 text-sm" role="status">{loadingLabel}</p>
	{:else}
		{#if children}{@render children()}{/if}
	{/if}
</div>
