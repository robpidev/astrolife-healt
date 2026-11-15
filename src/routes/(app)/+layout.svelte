<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let onMeasurements = $derived(page.url.pathname.startsWith('/mediciones'));
</script>

<div class="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
	<header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
		<div
			class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
		>
			<a
				href={resolve('/(crew)')}
				class="flex items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:outline-none"
				aria-label="Astrolife, go to crew"
			>
				<span
					class="grid size-9 place-items-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-600/20"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="size-5"
						aria-hidden="true"
					>
						<path d="M2.5 12h3.4l2.1-5.6 3.6 11.2 2.4-6.6 1.5 1h5" />
					</svg>
				</span>
				<span class="flex flex-col leading-none">
					<span class="text-base font-semibold tracking-tight text-slate-900">Astrolife</span>
					<span class="mt-1 text-xs font-medium text-slate-500">Control center</span>
				</span>
			</a>

			<nav aria-label="Main navigation">
				<ul class="flex items-center gap-1">
					<li>
						<a
							href={resolve('/(crew)')}
							class="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:outline-none"
						>
							Crew
						</a>
					</li>
					<li>
						<a
							href={resolve('/(app)/mediciones')}
							aria-current={onMeasurements ? 'page' : undefined}
							class="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:outline-none {onMeasurements
								? 'bg-teal-50 text-teal-700'
								: 'text-slate-600 hover:bg-slate-100'}"
						>
							Measurements
						</a>
					</li>
				</ul>
			</nav>
		</div>
	</header>

	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
		{@render children()}
	</main>

	<footer class="border-t border-slate-200/70">
		<div class="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-slate-500 sm:px-6 lg:px-8">
			Astrolife · Crew control center
		</div>
	</footer>
</div>
