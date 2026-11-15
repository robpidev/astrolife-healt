<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { browser } from '$app/env';
	import type { Astronaut } from '#lib/interfaces/astronaut.js';
	import CrewPoster from './CrewPoster.svelte';
	import CrewAddCard from './CrewAddCard.svelte';

	interface Props {
		crew: Astronaut[];
		selectedId: number | null;
		reducedMotion: boolean;
		/** Astronaut whose poster should take keyboard focus after a roving move. */
		focusId?: number | null;
		onselect: (astronaut: Astronaut) => void;
		onadd: () => void;
	}

	let { crew, selectedId, reducedMotion, focusId = null, onselect, onadd }: Props = $props();

	let railEl = $state<HTMLDivElement | null>(null);
	let isDragging = $state(false);

	// The rail's scroll position is driven by a tween instead of the browser's
	// native smooth scroll: native scrolling overshoots when a second scroll
	// starts mid-animation, and it cannot be cancelled cleanly on drag.
	const railScroll = new Tween(0, { duration: 420, easing: cubicOut });

	// Mirror the tween onto the real scroll position every frame.
	$effect(() => {
		const rail = railEl;
		if (!rail) return;
		rail.scrollLeft = railScroll.current;
	});

	let selectedIndex = $derived(crew.findIndex((astronaut) => astronaut.id === selectedId));

	let railItems = $derived(
		crew.map((astronaut, index) => {
			const distance = selectedIndex < 0 ? 99 : Math.abs(index - selectedIndex);
			// 1 = at the rail centre, 0 = far away. Drives scale and opacity.
			const nearness = Math.max(0, 1 - distance / 2.5);
			return { astronaut, distance, nearness, scale: 0.62 + 0.38 * nearness };
		})
	);

	/** Final scale for a card `distance` positions away from the selection. */
	function scaleAt(distance: number): number {
		return 0.62 + 0.38 * Math.max(0, 1 - Math.abs(distance) / 2.5);
	}

	/**
	 * Scrolls the rail so the selected poster ends up centred once every card
	 * has reached its final size. The target is computed from the final
	 * widths, not the current ones, so the tween and the width transition land
	 * on the same spot: the previous centre card shrinks and slides aside while
	 * the new one grows in place.
	 */
	function centerOn(index: number, smooth: boolean): void {
		const rail = railEl;
		if (!rail) return;

		const ul = rail.querySelector<HTMLElement>('ul.crew-rail-track');
		if (!ul) return;

		const items = [...ul.querySelectorAll<HTMLElement>('li[data-astronaut-id]')];
		const first = items[0]?.firstElementChild;
		if (items.length === 0 || !(first instanceof HTMLElement)) return;

		const style = getComputedStyle(ul);
		const gap = parseFloat(style.columnGap) || 0;
		const pad = parseFloat(style.paddingLeft) || 0;
		// The wrapper width is `min(84vw, 23rem) * scale`; recover the base
		// from the viewport instead of the mid-transition measured width.
		const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
		const baseWidth = Math.min(window.innerWidth * 0.84, 23 * rootFont);

		let contentWidth = 0;
		let centre = 0;
		for (let i = 0; i < items.length; i++) {
			const width = baseWidth * scaleAt(i - index);
			if (i === index) centre = pad + contentWidth + width / 2;
			contentWidth += width + gap;
		}
		contentWidth = Math.max(0, contentWidth - gap);

		const max = Math.max(0, 2 * pad + contentWidth - rail.clientWidth);
		const next = Math.max(0, Math.min(max, Math.round(centre - rail.clientWidth / 2)));
		if (Math.abs(next - rail.scrollLeft) < 2) return;

		// Start from the real scroll position: the tween's own value is stale
		// after a manual drag or wheel scroll.
		railScroll.set(rail.scrollLeft, { duration: 0 });
		railScroll.set(next, smooth ? {} : { duration: 0 });
	}

	// Re-centre whenever the selection or the motion setting changes. Widths
	// transition in CSS, so the target is computed for their final values.
	$effect(() => {
		if (!browser) return;

		const index = selectedIndex;
		if (index < 0 || isDragging) return;

		const smooth = !untrack(() => reducedMotion);
		requestAnimationFrame(() => centerOn(index, smooth));
	});

	// Roving focus: the parent bumps `focusId` only for keyboard/dock moves, so
	// a plain click never steals focus away from the pointer.
	$effect(() => {
		const id = focusId;
		if (!browser || id === null) return;

		untrack(() => {
			railEl
				?.querySelector<HTMLElement>(`[data-astronaut-id="${id}"] button`)
				?.focus({ preventScroll: true });
		});
	});

	/**
	 * Touch dragging must win over auto-centring, otherwise the rail snaps back
	 * under the finger. Implemented as an attachment so the scroll container
	 * stays a plain presentational element for assistive tech.
	 */
	function railDrag(node: HTMLElement): () => void {
		const stopTween = (): void => {
			// Taking over the scroll must freeze the tween where the rail is.
			railScroll.set(node.scrollLeft, { duration: 0 });
		};
		const start = (): void => {
			isDragging = true;
			stopTween();
		};
		const end = (): void => {
			if (!isDragging) return;
			isDragging = false;
			if (selectedIndex >= 0) centerOn(selectedIndex, true);
		};

		node.addEventListener('pointerdown', start, { passive: true });
		node.addEventListener('pointerup', end, { passive: true });
		node.addEventListener('pointercancel', end, { passive: true });
		node.addEventListener('pointerleave', end, { passive: true });
		node.addEventListener('wheel', stopTween, { passive: true });

		return () => {
			node.removeEventListener('pointerdown', start);
			node.removeEventListener('pointerup', end);
			node.removeEventListener('pointercancel', end);
			node.removeEventListener('pointerleave', end);
			node.removeEventListener('wheel', stopTween);
		};
	}
</script>

<section aria-labelledby="crew-rail-heading" class="flex min-h-0 flex-1 flex-col">
	<h2 id="crew-rail-heading" class="sr-only">Selecciona un astronauta</h2>

	<div
		bind:this={railEl}
		{@attach railDrag}
		class="relative flex min-h-0 flex-1 touch-pan-x [scrollbar-width:none] items-center overflow-x-auto py-4 sm:py-6 [&::-webkit-scrollbar]:hidden"
	>
		<ul class="crew-rail-track mx-auto flex w-max items-center gap-3 sm:gap-4">
			{#if crew.length === 0}
				<li class="shrink-0">
					<CrewAddCard {onadd} large />
				</li>
			{:else}
				{#each railItems as item (item.astronaut.id)}
					<li
						class="shrink-0"
						data-astronaut-id={item.astronaut.id}
						data-focused={item.astronaut.id === selectedId}
					>
						<div
							class="crew-rail-poster {reducedMotion ? 'crew-rail-instant' : ''}"
							style:--scale={item.scale}
						>
							<CrewPoster
								astronaut={item.astronaut}
								focused={item.astronaut.id === selectedId}
								nearness={item.nearness}
								{reducedMotion}
								{onselect}
							/>
						</div>
					</li>
				{/each}

				<li class="shrink-0">
					<CrewAddCard {onadd} />
				</li>
			{/if}
		</ul>
	</div>
</section>
