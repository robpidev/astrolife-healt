import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { navigating as routerNavigating } from '$app/state';
import { tick } from 'svelte';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { DEMO_ASTRONAUT_ID } from './mock-data.js';
import './tour.css';

const REPO_URL = 'https://github.com/robpidev/astrolife-healt';
const PROGRESS_KEY = 'astrolife-demo-tour';
const SELECTOR_TIMEOUT = 5000;

interface TourStep {
	/** Route the step lives on. */
	path: string;
	/** `data-tour` selector; empty for a centered step. */
	selector: string;
	title: string;
	description: string;
	/** Turns the step into an action step that waits for the user. */
	instruction?: string;
	advanceOn?: 'click' | 'submit';
	side?: 'top' | 'right' | 'bottom' | 'left';
	align?: 'start' | 'center' | 'end';
}

interface SavedProgress {
	index: number;
	path: string;
	savedAt: number;
}

const id = DEMO_ASTRONAUT_ID;
const base = `/crew/${id}`;

const steps: TourStep[] = [
	{
		path: '/',
		selector: '[data-tour="crew-roster"]',
		title: 'Your crew',
		description: 'Every astronaut on the mission, with their level, streak and tasks for the day.'
	},
	{
		path: '/',
		selector: `[data-tour="crew-poster-${id}"]`,
		title: 'Open a profile',
		description: 'The selected poster opens the astronaut profile.',
		instruction: 'Click the highlighted poster to open the profile.',
		advanceOn: 'click',
		side: 'right'
	},
	{
		path: base,
		selector: '[data-tour="summary-vitals"]',
		title: 'Mission status',
		description: 'The four key vitals, each with a trend sparkline and a link to its detail page.'
	},
	{
		path: base,
		selector: '[data-tour="measurements-link"]',
		title: 'Record a measurement',
		description: 'Measurements are grouped by health area.',
		instruction: 'Click “Record measurement” to open the health areas.',
		advanceOn: 'click'
	},
	{
		path: `${base}/measurements`,
		selector: '[data-tour="measurement-areas"]',
		title: 'Five health areas',
		description: 'Cardiovascular, muscular, mental, radiation and general health.'
	},
	{
		path: `${base}/measurements`,
		selector: '[data-tour="area-card-cardiovascular"]',
		title: 'Cardiovascular',
		description: 'Each area groups the indicators it monitors.',
		instruction: 'Open the Cardiovascular area.',
		advanceOn: 'click'
	},
	{
		path: `${base}/measurements/cardiovascular`,
		selector: '[data-tour="area-metrics"]',
		title: 'Area indicators',
		description: 'Every card shows the latest value, its status and a sparkline.'
	},
	{
		path: `${base}/measurements/cardiovascular`,
		selector: '[data-tour="metric-card-heart-rate"]',
		title: 'Heart rate',
		description: 'Open an indicator to see its full history.',
		instruction: 'Open the heart-rate detail.',
		advanceOn: 'click'
	},
	{
		path: `${base}/measurements/cardiovascular/heart-rate`,
		selector: '[data-tour="metric-chart"]',
		title: 'Trend chart',
		description: 'The series is coloured by the status of the latest reading.'
	},
	{
		path: `${base}/measurements/cardiovascular/heart-rate`,
		selector: '[data-tour="add-reading"]',
		title: 'Add a reading',
		description: 'Manual readings sit next to sensor data.',
		instruction: 'Click “Add reading” to open the entry dialog.',
		advanceOn: 'click'
	},
	{
		path: `${base}/measurements/cardiovascular/heart-rate`,
		selector: '[data-tour="entry-dialog"]',
		title: 'Enter a value',
		description: 'The dialog validates the range before saving.',
		instruction: 'Type a heart rate and press “Save reading”.',
		advanceOn: 'submit',
		side: 'top'
	},
	{
		path: `${base}/measurements/cardiovascular/heart-rate`,
		selector: '[data-tour="metric-history"]',
		title: 'History',
		description: 'Every reading is listed with its source and timestamp.'
	},
	{
		path: `${base}/measurements/cardiovascular/heart-rate`,
		selector: '[data-tour="area-link-radiation"]',
		title: 'Radiation',
		description: 'The sidebar switches between health areas.',
		instruction: 'Open the Radiation area.',
		advanceOn: 'click'
	},
	{
		path: `${base}/measurements/radiation`,
		selector: '[data-tour="radiation-summary"]',
		title: 'Radiation limits',
		description: 'Career, GCR and organ limits with the current dose and status.'
	},
	{
		path: `${base}/medical`,
		selector: '[data-tour="medical-dossier"]',
		title: 'Medical dossier',
		description: 'Allergies, medications, evaluations and the initial physical condition.'
	},
	{
		path: `${base}/medical`,
		selector: '',
		title: 'You are all set',
		description: 'This is the same app, running on realistic demo data. Try it with your crew.'
	}
];

