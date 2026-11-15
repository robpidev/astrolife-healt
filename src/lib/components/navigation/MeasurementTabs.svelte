<script lang="ts">
	import { page } from '$app/state';

	interface Tab {
	id: string;
	label: string;
	}
	let { basePath, tabs }: { basePath: string; tabs: readonly Tab[] } = $props();
	let links = $derived(
	[{ id: '', label: 'Resumen' }, ...tabs].map((tab) => ({
	...tab,
	href: basePath + (tab.id ? '/' + tab.id : '')
	}))
	);
</script>

<nav aria-label="Mediciones del área" class="mb-6 flex flex-wrap gap-2">
	{#each links as link (link.href)}
		<a
			href={link.href}
			aria-current={page.url.pathname === link.href ? 'page' : undefined}
			class="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-teal-300"
		>
			{link.label}
		</a>
	{/each}
</nav>
