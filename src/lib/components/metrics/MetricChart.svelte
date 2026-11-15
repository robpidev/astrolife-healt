<script lang="ts">
	let { title = 'Evolución de las mediciones' }: { title?: string } = $props();
</script>

<section class="rounded-xl border border-cyan-200/10 bg-[#081322] p-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h3 class="text-xs font-medium text-slate-200">
			{title}
		</h3>
		<span class="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-500">
			Sin registros
		</span>
	</div>
	<div class="relative mt-5">
		<svg viewBox="0 0 420 150" class="h-36 w-full" preserveAspectRatio="none" aria-hidden="true">
			<path d="M22 5v125h390" fill="none" stroke="#334155" stroke-opacity="0.5" />
			<path
				d="M22 30h390M22 55h390M22 80h390M22 105h390M80 5v125M145 5v125M210 5v125M275 5v125M340 5v125M405 5v125"
				fill="none"
				stroke="#67e8f9"
				stroke-opacity="0.06"
				stroke-dasharray="3 4"
			/>
		</svg>
		<div class="absolute inset-0 flex flex-col items-center justify-center gap-2">
			<span class="text-xs text-slate-400">
				Sin datos para mostrar
			</span>
			<span class="text-xs text-slate-600">
				La evolución aparecerá con las primeras mediciones.
			</span>
		</div>
	</div>
	<p class="text-right text-xs text-slate-600">
		Fecha de medición
	</p>
</section>
