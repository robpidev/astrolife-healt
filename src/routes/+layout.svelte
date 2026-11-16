<script lang="ts">
	import './layout.css';
	import { browser } from '$app/env';
	import { onNavigate } from '$app/navigation';
	import { tick } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import { resetSharedTransition, sharedTransition } from '#lib/services/view-transition.svelte.js';
	import { resolveSharedTransition } from '#lib/utils/shared-transition.js';
	import DemoToolbar from '#lib/demo/DemoToolbar.svelte';
	import { bootDemo } from '#lib/demo/demo-boot.js';
	import { isDemoMode } from '#lib/demo/mode.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let demoActive = $state(false);

	$effect(() => {
		const active = isDemoMode();
		demoActive = active;
		if (active) bootDemo();
	});

	type ViewTransitionDocument = Document & {
		startViewTransition?: (callback: () => Promise<void>) => { finished: Promise<void> };
	};

	onNavigate(async (navigation) => {
		if (!browser || !navigation.to || navigation.shallow) return;

		const doc = document as ViewTransitionDocument;
		if (typeof doc.startViewTransition !== 'function') return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const from = navigation.from?.url ?? new URL(window.location.href);
		if (from.href === navigation.to.url.href) return;

		let shared = resolveSharedTransition(from, navigation.to.url);

		// The identity card is desktop-only, so the crew pair has no destination on mobile.
		if (shared?.astronautId != null && !window.matchMedia('(min-width: 1024px)').matches) {
			shared = null;
		}

		sharedTransition.astronautId = shared?.astronautId ?? null;
		sharedTransition.areaId = shared?.areaId ?? null;
		await tick();

		return new Promise<void>((resolve) => {
			let transition: { finished: Promise<void> } | null;
			try {
				transition = doc.startViewTransition!(async () => {
					resolve();
					await navigation.complete;
					await tick();
				});
			} catch {
				resetSharedTransition();
				resolve();
				return;
			}
			transition.finished.then(resetSharedTransition, resetSharedTransition);
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Astrolife</title>
</svelte:head>

{@render children()}

{#if demoActive}<DemoToolbar />{/if}
