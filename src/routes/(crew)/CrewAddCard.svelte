<script lang="ts">
	interface Props {
		onadd: () => void;
		large?: boolean;
	}

	let { onadd, large = false }: Props = $props();
</script>

<button
	type="button"
	onclick={onadd}
	class="flex aspect-[3/4] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/20 bg-white/5 text-slate-300 transition hover:border-teal-400/60 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none {large
		? 'w-[min(84vw,23rem)] gap-3'
		: 'w-[min(55vw,16.5rem)] gap-2'}"
>
	<span
		class="grid place-items-center rounded-full border border-white/20 {large
			? 'size-16 text-3xl'
			: 'size-12 text-2xl'}"
		aria-hidden="true">+</span
	>
	<span class="{large ? 'text-base' : 'text-sm'} font-medium">Add astronaut</span>
</button>
