<script lang="ts">
	import { base } from '$app/paths';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Trash2, X, Clock } from '@lucide/svelte';
	import { history, type HistoryEntry } from '$lib/stores/history.svelte';

	function formatRelative(iso: string): string {
		try {
			const then = new Date(iso).getTime();
			const now = Date.now();
			const diffMs = now - then;
			const m = Math.floor(diffMs / 60_000);
			if (m < 1) return 'just now';
			if (m < 60) return `${m} min ago`;
			const h = Math.floor(m / 60);
			if (h < 24) return `${h} h ago`;
			const d = Math.floor(h / 24);
			if (d < 7) return `${d} d ago`;
			return new Date(iso).toLocaleDateString();
		} catch {
			return '';
		}
	}

	function patentHref(entry: HistoryEntry): string {
		return `${base}/patent/${entry.auth}/${entry.number}`;
	}

	function handleClose() {
		history.sheetOpen = false;
	}

	function handleRemove(event: MouseEvent, publicationNumber: string) {
		event.preventDefault();
		event.stopPropagation();
		history.remove(publicationNumber);
	}
</script>

<Sheet.Root bind:open={history.sheetOpen}>
	<Sheet.Content side="right" class="flex w-[340px] flex-col gap-0 p-0 sm:w-[400px]">
		<Sheet.Header class="border-border border-b py-3 pr-12 pl-4">
			<Sheet.Title class="flex items-center gap-2 text-base">
				<Clock class="size-4" aria-hidden="true" />
				Recently viewed
			</Sheet.Title>
			<Sheet.Description class="text-xs">
				Stored locally in your browser. Nothing is sent anywhere.
			</Sheet.Description>
		</Sheet.Header>

		{#if history.count === 0}
			<div class="flex flex-1 items-center justify-center px-6 py-12 text-center">
				<p class="text-muted-foreground text-sm">
					No patents viewed yet.
				</p>
			</div>
		{:else}
			<ul class="flex-1 overflow-y-auto" role="list">
				{#each history.entries as entry (entry.publicationNumber)}
					<li class="border-border border-b last:border-b-0">
						<a
							href={patentHref(entry)}
							onclick={handleClose}
							class="hover:bg-muted/50 group flex items-start gap-2 px-4 py-2.5 transition-colors"
						>
							<div class="min-w-0 flex-1">
								<div class="text-foreground font-mono text-xs font-semibold">
									{entry.auth} {entry.number}
								</div>
								{#if entry.title}
									<div class="text-foreground mt-0.5 line-clamp-1 text-sm">
										{entry.title}
									</div>
								{/if}
								<div class="text-muted-foreground mt-0.5 text-[10px]">
									{formatRelative(entry.viewedAt)}
								</div>
							</div>
							<button
								type="button"
								aria-label="Remove from history"
								onclick={(e) => handleRemove(e, entry.publicationNumber)}
								class="text-muted-foreground hover:text-destructive shrink-0 self-center rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
							>
								<X class="size-3.5" />
							</button>
						</a>
					</li>
				{/each}
			</ul>

			<div class="border-border border-t px-4 py-3">
				<Button
					variant="outline"
					size="sm"
					onclick={() => history.clear()}
					class="w-full gap-2"
				>
					<Trash2 class="size-3.5" aria-hidden="true" />
					Clear history
				</Button>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
