<script lang="ts">
	import type { Astronaut } from '#lib/interfaces/astronaut.js';
	import { astronautName, initialsFor } from '#lib/utils/crew.js';
	import { crewTones } from '#lib/utils/crew-theme.js';

	interface Props {
		astronaut: Pick<Astronaut, 'first_name' | 'last_name' | 'avatar_url' | 'tone'>;
		size?: 'sm' | 'md' | 'lg' | 'xl';
	}

	let { astronaut, size = 'sm' }: Props = $props();

	const sizeClasses: Record<NonNullable<Props['size']>, string> = {
		sm: 'size-14 text-base',
		md: 'size-20 text-xl',
		lg: 'size-24 text-2xl',
		xl: 'size-32 text-4xl sm:size-36 sm:text-5xl'
	};

	let name = $derived(astronautName(astronaut));
	let initials = $derived(initialsFor(astronaut.first_name, astronaut.last_name));
	let ring = $derived(crewTones[astronaut.tone].avatar);
	let classes = $derived(sizeClasses[size]);
</script>

{#if astronaut.avatar_url}
	<img
		src={astronaut.avatar_url}
		alt="Retrato de {name}"
		class="shrink-0 rounded-full object-cover ring-2 {ring} {classes}"
	/>
{:else}
	<!-- Monogram only: the astronaut name is always rendered next to it. -->
	<span
		class="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-slate-950/50 font-semibold tracking-wide text-white ring-2 {ring} {classes}"
		aria-hidden="true"
	>
		<span class="absolute inset-0 bg-linear-to-b from-white/20 to-transparent"></span>
		<span class="relative">{initials}</span>
	</span>
{/if}
