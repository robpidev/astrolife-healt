// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			/** `true` while the request belongs to a demo session. */
			demo: boolean;
		}
	}
}

export {};
