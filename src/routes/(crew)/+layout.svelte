<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="min-h-dvh bg-slate-950 text-slate-100">{@render children()}</div>
