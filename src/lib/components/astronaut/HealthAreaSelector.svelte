<script lang="ts">
	import { page } from '$app/state';
	import HealthIcon from '#lib/components/astronaut/HealthIcon.svelte';
	import { healthAreas } from '#lib/data/healthAreas.js';

	let { basePath }: { basePath: string } = $props();
	let links = $derived(
		healthAreas.map((area) => {
			const href = basePath + '/measurements/' + area.id;
			return {
				...area,
				href,
				active:
					page.url.pathname === href ||
					page.url.pathname.startsWith(href + '/') ||
					(page.url.pathname === basePath && area.id === 'cardiovascular')
			};
		})
	);
</script>

<nav
	aria-label="Áreas de salud"
	class="app-scroll flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:gap-3 xl:overflow-visible xl:pb-0"
>
	{#each links as link (link.id)}
		<a
			href={link.href}
			aria-current={link.active ? 'location' : undefined}
			class="flex min-h-12 shrink-0 items-center gap-2.5 rounded-lg border px-3 py-3 text-sm font-medium whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 {link.active
				? 'border-cyan-300/60 bg-cyan-300/15 text-cyan-100 shadow-[0_0_18px_0_#22d3ee15]'
				: 'border-cyan-200/15 bg-slate-900/80 text-slate-300 hover:border-cyan-300/40 hover:bg-cyan-300/5'}"
		>
			<HealthIcon name={link.id} class="size-4 shrink-0" />
			{link.label}
		</a>
	{/each}
</nav>
