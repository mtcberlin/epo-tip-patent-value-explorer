<script lang="ts">
	import { base } from '$app/paths';
	import { Menu, Settings } from '@lucide/svelte';
	import { LightSwitch } from '$lib/components/ui/light-switch';
	import * as Sheet from '$lib/components/ui/sheet';
	import PatentSearchBar from '$lib/components/PatentSearchBar.svelte';
	import DepatechLogo from '$lib/components/DepatechLogo.svelte';
	import SettingsDialog from '$lib/components/SettingsDialog.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		currentPatentNumber?: string;
	}

	let { currentPatentNumber }: Props = $props();

	let mobileMenuOpen = $state(false);
</script>

<header class="border-border-strong bg-background sticky top-0 z-40 border-b-2">
	<div class="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 lg:px-6">
		<!-- Logo -->
		<a href="{base}/" class="text-foreground flex items-center gap-2 font-semibold">
			<DepatechLogo class="h-10 w-auto" />
			<span class="hidden sm:inline">Patent Value Explorer</span>
			<span class="sm:hidden">PVE</span>
		</a>

		<!-- Search bar in header (shown when on patent detail page) -->
		{#if currentPatentNumber}
			<div class="hidden flex-1 justify-center md:flex">
				<PatentSearchBar initialValue={currentPatentNumber} compact={true} />
			</div>
		{:else}
			<div class="flex-1"></div>
		{/if}

		<!-- Settings & Light Switch (Desktop) -->
		<div class="hidden items-center gap-1 md:flex">
			<button
				onclick={() => (settings.dialogOpen = true)}
				aria-label="Open settings"
				class="text-foreground hover:bg-foreground hover:text-background relative inline-flex size-11 items-center justify-center rounded"
			>
				<Settings class="size-5" />
				{#if settings.hasApiKey}
					<span class="bg-primary absolute top-2 right-2 size-1.5 rounded-full" aria-hidden="true"
					></span>
				{/if}
			</button>
			<LightSwitch variant="ghost" />
		</div>

		<!-- Mobile Menu -->
		<div class="md:hidden">
			<Sheet.Root bind:open={mobileMenuOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							aria-label="Open navigation menu"
							class="text-foreground hover:bg-foreground hover:text-background inline-flex size-11 items-center justify-center rounded"
						>
							<Menu class="size-6" />
						</button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content side="left" class="w-[280px]">
					<Sheet.Header>
						<Sheet.Title>Navigation</Sheet.Title>
					</Sheet.Header>
					<nav class="flex flex-col gap-1 p-4" aria-label="Mobile navigation">
						<a
							href="{base}/"
							class="text-foreground hover:bg-foreground hover:text-background rounded px-3 py-3 text-sm transition-colors"
							onclick={() => (mobileMenuOpen = false)}
						>
							Home
						</a>
						<button
							onclick={() => {
								mobileMenuOpen = false;
								settings.dialogOpen = true;
							}}
							class="text-foreground hover:bg-foreground hover:text-background flex items-center gap-2 rounded px-3 py-3 text-sm transition-colors"
						>
							<Settings class="size-4" />
							Settings
							{#if settings.hasApiKey}
								<span class="bg-primary size-1.5 rounded-full" aria-hidden="true"></span>
							{/if}
						</button>
						<div class="border-border mt-4 border-t pt-4">
							<LightSwitch variant="outline" />
						</div>
					</nav>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	</div>
</header>

<SettingsDialog bind:open={settings.dialogOpen} />
