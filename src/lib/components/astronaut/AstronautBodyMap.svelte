<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { BodyMapVitals, BrainState } from '#lib/interfaces/body-map.js';
	import { brainState } from '#lib/utils/body-map.js';

	let { vitals }: { vitals: BodyMapVitals } = $props();

	let brain: BrainState = $derived(brainState(vitals));
	let toneDot: string = $derived(
		{
			green: 'bg-emerald-400',
			yellow: 'bg-amber-400',
			red: 'bg-rose-500',
			unknown: 'bg-violet-400'
		}[brain.tone]
	);

	let brainLabel = $derived(
		brain.tone === 'unknown' ? 'Brain · no mental data' : `Brain · ${brain.label.toLowerCase()}`
	);
	let brainSummary = $derived(brain.summary);

	// --- Rotation: the accessible slider stays the source of truth ------------
	let rotation = $state(0);

	let angle = $derived(((Math.round(rotation) % 360) + 360) % 360);
	let view = $derived(angle >= 90 && angle < 270 ? 'Back' : 'Front');

	function rotate(degrees: number): void {
		rotation += degrees;
	}

	function keyboardRotate(event: KeyboardEvent): void {
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			rotate(-15);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			rotate(15);
		} else if (event.key === 'Home') {
			event.preventDefault();
			rotation = 0;
		} else if (event.key === 'End') {
			event.preventDefault();
			rotation = 180;
		}
	}

	// OrbitControls reports the camera azimuth back; unwrap it to the nearest
	// equivalent so the slider value stays continuous across the ±180° seam.
	function handleSceneRotate(degrees: number): void {
		const delta = ((((degrees - rotation + 180) % 360) + 360) % 360) - 180;
		rotation += delta;
	}

	// --- Brain hotspot & tooltip ---------------------------------------------
	// Hover and pin are separate: click only toggles the pin, so the focus that
	// a click produces can no longer open and immediately close the tooltip.
	let hovered = $state(false);
	let pinned = $state(false);
	let tooltipOpen = $derived(hovered || pinned);

	function closeTooltip(): void {
		pinned = false;
	}

	// Touch also fires pointerenter/leave, so hover only applies to a mouse;
	// touch relies on the click toggle instead.
	function hoverTooltip(event: PointerEvent): void {
		if (event.pointerType === 'mouse') hovered = true;
	}

	function unhoverTooltip(event: PointerEvent): void {
		if (event.pointerType === 'mouse') hovered = false;
	}

	// The first tap pins the tooltip and the next one closes it, so the hotspot
	// never traps a mobile user.
	function toggleTooltip(): void {
		pinned = !pinned;
	}

	// Arrow keys belong to the body slider; the hotspot is a sibling of it, so
	// the only key it needs is Escape to dismiss a pinned tooltip.
	function closeOnEscape(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.stopPropagation();
			pinned = false;
		}
	}

	// --- WebGL scene, loaded lazily ------------------------------------------
	type Scene = Awaited<typeof import('#lib/components/astronaut/anatomy/scene.js')>;
	type SceneHandle = ReturnType<Scene['createBodyMapScene']>;

	let rendererState = $state<'pending' | 'ready' | 'unavailable'>('pending');
	// Raw state: the handle is an imperative object, and making it reactive lets
	// the sync effects below run again as soon as the scene exists.
	let sceneHandle = $state.raw<SceneHandle | null>(null);
	// Reactive: the media query can change while the scene is mounted, and the
	// effect below only re-runs when it is state.
	let reducedMotion = $state(false);

	function applyRotation(degrees: number): void {
		sceneHandle?.setRotation(degrees);
	}

	$effect(() => {
		applyRotation(rotation);
	});

	$effect(() => {
		sceneHandle?.setBrain(brain);
	});

	$effect(() => {
		sceneHandle?.setHeartRate(vitals.heart_rate);
	});

	$effect(() => {
		sceneHandle?.setReducedMotion(reducedMotion);
	});

	const attachScene: Attachment<HTMLCanvasElement> = (node) => {
		let disposed = false;
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = media.matches;
		const onMotionChange = (): void => {
			reducedMotion = media.matches;
		};
		media.addEventListener('change', onMotionChange);

		let lost = false;
		const interactiveElement =
			node.closest<HTMLElement>('[data-body-map]')?.querySelector<HTMLElement>('[role="slider"]') ??
			node;

		function boot(): void {
			if (disposed || lost) return;

			void import('#lib/components/astronaut/anatomy/scene.js')
				.then(({ createBodyMapScene }) => {
					// The import can finish after the context was lost or the node was
					// removed; creating a renderer then would throw or leak.
					if (disposed || lost) return;

					sceneHandle = createBodyMapScene(node, {
						brain,
						heartRate: vitals.heart_rate,
						reducedMotion,
						interactiveElement,
						onRotate: handleSceneRotate
					});
					// The effects may have run while the import was in flight.
					sceneHandle.setBrain(brain);
					sceneHandle.setHeartRate(vitals.heart_rate);
					sceneHandle.setReducedMotion(reducedMotion);
					sceneHandle.setRotation(rotation);
					rendererState = 'ready';
				})
				.catch(() => {
					rendererState = 'unavailable';
				});
		}

		const onLost = (event: Event): void => {
			// The default action lets the browser try to restore the context; the
			// figure falls back to the SVG in the meantime.
			event.preventDefault();
			lost = true;
			sceneHandle?.destroy();
			sceneHandle = null;
			rendererState = 'unavailable';
		};
		const onRestored = (): void => {
			lost = false;
			boot();
		};
		node.addEventListener('webglcontextlost', onLost);
		node.addEventListener('webglcontextrestored', onRestored);

		boot();

		return () => {
			disposed = true;
			media.removeEventListener('change', onMotionChange);
			node.removeEventListener('webglcontextlost', onLost);
			node.removeEventListener('webglcontextrestored', onRestored);
			sceneHandle?.destroy();
			sceneHandle = null;
		};
	};
