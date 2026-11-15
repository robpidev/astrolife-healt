<script lang="ts">
	import AstronautAvatar from '#lib/components/AstronautAvatar.svelte';
	import type { Astronaut } from '#lib/interfaces/astronaut.js';
	import { astronautName } from '#lib/utils/crew.js';

	let { astronaut }: { astronaut: Astronaut } = $props();
	let name = $derived(astronautName(astronaut));
	const statuses = { mision: 'On mission', entrenamiento: 'In training', descanso: 'Resting' };
	let status = $derived(statuses[astronaut.status]);
</script>

<section
	class="overflow-hidden rounded-2xl border border-cyan-200/15 bg-[#0b1729]/80"
	aria-label="Astronaut identity"
>
	<div class="flex flex-col items-center border-b border-cyan-200/10 px-5 pt-8 pb-6 text-center">
		<div class="rounded-full border border-cyan-300/40 p-1.5 shadow-[0_0_28px_0_#22d3ee20]">
			<AstronautAvatar {astronaut} size="xl" />
		</div>
		<h2 class="mt-5 text-xl font-semibold tracking-tight text-white">
			{name}
		</h2>
		<p class="mt-1.5 text-sm leading-relaxed text-slate-400">
			{astronaut.role}
		</p>
		<span
			class="mt-4 rounded-full border border-cyan-200/20 bg-cyan-300/5 px-3 py-1 text-xs text-cyan-200"
		>
			{status}
		</span>
	</div>
	<dl class="space-y-5 p-5 text-xs">
		<div>
			<dt class="mb-1.5 text-slate-500">Identifier</dt>
			<dd class="font-mono text-slate-200">
				ASTRO-{String(astronaut.id).padStart(3, '0')}
			</dd>
		</div>
		<div>
			<dt class="mb-1.5 text-slate-500">Nationality</dt>
			<dd class="text-slate-200">
				{astronaut.nationality ?? 'Not recorded'}
			</dd>
		</div>
		<div>
			<dt class="mb-1.5 text-slate-500">Missions completed</dt>
			<dd class="text-slate-200">
				{astronaut.missions_completed}
			</dd>
		</div>
	</dl>
	<div class="m-4 mt-0 rounded-xl border border-cyan-200/10 bg-cyan-300/5 p-3">
		<p class="text-sm leading-relaxed text-slate-400">
			Health status will be shown once evaluations are recorded.
		</p>
	</div>
</section>
