<script lang="ts">
	import type { Astronaut } from '#lib/interfaces/astronaut.js';
	import { astronautName, initialsFor } from '#lib/utils/crew.js';
	import { crewTones } from '#lib/utils/crew-theme.js';

	interface Props {
		astronaut: Pick<Astronaut, 'first_name' | 'last_name' | 'avatar_url' | 'tone'>;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		/** Overrides for container-query sizing; they replace the `size` presets. */
		class?: string;
		ringClass?: string;
		textClass?: string;
	}

	let { astronaut, size = 'sm', class: className, ringClass, textClass }: Props = $props();

	const sizeClasses: Record<NonNullable<Props['size']>, string> = {
		sm: 'size-14 text-base',
		md: 'size-20 text-xl',
		lg: 'size-24 text-2xl',
		xl: 'size-32 text-4xl sm:size-36 sm:text-5xl'
	};

	let name = $derived(astronautName(astronaut));
	let initials = $derived(initialsFor(astronaut.first_name, astronaut.last_name));
	let ring = $derived(crewTones[astronaut.tone].avatar);
	let classes = $derived(className ?? sizeClasses[size]);
	let ringWidth = $derived(ringClass ?? 'ring-2');
	let monogram = $derived(textClass ?? sizeClasses[size].split(' ')[1] ?? '');
</script>

{#if astronaut.avatar_url}
	<img
		src={astronaut.avatar_url}
		alt="Retrato de {name}"
		class="shrink-0 rounded-full object-cover {ringWidth} {ring} {classes}"
	/>
{:else}
	<!-- Monogram only: the astronaut name is always rendered next to it. -->
	<span
		class="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-slate-950/50 font-semibold tracking-wide text-white {ringWidth} {ring} {classes}"
		aria-hidden="true"
	>
		<span class="absolute inset-0 bg-linear-to-b from-white/20 to-transparent"></span>
		<span class="relative {monogram}">{initials}</span>
	</span>
{/if}