</script>

{#snippet figure(isBack: boolean)}
	<svg
		viewBox="0 0 180 420"
		class="h-full w-full text-cyan-200 drop-shadow-[0_0_8px_#22d3ee55]"
		fill="none"
		stroke="currentColor"
		stroke-width="0.85"
		aria-hidden="true"
	>
		<path
			d="M90 10c-15 0-22 10-22 26 0 10 3 20 9 26l1 12-20 7c-10 4-15 9-18 21L27 174l-9 61c-1 8 4 12 8 8l9-19 10-45 11-37 2 49-5 38 6 60 6 84-5 19c-2 7 0 9 8 8l16-4 4-18-1-79 3-48 3 48-1 79 4 18 16 4c8 1 10-1 8-8l-5-19 6-84 6-60-5-38 2-49 11 37 10 45 9 19c4 4 9 0 8-8l-9-61-13-72c-3-12-8-17-18-21l-20-7 1-12c6-6 9-16 9-26 0-16-7-26-22-26Z"
			fill="#22d3ee"
			fill-opacity="0.08"
			stroke-opacity="0.85"
		/>
		{#if isBack}
			<!-- Back view: a simplified spine, shoulder blades, and muscle groups. -->
			<path
				d="M78 66q12 6 24 0M90 75v162M90 239l-7 29 7 26 7-26-7-29M58 88q32 9 64 0M59 99l23 42 8-14 8 14 23-42M59 99l9 49 22 23 22-23 9-49M90 170v62M60 177q30 15 60 0M61 194q29 18 58 0M60 219q30 20 60 0M68 250q14 8 22 7 8 1 22-7M75 270l-5 83M105 270l5 83M60 117l-20 61M120 117l20 61M75 19q15-6 30 0"
				stroke-opacity="0.45"
			/>
			<path
				d="M64 104l24 17-12 25-16-15ZM116 104l-24 17 12 25 16-15Z"
				fill="#22d3ee"
				fill-opacity="0.13"
				stroke-opacity="0.55"
			/>
			<path
				d="M90 90v170"
				stroke="#67e8f9"
				stroke-width="1.6"
				stroke-dasharray="4 5"
				stroke-opacity="0.65"
			/>
			<path d="M78 159q12 4 24 0M76 184q14 6 28 0M73 205q17 6 34 0" stroke-opacity="0.25" />
		{:else}
			<!-- Front view: a schematic chest, heart, torso, and limb landmarks. -->
			<path
				d="M77 62q13 8 26 0M78 74l12 9 12-9M58 89q32 14 64 0M90 84v109M56 142l12-42M124 142l-12-42M59 191q31 15 62 0M57 221q15 15 33 14 18 1 33-14M65 244l9 52-1 67M115 244l-9 52 1 67M43 114l-9 61-7 51M137 114l9 61 7 51"
				stroke-opacity="0.4"
			/>
			<path
				d="M82 102c-9-9-16 2-18 14l-3 26q8 9 22 1l2-26ZM98 102c9-9 16 2 18 14l3 26q-8 9-22 1l-2-26Z"
				fill="#22d3ee"
				fill-opacity="0.06"
				stroke-opacity="0.5"
			/>
			<path
				d="M90 125c-7-9-15 0-9 8l10 12 10-13c4-7-3-13-11-7Z"
				fill="#22d3ee"
				fill-opacity="0.45"
				stroke="#67e8f9"
				stroke-width="1.3"
			/>
			<path
				d="M65 108q25 8 50 0M63 118q27 8 54 0M62 129q10 5 18 4M102 133l16-4M62 140l16 5M104 145l14-5M66 151q24 9 48 0M70 163q20 8 40 0M72 175q18 6 36 0M74 188v25l16 12 16-12v-25"
				stroke-opacity="0.28"
			/>
			<path d="M78 21q12-8 24 0M75 37l8 2M97 39l8-2M84 50h12M90 28v18" stroke-opacity="0.25" />
		{/if}
		<g stroke-opacity="0.65" fill="#0b2738">
			<circle cx="47" cy="107" r="5" />
			<circle cx="133" cy="107" r="5" />
			<circle cx="34" cy="177" r="4" />
			<circle cx="146" cy="177" r="4" />
			<circle cx="73" cy="294" r="5" />
			<circle cx="107" cy="294" r="5" />
			<circle cx="72" cy="367" r="3" />
			<circle cx="108" cy="367" r="3" />
		</g>
		<path
			d="M14 112h15M151 112h15M13 212h20M147 212h20M15 309h30M135 309h30"
			stroke-opacity="0.2"
		/>
	</svg>
{/snippet}

<section class="min-w-0 text-center" aria-label="Rotatable illustrative body map">
	<div class="mb-1 flex items-center justify-center gap-2">
		<p class="text-xs tracking-[0.2em] text-cyan-200/70 uppercase">Body map</p>
		<span
			class="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-medium text-cyan-100"
			>{view} view</span
		>
	</div>
	<!-- Two siblings: the slider owns rotation, the hotspot owns the brain
	status. Nesting a button inside role="slider" hides it from screen readers. -->
	<div data-body-map class="relative mx-auto h-42 w-34 sm:h-54 sm:w-36 xl:h-[340px] xl:w-40">
		<!-- Accessible rotation control. OrbitControls listens here, so dragging
		the sidebar box turns the camera just like the demo. -->
		<div
			class="absolute inset-0 cursor-grab touch-none outline-none select-none focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 active:cursor-grabbing"
			role="slider"
			tabindex="0"
			aria-label="Rotate body map left or right"
			aria-valuemin="0"
			aria-valuemax="359"
			aria-valuenow={angle}
			aria-valuetext={`${view} view, ${angle} degrees`}
			onkeydown={keyboardRotate}
		></div>

		<!-- The stage deliberately overflows the sidebar and sits behind the
		page content. It is pointer-transparent so only the slider and the
		hotspot receive gestures. -->
		<div
			class="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[480px] w-[320px] -translate-x-1/2 -translate-y-[62%] sm:h-[620px] sm:w-[420px] xl:h-[800px] xl:w-[560px]"
		>
			<canvas
				{@attach attachScene}
				class="h-full w-full"
				class:invisible={rendererState !== 'ready'}
				aria-hidden="true"
			></canvas>
			{#if rendererState !== 'ready'}
				<!-- The fallback crossfades instead of rotating: a JS-driven angle
				cannot become a Tailwind class, and an inline transform would break
				the "no inline styles" rule. It is only ever a stopgap until WebGL
				takes over. -->
				<div class="relative h-full w-full">
					<div
						class="absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none {view ===
						'Front'
							? 'opacity-100'
							: 'opacity-0'}"
					>
						{@render figure(false)}
					</div>
					<div
						class="absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none {view ===
						'Back'
							? 'opacity-100'
							: 'opacity-0'}"
					>
						{@render figure(true)}
					</div>
				</div>
			{/if}
		</div>

		<!-- Hotspot layer: same box as the stage, but above it so the button
		stays clickable while the canvas is behind the page content. -->
		<div
			class="pointer-events-none absolute top-1/2 left-1/2 h-[480px] w-[320px] -translate-x-1/2 -translate-y-[62%] sm:h-[620px] sm:w-[420px] xl:h-[800px] xl:w-[560px]"
		>
			<!-- The brain lives at the same relative height on every breakpoint. -->
			<button
				type="button"
				class="pointer-events-auto absolute top-[24%] left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-cyan-300"
				aria-describedby="brain-status"
				aria-label="Brain status"
				onpointerenter={hoverTooltip}
				onpointerleave={unhoverTooltip}
				onblur={closeTooltip}
				onclick={toggleTooltip}
				onkeydown={closeOnEscape}
			>
				<span
					class="size-3 rounded-full border border-white/70 {toneDot} {tooltipOpen
						? 'shadow-[0_0_10px_2px_rgb(255_255_255/0.45)]'
						: ''}"
				></span>
			</button>
			{#if tooltipOpen}
				<span
					role="tooltip"
					class="pointer-events-none absolute top-[calc(24%+1.75rem)] left-1/2 z-20 w-max max-w-[190px] -translate-x-1/2 rounded-lg border border-cyan-200/25 bg-[#0b1729] px-2.5 py-1.5 text-[11px] leading-snug text-slate-200 shadow-xl shadow-black/40"
				>
					<span class="font-semibold text-cyan-100">{brainLabel}</span>
					<span class="block text-slate-400">{brainSummary}</span>
				</span>
			{/if}
		</div>
		<!-- Kept in the DOM so screen readers describe the hotspot even when the
		visual tooltip is closed. -->
		<p id="brain-status" class="sr-only">{brainLabel}. {brainSummary}.</p>
	</div>
</section>
