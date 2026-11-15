<script lang="ts">
	interface Props {
	title: string;
	value?: number | null;
	unit?: string;
	href?: string | null;
	}
	let { title, value = null, unit = '', href = null }: Props = $props();
</script>

<article class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
	<h3 class="text-xs font-medium text-slate-300">
		{title}
	</h3>
	<p class="mt-4 text-3xl font-light tracking-tight text-cyan-100">
		{value ?? '—'}
		<span class="text-xs font-normal text-slate-500">
			{unit}
		</span>
	</p>
	{#if value === null}
		<p class="mt-2 text-xs text-slate-500">
			Sin mediciones registradas.
		</p>
	{/if}
	{#if href}
		<a
			{href}
			class="mt-3 inline-block text-xs text-cyan-300/80 hover:text-cyan-100 focus-visible:outline-2 focus-visible:outline-cyan-300"
		>
			Ver medición
		</a>
	{/if}
</article>
