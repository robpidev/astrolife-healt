<script lang="ts">
	import { PUBLIC_DEMO_MODE } from '$app/env/public';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { exitDemo } from './demo-boot.js';
	import { resetDemoDeltas } from './demo-store.js';

	let busy = $state(false);
	// The static build is the demo; there is no real app to return to.
	let canExit = $derived(!PUBLIC_DEMO_MODE);

	const buttonClass =
		'min-h-9 rounded-full px-3 text-xs font-semibold text-slate-200 transition hover:bg-cyan-300/15 hover:text-cyan-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50';

	async function reset(): Promise<void> {
		if (busy) return;

		busy = true;
		const tour = await import('./tour.js');
		tour.stopTour();
		resetDemoDeltas();
		await goto(resolve('/(crew)'));
		await invalidateAll();
		busy = false;
	}

	async function start(): Promise<void> {
		const tour = await import('./tour.js');
		tour.startTourForPath(window.location.pathname);
	}

	async function leave(): Promise<void> {
		const tour = await import('./tour.js');
		tour.stopTour();
		resetDemoDeltas();
		exitDemo();
	}
</script>

<div
	class="fixed right-4 bottom-4 z-[9000] flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 rounded-full border border-cyan-200/20 bg-[#0b1729]/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur"
	role="group"
	aria-label="Demo controls"
	data-tour="demo-toolbar"
>
	<span class="px-2.5 text-[10px] font-semibold tracking-[0.2em] text-cyan-300 uppercase">
		Demo
	</span>
	<button type="button" onclick={start} class={buttonClass}>Start tour</button>
	<button type="button" onclick={reset} disabled={busy} class={buttonClass}>
		{busy ? 'Resetting…' : 'Reset demo'}
	</button>
	{#if canExit}
		<button type="button" onclick={leave} class={buttonClass}>Exit demo</button>
	{/if}
</div>
