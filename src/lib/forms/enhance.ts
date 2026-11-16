import { enhance as kitEnhance } from '$app/forms';
import type { ActionResult, SubmitFunction } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import { appendDemoDelta } from '#lib/demo/demo-store.js';
import { isDemoMode } from '#lib/demo/mode.js';

export type { SubmitFunction } from '$app/forms';

/** The demo has no server action, so every submit resolves locally. */
function demoResult(location: string): ActionResult {
	return {
		type: 'success',
		status: 200,
		data: { success: true, message: 'Saved in demo mode.' },
		location
	};
}

/**
 * Only the heart-rate entry mutates the snapshot. Other demo forms still
 * resolve successfully so the UI never shows a network error.
 */
function recordReading(action: URL, formData: FormData): void {
	if (!action.pathname.endsWith('/cardiovascular/heart-rate')) return;

	const match = /\/crew\/(\d+)\//.exec(action.pathname);
	const raw = formData.get('heart_rate');
	if (!match || typeof raw !== 'string') return;

	const astronautId = Number(match[1]);
	const value = Number(raw);
	if (!Number.isSafeInteger(astronautId) || !Number.isFinite(value)) return;

	appendDemoDelta({
		kind: 'reading',
		astronaut_id: astronautId,
		metric_code: 'heart_rate',
		value,
		measured_at: new Date().toISOString()
	});
}

/**
 * Drop-in replacement for `$app/forms`'s `enhance`. Outside the demo it is the
 * original action, so the real app keeps its server actions untouched.
 */
export function enhance<
	Success extends Record<string, unknown> | undefined,
	Failure extends Record<string, unknown> | undefined
>(form: HTMLFormElement, submit?: SubmitFunction<Success, Failure>) {
	if (!isDemoMode()) return kitEnhance(form, submit);

	let controller: AbortController | null = null;

	const handleSubmit = (event: SubmitEvent): void => {
		event.preventDefault();

		controller?.abort();
		const current = new AbortController();
		controller = current;

		const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;
		const formData = new FormData(form, submitter);
		const action = new URL(form.action);

		void (async () => {
			let cancelled = false;
			const callback = await submit?.({
				action,
				formData,
				formElement: form,
				controller: current,
				submitter,
				cancel: () => {
					cancelled = true;
				}
			});

			if (cancelled || typeof callback !== 'function' || current.signal.aborted) return;

			recordReading(action, formData);

			await callback({
				formData,
				formElement: form,
				action,
				result: demoResult(action.pathname + action.search) as ActionResult<Success, Failure>,
				update: async () => {
					await invalidateAll();
				}
			});
		})();
	};

	form.addEventListener('submit', handleSubmit);

	return {
		destroy() {
			form.removeEventListener('submit', handleSubmit);
			controller?.abort();
		}
	};
}