let driverObj: Driver | null = null;
let navigating = false;

function prefersReducedMotion(): boolean {
	return (
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

function saveProgress(index: number): void {
	try {
		const progress: SavedProgress = {
			index,
			path: steps[index]?.path ?? '/',
			savedAt: Date.now()
		};
		sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
	} catch {
		// Private mode can reject storage; the tour still works without resume.
	}
}

function clearProgress(): void {
	try {
		sessionStorage.removeItem(PROGRESS_KEY);
	} catch {
		// Ignore storage failures.
	}
}

function waitForSelector(selector: string, timeout = SELECTOR_TIMEOUT): Promise<boolean> {
	if (!selector) return Promise.resolve(true);

	return new Promise((resolve) => {
		const started = Date.now();
		const check = () => {
			if (document.querySelector(selector)) {
				resolve(true);
				return;
			}
			if (Date.now() - started >= timeout) {
				resolve(false);
				return;
			}
			window.setTimeout(check, 50);
		};
		check();
	});
}

/** Resolves a tour path against the deployment base (e.g. GitHub Pages). */
function pathFor(path: string): string {
	return path === '/' ? resolve('/(crew)') : resolve(path.slice(1) as `crew/${string}`);
}

/**
 * A click-driven step can highlight its next element before SvelteKit has
 * finished the navigation that rendered it. Starting another `goto` in that
 * window aborts the first one, so wait for the router to settle.
 */
async function waitForRouter(): Promise<void> {
	// Require the router to stay idle briefly: a click-driven step can surface
	// the next step before SvelteKit has started the navigation behind it.
	for (let attempt = 0; attempt < 200; attempt += 1) {
		if (!routerNavigating.to) {
			await new Promise((resolve) => setTimeout(resolve, 50));
			if (!routerNavigating.to) return;
		}
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
}

async function navigateAndResume(path: string, selector: string, index: number): Promise<void> {
	navigating = true;
	driverObj?.destroy();
	driverObj = null;

	// Inlined instead of `pathFor(path)` so the lint rule can see the `resolve` call.
	const target = path === '/' ? resolve('/(crew)') : resolve(path.slice(1) as `crew/${string}`);

	// A superseded navigation is harmless: the route the user clicked is still
	// loading, so retry once the router settles.
	for (let attempt = 0; ; attempt += 1) {
		await waitForRouter();
		try {
			await goto(target);
			break;
		} catch (error) {
			if (!(error instanceof Error) || error.message !== 'navigation aborted' || attempt >= 2) {
				throw error;
			}
		}
	}

	await tick();
	await waitForSelector(selector);

	navigating = false;
	startTour(index);
}

function addSkipButton(popover: { footerButtons: HTMLElement }): void {
	if (popover.footerButtons.querySelector('.astrolife-tour-skip')) return;

	const skip = document.createElement('button');
	skip.type = 'button';
	skip.className = 'astrolife-tour-skip';
	skip.textContent = 'Skip';
	skip.addEventListener('click', () => driverObj?.destroy());
	popover.footerButtons.prepend(skip);
}

async function advance(index: number): Promise<void> {
	const next = steps[index + 1];
	if (!next) {
		driverObj?.destroy();
		return;
	}

	if (next.path === steps[index].path) {
		driverObj?.moveNext();
		return;
	}

	await navigateAndResume(next.path, next.selector, index + 1);
}

async function retreat(index: number): Promise<void> {
	const previous = steps[index - 1];
	if (!previous) return;

	if (previous.path === steps[index].path) {
		driverObj?.movePrevious();
		return;
	}

	await navigateAndResume(previous.path, previous.selector, index - 1);
}

function isTypingTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable ||
			target.closest('input, textarea, select, [role="textbox"]') !== null)
	);
}

