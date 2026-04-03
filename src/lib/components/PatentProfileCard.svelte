<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Badge } from '$lib/components/ui/badge';
	import { ChevronDown } from '@lucide/svelte';
	import type { PatentProfile } from '$lib/scoring/types';
	import { toDisplay, parsePatentNumber } from '$lib/utils/patent-number-parser';

	interface CohortContext {
		size: number;
		fieldName: string;
		filingYear: number;
	}

	interface Props {
		patent: PatentProfile;
		cohortContext?: CohortContext | null;
	}

	let { patent, cohortContext = null }: Props = $props();

	let wipoOpen = $state(false);

	const displayNumber = $derived(() => {
		const parsed = parsePatentNumber(patent.publicationNumber);
		return parsed ? toDisplay(parsed) : patent.publicationNumber;
	});

	function formatDate(dateStr: string | null): string {
		if (!dateStr || dateStr === 'Unknown') return '—';
		try {
			return new Date(dateStr).toLocaleDateString('en-GB', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	function formatCpcCode(code: string): string {
		return code.replace(/\s+/g, ' ').trim();
	}
</script>

<Card.Root class="border-border border">
	<Card.Header>
		<Card.Title>Patent Profile</Card.Title>
	</Card.Header>
	<Card.Content>
		<dl class="grid gap-3 text-sm">
			{#if patent.title}
				<div>
					<dt class="text-muted-foreground font-medium">Title</dt>
					<dd class="text-foreground mt-0.5">{patent.title}</dd>
				</div>
			{/if}

			<div>
				<dt class="text-muted-foreground font-medium">Publication</dt>
				<dd class="text-foreground mt-0.5 font-mono">{displayNumber()}</dd>
			</div>

			{#if patent.applicants.length > 0}
				<div>
					<dt class="text-muted-foreground font-medium">
						{patent.applicants.length === 1 ? 'Applicant' : 'Applicants'}
					</dt>
					<dd class="text-foreground mt-0.5">{patent.applicants.join(', ')}</dd>
				</div>
			{/if}

			<div>
				<dt class="text-muted-foreground font-medium">Filing Date</dt>
				<dd class="text-foreground mt-0.5">{formatDate(patent.filingDate)}</dd>
			</div>

			{#if patent.grantDate}
				<div>
					<dt class="text-muted-foreground font-medium">Grant Date</dt>
					<dd class="text-foreground mt-0.5">{formatDate(patent.grantDate)}</dd>
				</div>
			{/if}

			<div>
				<dt class="text-muted-foreground font-medium">Grant Status</dt>
				<dd class="mt-0.5">
					<Badge variant={patent.grantStatus === 'granted' ? 'default' : 'secondary'}>
						{patent.grantStatus === 'granted'
							? 'Granted'
							: patent.grantStatus === 'pending'
								? 'Pending'
								: 'Unknown'}
					</Badge>
				</dd>
			</div>

			{#if patent.wipoFieldName && patent.wipoFieldName !== 'Unknown'}
				<div>
					<dt class="text-muted-foreground font-medium">WIPO Field</dt>
					<dd class="text-foreground mt-0.5">
						{patent.wipoFieldNumber} – {patent.wipoFieldName}
					</dd>
					{#if cohortContext || patent.pmiData}
						<Collapsible.Root bind:open={wipoOpen}>
							<Collapsible.Trigger
								class="text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1 text-left text-xs transition-colors"
							>
								<ChevronDown
									class="h-3 w-3 shrink-0 transition-transform duration-200 {wipoOpen
										? 'rotate-180'
										: ''}"
								/>
								Field details
							</Collapsible.Trigger>
							<Collapsible.Content>
								<dl class="mt-2 grid gap-1.5 text-xs">
									{#if cohortContext && cohortContext.size > 0}
										<div>
											<dt class="text-muted-foreground">Cohort Size</dt>
											<dd class="text-foreground font-medium">
												{cohortContext.size.toLocaleString()} patents
											</dd>
										</div>
										<div>
											<dt class="text-muted-foreground">Filing Year</dt>
											<dd class="text-foreground font-medium">{cohortContext.filingYear}</dd>
										</div>
									{/if}
									{#if patent.pmiData}
										<div>
											<dt class="text-muted-foreground">Field Activity</dt>
											<dd class="mt-0.5">
												<Badge
													variant={patent.pmiData.classification === 'HIGH'
														? 'default'
														: 'secondary'}
												>
													{patent.pmiData.classification}
												</Badge>
											</dd>
										</div>
									{/if}
								</dl>
							</Collapsible.Content>
						</Collapsible.Root>
					{/if}
				</div>
			{/if}

			{#if patent.cpcCodes.length > 0}
				<div>
					<dt class="text-muted-foreground font-medium">CPC Codes</dt>
					<dd class="text-foreground mt-0.5 font-mono text-xs">
						{patent.cpcCodes.map(formatCpcCode).join(', ')}
					</dd>
				</div>
			{/if}
		</dl>
	</Card.Content>
</Card.Root>
