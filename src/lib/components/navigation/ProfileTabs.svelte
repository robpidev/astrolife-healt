<script lang="ts">
	import { page } from '$app/state';
	import HealthIcon from '#lib/components/astronaut/HealthIcon.svelte';

	let { basePath }: { basePath: string } = $props();
	const tabs = [
		{ path: '', label: 'Summary', icon: 'summary' },
		{ path: '/measurements', icon: 'measurements', label: 'Measurements' },
		{ path: '/history', icon: 'history', label: 'History' },
		{ path: '/risks', icon: 'risks', label: 'Risks' },
		{ path: '/recommendations', icon: 'recommendations', label: 'Recommendations' }
	];

	let links = $derived(
		tabs.map((tab) => ({
			...tab,
			href: basePath + tab.path,
			active: tab.path
				? page.url.pathname.startsWith(basePath + tab.path)
				: page.url.pathname === basePath
		}))
	);
</script>

<nav
	aria-label="Profile sections"
	class="grid gap-1 rounded-xl border border-cyan-200/15 bg-[#0b1729]/80 p-1.5 sm:grid-cols-2 lg:grid-cols-5"
>
	{#each links as link (link.href)}
		<a
			href={link.href}
			aria-current={link.active ? 'page' : undefined}
			class="flex min-h-12 items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 {link.active
				? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-200 shadow-[inset_0_-2px_0_0_#67e8f9]'
				: 'border-transparent text-slate-400 hover:bg-cyan-300/5 hover:text-slate-100'}"
		>
			<HealthIcon name={link.icon} class="size-4" />
			{link.label}
		</a>
	{/each}
</nav>
