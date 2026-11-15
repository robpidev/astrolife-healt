<script lang="ts">
	let { name, class: className = 'size-5' }: { name: string; class?: string } = $props();
	const paths: Record<string, string> = {
		cardiovascular: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z M3 12h5l2-4 4 8 2-4h5',
		sleep: 'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z',
		muscular: 'm6 4-3 3 14 14 3-3M4 6l3-3M17 21l4-4M6 18 18 6M3 15l6 6M15 3l6 6',
		mental: 'M9 18v3h8v-6a7 7 0 1 0-12-5l-2 4h3v4h3 M10 8l2-2 3 2-1 3-3 1',
		radiation: 'M12 12h.01M10 8 7 3a10 10 0 0 1 10 0l-3 5M8 12H2a10 10 0 0 0 5 9l3-5M16 12h6a10 10 0 0 1-5 9l-3-5',
		general: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
		summary: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
		measurements: 'M3 12h4l3-8 4 16 3-8h4',
		history: 'M3 11a9 9 0 1 1 3 8M3 4v7h7M12 7v5l3 2',
		risks: 'm12 3 10 18H2L12 3ZM12 9v5M12 17h.01',
		recommendations: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z'
	};
	let path = $derived(paths[name] ?? paths.general);
</script>

<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	aria-hidden="true"
>
	<path d={path} />
</svg>
