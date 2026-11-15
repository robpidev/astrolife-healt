<script lang="ts">
	let rotation = $state(0);
	let dragging = $state(false);
	let pointerStart = 0;
	let rotationStart = 0;

	let angle = $derived(((Math.round(rotation) % 360) + 360) % 360);
	let view = $derived(angle >= 90 && angle < 270 ? 'Back' : 'Front');

	function rotate(degrees: number): void {
		rotation += degrees;
	}

	function resetFront(): void {
		rotation += angle <= 180 ? -angle : 360 - angle;
	}

	function startDrag(event: PointerEvent): void {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		const target = event.currentTarget as HTMLDivElement;
		pointerStart = event.clientX;
		rotationStart = rotation;
		dragging = true;
		target.setPointerCapture(event.pointerId);
	}

	function continueDrag(event: PointerEvent): void {
		if (!dragging) return;
		rotation = rotationStart + (event.clientX - pointerStart) * 0.9;
	}

	function stopDrag(): void {
		dragging = false;
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
	<div
		class="relative mx-auto h-42 w-34 cursor-grab touch-none outline-none select-none [perspective:800px] focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 active:cursor-grabbing sm:h-54 sm:w-36 xl:h-[340px] xl:w-40"
		role="slider"
		tabindex="0"
		aria-label="Rotate body map left or right"
		aria-valuemin="0"
		aria-valuemax="359"
		aria-valuenow={angle}
		aria-valuetext={`${view} view, ${angle} degrees`}
		onpointerdown={startDrag}
		onpointermove={continueDrag}
		onpointerup={stopDrag}
		onpointercancel={stopDrag}
		onlostpointercapture={stopDrag}
		onkeydown={keyboardRotate}
	>
		<div
			class:transition-transform={!dragging}
			class="relative h-full w-full duration-200 ease-out [transform-style:preserve-3d]"
			style:transform={`rotateY(${rotation}deg)`}
		>
			<div class="absolute inset-0 [backface-visibility:hidden]">
				{@render figure(false)}
			</div>
			<div class="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
				{@render figure(true)}
			</div>
		</div>
	</div>
	<div class="mt-1 flex items-center justify-center gap-2">
		<button
			type="button"
			onclick={() => rotate(-45)}
			aria-label="Rotate body map left"
			class="grid size-10 touch-manipulation place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/5 text-lg text-cyan-200 transition hover:bg-cyan-300/15 focus-visible:outline-2 focus-visible:outline-cyan-300"
			>↶</button
		>
		<button
			type="button"
			onclick={resetFront}
			class="min-h-10 touch-manipulation rounded-lg border border-cyan-300/20 bg-cyan-300/5 px-3 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-300/15 focus-visible:outline-2 focus-visible:outline-cyan-300"
			>Reset front</button
		>
		<button
			type="button"
			onclick={() => rotate(45)}
			aria-label="Rotate body map right"
			class="grid size-10 touch-manipulation place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/5 text-lg text-cyan-200 transition hover:bg-cyan-300/15 focus-visible:outline-2 focus-visible:outline-cyan-300"
			>↷</button
		>
	</div>
	<p class="mt-2 text-[11px] leading-tight text-slate-500">
		Drag to rotate · Use ← → keys · Illustrative only
	</p>
</section>
