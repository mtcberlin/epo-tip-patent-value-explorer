<script lang="ts">
	import '../app.css';
	import { TooltipProvider } from '$lib/components/ui/tooltip';
	import { page } from '$app/state';
	import { parsePatentNumber, toNormalized } from '$lib/utils/patent-number-parser';
	import SkipLink from '$lib/components/SkipLink.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';

	let { children } = $props();

	const currentPatentNumber = $derived.by(() => {
		const params = page.params;
		if (params.auth && params.number) {
			const parsed = parsePatentNumber(`${params.auth}${params.number}`);
			return parsed ? toNormalized(parsed) : undefined;
		}
		return undefined;
	});
</script>

<TooltipProvider delayDuration={300}>
	<SkipLink />
	<SiteHeader {currentPatentNumber} />
	<main
		id="main-content"
		class="mx-auto min-h-[calc(100dvh-3.5rem-8rem)] max-w-[1440px] px-4 pb-16 lg:px-6"
	>
		{@render children()}
	</main>
	<SiteFooter />
</TooltipProvider>
