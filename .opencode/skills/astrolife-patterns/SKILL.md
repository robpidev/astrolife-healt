---
name: astrolife-patterns
description: Use when implementing Astrolife data features — SQLite access with node:sqlite, schema initialization, prepared statements, measurement validation, form actions with fail/redirect/enhance/invalidateAll, BMI calculations, CRUD checklists, and verification. Load for any change under src/lib/server or src/routes/*/+page.server.ts.
---

# Astrolife Patterns

Details for server and data work. `AGENTS.md` holds the always-loaded rules;
this file holds templates and the CRUD workflow.

## Database module

The connection is a process-wide singleton, opened lazily on first query.
Global caching keeps a single connection across Vite HMR reloads, and laziness
prevents `data/` from being created when SvelteKit imports server modules during
a build.

```typescript
// src/lib/server/db.ts
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const globalForDb = globalThis as unknown as { __astrolifeDb?: DatabaseSync };

function createDatabase(): DatabaseSync {
	const file = process.env.DATABASE_PATH ?? 'data/astrolife.db';
	const path = file === ':memory:' ? file : resolve(process.cwd(), file);

	if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

	const db = new DatabaseSync(path);
	db.exec('PRAGMA journal_mode = WAL;');
	db.exec('PRAGMA foreign_keys = ON;');
	db.exec(`CREATE TABLE IF NOT EXISTS ...`);
	return db;
}

export function getDb(): DatabaseSync {
	if (!globalForDb.__astrolifeDb) {
		globalForDb.__astrolifeDb = createDatabase();
	}

	return globalForDb.__astrolifeDb;
}
```

Rules:

- `#lib/server/**` only. Never import it from a `.svelte` file or `+page.ts`
  that runs in the browser.
- `CREATE TABLE IF NOT EXISTS` plus an explicit schema contract. For column
  changes, prefer additive migrations guarded by `PRAGMA table_info` checks; do
  not drop user data.
- Always use positional (`?`) or named (`:name`) prepared parameters. Never
  build SQL by interpolating user input.
- Numbers from forms are validated before they reach the DB.
- `run()` returns `{ changes, lastInsertRowid }`; coerce `bigint` with `Number()`.

## Typed queries

```typescript
// src/lib/server/measurements.ts
import type { StatementSync } from 'node:sqlite';
import { getDb } from '#lib/server/db.js';
import type { Measurement, MeasurementInput } from '#lib/interfaces/measurement.js';

interface MeasurementRow {
	id: number;
	measured_at: string;
	mass_kg: number;
	height_cm: number;
	systolic: number | null;
	diastolic: number | null;
	pulse: number | null;
	notes: string | null;
	created_at: string;
}

let statements: { list: StatementSync } | null = null;

function getStatements() {
	if (!statements) {
		statements = {
			list: getDb().prepare(
				`SELECT id, measured_at, mass_kg, height_cm, systolic, diastolic, pulse, notes, created_at
				 FROM measurements
				 ORDER BY measured_at DESC, id DESC`
			)
		};
	}

	return statements;
}

export function listMeasurements(): Measurement[] {
	return getStatements().list.all() as unknown as MeasurementRow[];
}
```

Keep SQL column order identical to the row interface and map explicitly when the
shapes differ. Export narrow functions (`list`, `get`, `create`, `update`,
`delete`) instead of exposing the connection.

## Validation

```typescript
// src/lib/server/validation.ts
export interface MeasurementFormValues {
	measured_at: string;
	mass_kg: string;
	height_cm: string;
	systolic: string;
	diastolic: string;
	pulse: string;
	notes: string;
}

export type MeasurementErrors = Partial<Record<keyof MeasurementFormValues, string>>;

export function parseMeasurementForm(form: FormData): {
	values: MeasurementFormValues;
	errors: MeasurementErrors;
	data: MeasurementInput | null;
};
```

Rules:

- Read every field with `String(form.get('field') ?? '').trim()`.
- Return the raw `values` so the form can be repopulated after `fail(400)`.
- Accept comma as decimal separator: `value.replace(',', '.')` before `Number`.
- Validate ranges, optional pairs (systolic + diastolic together), and
  cross-field rules (systolic > diastolic).
- Messages in English. Field keys match the input `name` attributes.
- Compute "today" with local time, not `toISOString()`, when rejecting future dates.

## Form actions

```typescript
// src/routes/mediciones/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createMeasurement, listMeasurements } from '#lib/server/measurements.js';
import { parseMeasurementForm } from '#lib/server/validation.js';

export const load: PageServerLoad = () => ({ measurements: listMeasurements() });

export const actions: Actions = {
	create: async ({ request }) => {
		const result = parseMeasurementForm(await request.formData());
		if (!result.data) return fail(400, { values: result.values, errors: result.errors });

		createMeasurement(result.data);
		return { success: true, message: 'Medición guardada' };
	}
};
```

- Named actions are invoked with `action="?/create"`.
- Include an `action` discriminator (`create`, `update`, `delete`) in every
  payload so the UI can scope errors to the right form.
- On success, call `await update()` and then `await invalidateAll()` in the
  enhance callback. Do not mix success payloads with `redirect` unless the flow
  should leave the page.
- Parse and validate `id` with `Number.parseInt` and reject non-positive values.
- Delete actions must confirm in the UI. Inside `use:enhance`, call `cancel()`
  instead of `event.preventDefault()` in `onsubmit`.

```svelte
<form
	method="POST"
	action="?/create"
	use:enhance={() => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success') await invalidateAll();
		};
	}}
>
	<!-- fields -->
</form>
```

## BMI

```typescript
export function calculateBmi(massKg: number, heightCm: number): number {
	return Math.round((massKg / (heightCm / 100) ** 2) * 10) / 10;
}
```

Categories: `< 18.5` bajo peso, `18.5–24.9` normal, `25–29.9` sobrepeso, `>= 30`
obesidad. Return a label and a tone (`low`, `normal`, `high`, `obese`) instead of
hardcoding colors in the page.

## CRUD checklist

1. Contract: table columns, types, nullability, defaults, checks.
2. Interface in `src/lib/interfaces/<entity>.ts` with `snake_case` fields.
3. `db.ts` schema initialization, idempotent.
4. Query module with prepared statements and typed returns.
5. Pure validation module with ranges and cross-field rules.
6. `+page.server.ts`: `load` + named actions (`create`, `update`, `delete`).
7. Delegate `+page.svelte` and form components to `svelte-file-editor`.
8. UI covers: loading/submitting, field errors, empty state, success feedback.
9. Tests for validation and pure helpers; DB tests use `DATABASE_PATH=:memory:`.
10. Verify: `bun run check`, `bun run lint`, server tests
    (`bun run test:unit -- --run --project server`), then `bun run build`.

## Commands

```bash
bun run dev          # dev server
bun run check        # svelte-kit sync + svelte-check
bun run check:watch  # watch mode
bun run lint         # prettier --check + eslint
bun run format       # prettier write
bun run test:unit -- --run --project server  # server tests (no Playwright)
bun run test:unit    # vitest watch
bun run build        # production build
```

**Precedence rule:** if a template here conflicts with the real code, the real
code wins. Update this skill when you find a divergence.
