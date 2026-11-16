<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import HealthIcon from '#lib/components/astronaut/HealthIcon.svelte';

	let { basePath, class: className = '' }: { basePath: string; class?: string } = $props();
	const tabs = [
		{ path: '', route: '/(crew)/crew/[id]', label: 'Summary', icon: 'summary' },
		{
			path: '/measurements',
			route: '/(crew)/crew/[id]/measurements',
			icon: 'measurements',
			label: 'Measurements'
		},
		{ path: '/history', route: '/(crew)/crew/[id]/history', icon: 'history', label: 'Mission log' },
		{ path: '/risks', route: '/(crew)/crew/[id]/risks', icon: 'risks', label: 'Threats' },
		{
			path: '/recommendations',
			route: '/(crew)/crew/[id]/recommendations',
			icon: 'recommendations',
			label: 'Directives'
		}
	] as const;

	let id = $derived(basePath.split('/').at(-1) ?? '');
	let links = $derived(
		tabs.map((tab) => ({
			...tab,
			active: tab.path
				? page.url.pathname.startsWith(basePath + tab.path)
				: page.url.pathname === basePath
		}))
	);
</script>

<nav
	aria-label="Profile sections"
	class="flex [scrollbar-width:none] items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden {className}"
>
	{#each links as link (link.route)}
		<a
			href={resolve(link.route, { id })}
			aria-current={link.active ? 'page' : undefined}
			class="flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-[11px] font-semibold tracking-[0.18em] whitespace-nowrap uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 {link.active
				? 'border-cyan-300 text-cyan-200'
				: 'border-transparent text-slate-500 hover:bg-cyan-300/5 hover:text-slate-300'}"
		>
			<HealthIcon name={link.icon} class="size-4" />
			{link.label}
		</a>
	{/each}
</nav>
