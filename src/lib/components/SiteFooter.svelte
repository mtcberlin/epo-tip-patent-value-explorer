<script lang="ts">
	const footerLinks: ReadonlyArray<{ href: string; label: string; external?: boolean }> = [
		{ href: 'https://mtc.berlin', label: 'mtc.berlin', external: true },
		{ href: 'https://depa.tech', label: 'depa.tech', external: true },
		{ href: 'https://patscenar.io', label: 'patscenar.io', external: true }
	];
</script>

<footer class="border-border-strong bg-background border-t-2">
	<div class="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
		<!-- Attribution -->
		<p class="text-muted-foreground text-xs">
			Data: <a
				href="https://www.epo.org/en/searching-for-patents/data/bulk-data-sets/text-analytics"
				target="_blank"
				rel="noopener noreferrer"
				class="text-primary underline-offset-4 hover:underline">EPO PATSTAT</a
			>
			&mdash; Built for the
			<a
				href="https://www.epo.org"
				target="_blank"
				rel="noopener noreferrer"
				class="text-primary underline-offset-4 hover:underline">EPO CodeFest 2026</a
			>
		</p>

		<!-- Links -->
		<nav aria-label="Footer navigation" class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
			{#each footerLinks as link}
				<a
					href={link.href}
					class="text-muted-foreground hover:text-foreground text-xs transition-colors"
					target={link.external ? '_blank' : undefined}
					rel={link.external ? 'noopener noreferrer' : undefined}
				>
					{link.label}
				</a>
			{/each}
		</nav>

		<!-- Copyright -->
		<p class="text-muted-foreground mt-3 text-xs">&copy; 2026 mtc.berlin</p>
	</div>
</footer>