/**
 * driver.js ignores the arrow keys on the very first step, so the tour owns
 * them. Capture phase keeps driver's own handler from moving twice.
 */
function handleTourKey(event: KeyboardEvent): void {
	if (!driverObj || navigating) return;
	if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
	if (event.altKey || event.ctrlKey || event.metaKey) return;
	if (isTypingTarget(event.target)) return;

	const index = driverObj.getActiveIndex();
	if (index === undefined) return;

	event.preventDefault();
	event.stopImmediatePropagation();

	if (event.key === 'ArrowRight') {
		// Action steps wait for the real click or submit.
		if (!steps[index].advanceOn) void advance(index);
	} else {
		void retreat(index);
	}
}

function swallowTourKey(event: KeyboardEvent): void {
	if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
	if (isTypingTarget(event.target)) return;

	event.stopImmediatePropagation();
}

let removeKeyListeners: (() => void) | null = null;

function bindKeyboard(): void {
	removeKeyListeners?.();
	window.addEventListener('keydown', handleTourKey, true);
	window.addEventListener('keyup', swallowTourKey, true);
	removeKeyListeners = () => {
		window.removeEventListener('keydown', handleTourKey, true);
		window.removeEventListener('keyup', swallowTourKey, true);
		removeKeyListeners = null;
	};
}

/** Starts (or resumes) the tour at `startIndex`. */
export function startTour(startIndex = 0): void {
	if (typeof window === 'undefined') return;

	driverObj?.destroy();
	const reduced = prefersReducedMotion();

	driverObj = driver({
		animate: !reduced,
		duration: reduced ? 0 : 300,
		overlayColor: '#020617',
		overlayOpacity: 0.62,
		stagePadding: 8,
		stageRadius: 12,
		allowKeyboardControl: true,
		showProgress: true,
		progressText: '{{current}} of {{total}}',
		showButtons: ['next', 'previous', 'close'],
		nextBtnText: 'Next',
		prevBtnText: 'Previous',
		doneBtnText: 'Try the app',
		popoverClass: 'astrolife-tour',
		steps: steps.map((step) => ({
			element: step.selector || undefined,
			waitForElement: SELECTOR_TIMEOUT,
			advanceOn: step.advanceOn,
			popover: {
				title: step.title,
				description: step.description,
				instruction: step.instruction,
				side: step.side,
				align: step.align,
				onPopoverRender: addSkipButton,
				onDoneClick:
					step === steps.at(-1)
						? () => {
								window.open(REPO_URL, '_blank', 'noopener,noreferrer');
								driverObj?.destroy();
							}
						: undefined
			}
		})),
		onHighlighted: (_element, _step, opts) => {
			if (opts.index !== undefined) saveProgress(opts.index);
		},
		onNextClick: async (_element, _step, opts) => {
			await advance(opts.index ?? 0);
		},
		onPrevClick: async (_element, _step, opts) => {
			await retreat(opts.index ?? 0);
		},
		onDestroyed: () => {
			removeKeyListeners?.();
			driverObj = null;
			if (!navigating) clearProgress();
		}
	});

	bindKeyboard();
	driverObj.drive(startIndex);
}

/** Resumes a tour interrupted by a full page load, if it is still fresh. */
export function resumeTour(): boolean {
	if (typeof window === 'undefined') return false;

	try {
		const raw = sessionStorage.getItem(PROGRESS_KEY);
		if (!raw) return false;

		const saved = JSON.parse(raw) as SavedProgress;
		const fresh = Date.now() - saved.savedAt < 5 * 60 * 1000;
		if (!fresh || pathFor(saved.path) !== window.location.pathname) return false;

		startTour(saved.index);
		return true;
	} catch {
		return false;
	}
}

export function stopTour(): void {
	driverObj?.destroy();
	driverObj = null;
	clearProgress();
}

/** Starts at the step that belongs to `pathname`, or at the first step. */
export function startTourForPath(pathname: string): void {
	const index = steps.findIndex((step) => pathFor(step.path) === pathname);
	if (index >= 0) {
		startTour(index);
		return;
	}

	// The toolbar can start the tour from any page; bring the visitor to the
	// first step instead of highlighting an element that is not there.
	void navigateAndResume(steps[0].path, steps[0].selector, 0);
}
