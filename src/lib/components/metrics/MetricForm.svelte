<script lang="ts">
	let { label, unit = '' }: { label: string; unit?: string } = $props();
</script>

<section class="rounded-2xl border border-white/10 bg-white/5 p-6">
	<h2 class="font-semibold text-white">
		Registrar medición
	</h2>
	<p id="metric-form-note" class="mt-2 text-sm text-slate-400">
		Formulario en preparación. El registro aún no está disponible.
	</p>
	<fieldset disabled aria-describedby="metric-form-note" class="mt-4 space-y-3 opacity-60">
		<label class="block text-sm" for="metric-value">
			{label} {unit ? '(' + unit + ')' : ''}
		</label>
		<input
			id="metric-value"
			type="number"
			class="w-full rounded-lg border-white/10 bg-slate-900 text-white"
		/>
		<button
			type="button"
			class="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950"
		>
			Guardar medición
		</button>
	</fieldset>
</section>
