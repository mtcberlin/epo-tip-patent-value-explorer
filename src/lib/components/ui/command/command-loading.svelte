<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CommandPrimitive.LoadingProps = $props();
</script>

<CommandPrimitive.Loading
	bind:ref
	data-slot="command-loading"
	class={cn('text-muted-foreground py-6 text-center text-sm', className)}
	{...restProps}
/>
