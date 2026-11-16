<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { browser } from '$app/env';
	import type { Astronaut } from '#lib/interfaces/astronaut.js';
	import CrewPoster from './CrewPoster.svelte';
	import CrewAddCard from './CrewAddCard.svelte';
	import { sharedTransition } from '#lib/services/view-transition.svelte.js';

	interface Props {
		crew: Astronaut[];
		selectedId: number | null;
		reducedMotion: boolean;
		focusId?: number | null;
		onselect: (astronaut: Astronaut) => void;
		onadd: () => void;
	}
	let { crew, selectedId, reducedMotion, focusId = null, onselect, onadd }: Props = $props();
	let railEl = $state<HTMLDivElement | null>(null);
	const railScroll = new Tween(0, { duration: 420, easing: cubicOut });
	$effect(() => {
		const rail = railEl;
		if (!rail) return;
		rail.scrollLeft = railScroll.current;
	});

	let selectedIndex = $derived(crew.findIndex((astronaut) => astronaut.id === selectedId));

	let railItems = $derived(
		crew.map((astronaut, index) => {
			const distance = selectedIndex < 0 ? 99 : Math.abs(index - selectedIndex);
			const nearness = Math.max(0, 1 - distance / 2.5);
			return { astronaut, distance, nearness, scale: 0.62 + 0.38 * nearness };
		})
	);
	function scaleAt(distance: number): number {
		return 0.62 + 0.38 * Math.max(0, 1 - Math.abs(distance) / 2.5);
	}
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
		const addButton = ul.querySelector<HTMLElement>('li:last-child > button');
		const addWidth = addButton?.offsetWidth ?? 0;
		const max = Math.max(0, 2 * pad + contentWidth + gap + addWidth - rail.clientWidth);
		const next = Math.max(0, Math.min(max, Math.round(centre - rail.clientWidth / 2)));
		if (Math.abs(next - rail.scrollLeft) < 2) return;
		railScroll.set(rail.scrollLeft, { duration: 0 });
		railScroll.set(next, smooth ? {} : { duration: 0 });
	}
	$effect(() => {
		if (!browser) return;
		const index = selectedIndex;
		if (index < 0) return;
		const smooth = !untrack(() => reducedMotion);
		requestAnimationFrame(() => {
			if (!userScrolling) centerOn(index, smooth);
		});
	});
	$effect(() => {
		const id = focusId;
		if (!browser || id === null) return;

		untrack(() => {
			railEl
				?.querySelector<HTMLElement>(`[data-astronaut-id="${id}"] button`)
				?.focus({ preventScroll: true });
		});
	});
	let userScrolling = false;
	function handlePosterSelect(astronaut: Astronaut): void {
		userScrolling = false;
		onselect(astronaut);
		const index = crew.findIndex((member) => member.id === astronaut.id);
		if (index >= 0) {
			requestAnimationFrame(() => centerOn(index, !reducedMotion));
		}
	}
	function railDrag(node: HTMLElement): () => void {
		const dragThreshold = 6;
		let pointerId: number | null = null;
		let startX = 0;
		let startScroll = 0;
		let didDrag = false;
		let suppressClick = false;
		let settleTimer: ReturnType<typeof setTimeout> | null = null;

		const stopTween = (): void => {
			railScroll.set(node.scrollLeft, { duration: 0 });
		};

		const clearSettle = (): void => {
			if (settleTimer !== null) clearTimeout(settleTimer);
			settleTimer = null;
		};

		const nearestIndex = (): number => {
			const posters = node.querySelectorAll<HTMLElement>('li[data-astronaut-id]');
			const centerX = node.getBoundingClientRect().left + node.clientWidth / 2;
			let closest = -1;
			let closestDistance = Number.POSITIVE_INFINITY;
			posters.forEach((poster, index) => {
				const rect = poster.getBoundingClientRect();
				const distance = Math.abs(rect.left + rect.width / 2 - centerX);
				if (distance < closestDistance) {
					closestDistance = distance;
					closest = index;
				}
			});
			return closest;
		};

		const updateSelection = (): void => {
			const index = nearestIndex();
			const astronaut = crew[index];
			if (astronaut && astronaut.id !== selectedId) onselect(astronaut);
		};

		const settle = (): void => {
			clearSettle();
			settleTimer = setTimeout(() => {
				settleTimer = null;
				if (!userScrolling || pointerId !== null) return;
				updateSelection();
				userScrolling = false;
				const index = nearestIndex();
				if (index >= 0) centerOn(index, !reducedMotion);
			}, 200);
		};

		const onScroll = (): void => {
			if (!userScrolling) return;
			updateSelection();
			settle();
		};

		const onWheel = (event: WheelEvent): void => {
			if (event.ctrlKey) return;
			const maxScroll = node.scrollWidth - node.clientWidth;
			if (maxScroll <= 0) return;
			const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
			const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientWidth : 1;
			const next = Math.max(0, Math.min(maxScroll, node.scrollLeft + delta * multiplier));
			if (Math.abs(next - node.scrollLeft) < 0.5) return;

			event.preventDefault();
			userScrolling = true;
			stopTween();
			node.scrollLeft = next;
			stopTween();
			updateSelection();
			settle();
		};

		const onPointerDown = (event: PointerEvent): void => {
			if (!event.isPrimary) return;
			if (event.pointerType === 'touch') {
				userScrolling = true;
				stopTween();
				clearSettle();
				return;
			}
			if (event.button !== 0) return;
			stopTween();
			pointerId = event.pointerId;
			startX = event.clientX;
			startScroll = node.scrollLeft;
			didDrag = false;
			suppressClick = false;
		};

		const onPointerMove = (event: PointerEvent): void => {
			if (pointerId !== event.pointerId) return;
			const distance = event.clientX - startX;
			if (!didDrag && Math.abs(distance) < dragThreshold) return;

			if (!didDrag) {
				didDrag = true;
				suppressClick = true;
				userScrolling = true;
				clearSettle();
				node.setPointerCapture(event.pointerId);
				node.classList.add('crew-rail-dragging');
			}
			event.preventDefault();
			node.scrollLeft = startScroll - distance;
			stopTween();
			updateSelection();
		};

		const finishDrag = (event: PointerEvent): void => {
			if (event.pointerType === 'touch') {
				if (userScrolling) settle();
				return;
			}
			if (pointerId !== event.pointerId) return;
			if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
			pointerId = null;
			if (didDrag) settle();
			didDrag = false;
			node.classList.remove('crew-rail-dragging');
		};

		const onClickCapture = (event: MouseEvent): void => {
			if (!suppressClick || event.detail === 0) return;
			event.preventDefault();
			event.stopImmediatePropagation();
			suppressClick = false;
		};

		node.addEventListener('scroll', onScroll, { passive: true });
		node.addEventListener('wheel', onWheel, { passive: false });
		node.addEventListener('pointerdown', onPointerDown, { passive: true });
		node.addEventListener('pointermove', onPointerMove);
		node.addEventListener('pointerup', finishDrag);
		node.addEventListener('pointercancel', finishDrag);
		node.addEventListener('click', onClickCapture, true);

		return () => {
			clearSettle();
			node.removeEventListener('scroll', onScroll);
			node.removeEventListener('wheel', onWheel);
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointermove', onPointerMove);
			node.removeEventListener('pointerup', finishDrag);
			node.removeEventListener('pointercancel', finishDrag);
			node.removeEventListener('click', onClickCapture, true);
		};
	}
</script>

<section aria-labelledby="crew-rail-heading" class="flex min-h-0 flex-1 flex-col">
	<h2 id="crew-rail-heading" class="sr-only">Select an astronaut</h2>

	<div
		bind:this={railEl}
		{@attach railDrag}
		class="crew-rail relative flex min-h-0 flex-1 cursor-grab touch-pan-x [scrollbar-width:none] items-center overflow-x-auto py-4 select-none sm:py-6 [&::-webkit-scrollbar]:hidden"
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
								onselect={handlePosterSelect}
								shared={item.astronaut.id === sharedTransition.astronautId}
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

<style>
	:global(.crew-rail.crew-rail-dragging),
	:global(.crew-rail.crew-rail-dragging *) {
		cursor: grabbing !important;
		user-select: none;
	}
</style>
