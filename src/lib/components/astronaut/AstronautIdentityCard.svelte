<script lang="ts">
	import { resolve } from '$app/paths';
	import AstronautAvatar from '#lib/components/AstronautAvatar.svelte';
	import type { Astronaut } from '#lib/interfaces/astronaut.js';
	import { astronautName } from '#lib/utils/crew.js';
	import { sharedTransition } from '#lib/services/view-transition.svelte.js';
	import { astronautAvatarName, astronautNameName } from '#lib/utils/shared-transition.js';

	let { astronaut }: { astronaut: Astronaut } = $props();
	let name = $derived(astronautName(astronaut));
	let shared = $derived(sharedTransition.astronautId === astronaut.id);
	let avatarTransition = $derived(shared ? astronautAvatarName(astronaut.id) : null);
	let nameTransition = $derived(shared ? astronautNameName(astronaut.id) : null);
	const statuses = { mision: 'On mission', entrenamiento: 'In training', descanso: 'Resting' };
	let status = $derived(statuses[astronaut.status]);
	let medicalHref = $derived(resolve('/(crew)/crew/[id]/medical', { id: String(astronaut.id) }));
	let alertsHref = $derived(resolve('/(crew)/crew/[id]/alerts', { id: String(astronaut.id) }));
</script>

<section
	class="overflow-hidden rounded-2xl border border-cyan-200/15 bg-[#0b1729]/80"
	aria-label="Astronaut identity"
>
	<div class="flex flex-col items-center border-b border-cyan-200/10 px-5 pt-8 pb-6 text-center">
		<div
			class="rounded-full border border-cyan-300/40 p-1.5 shadow-[0_0_28px_0_#22d3ee20]"
			style:view-transition-name={avatarTransition}
		>
			<AstronautAvatar {astronaut} size="xl" />
		</div>
		<h2
			class="mt-5 text-xl font-semibold tracking-tight text-white"
			style:view-transition-name={nameTransition}
		>
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
		<div class="flex flex-wrap gap-2">
			<a
				href={medicalHref}
				class="rounded-lg border border-cyan-200/20 bg-cyan-300/5 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition-colors hover:border-cyan-200/40 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				Medical dossier
			</a>
			<a
				href={alertsHref}
				class="rounded-lg border border-cyan-200/20 bg-cyan-300/5 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition-colors hover:border-cyan-200/40 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				Warnings
			</a>
		</div>
	</div>
</section>
