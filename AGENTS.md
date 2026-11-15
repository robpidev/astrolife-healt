# AGENTS.md - Astrolife

## 1. Overview

Astrolife is a personal health-monitoring web app. It is a single SvelteKit
project: UI, server routes, form actions, and a local SQLite database. There is
no separate API, backend service, or mobile app.

## 2. Stack

| Area            | Choice                                                                         |
| --------------- | ------------------------------------------------------------------------------ |
| Framework       | SvelteKit 3 (config lives in `vite.config.ts`; no `svelte.config.js`)          |
| UI              | Svelte 5 with runes forced for `src/`                                          |
| Language        | TypeScript, `strict: true`                                                     |
| Styles          | Tailwind CSS 4 (`src/routes/layout.css`) with `forms` and `typography` plugins |
| Database        | SQLite via `node:sqlite` (`DatabaseSync`); works on Bun 1.4 and Node 24        |
| Tests           | Vitest, Node only (single `server` project); no browser tests                  |
| Deploy          | `@sveltejs/adapter-vercel`                                                     |
| Package manager | bun                                                                            |

## 3. Code Conventions

### Files and folders

- Components: `PascalCase.svelte` (e.g. `MeasurementForm.svelte`).
- Routes: `kebab-case` folders (e.g. `src/routes/mediciones`).
- Server modules: `kebab-case.ts` under `src/lib/server/`.
- Interfaces: one file per entity in `src/lib/interfaces/`, `kebab-case.ts`.
- Pure helpers: `kebab-case.ts` under `src/lib/utils/`.

### TypeScript

- Native types (`string`, `number`, `boolean`), never `any`.
- Variables and functions in `camelCase`.
- Database and domain fields in `snake_case` (`mass_kg`, `measured_at`).
- Optionals as `| null`, not `undefined`, for persisted/domain data.
- Interfaces in `PascalCase`; enums in `PascalCase` with `PascalCase` members.
- Prefer `interface` for object shapes; explicit return types on exported functions.

### Svelte

- Runes only: `$props`, `$state`, `$derived`, `$effect`, `$bindable`.
- Never use legacy stores, `$:` reactivity, or `<slot />`.
- Destructure props: `let { data, form } = $props();`.
- Snippets for children: `{#snippet children()}`.
- Use `$derived` for computed values instead of functions called in markup.
- Always cover loading, error, and empty states.
- Accessibility: semantic HTML, labels tied to inputs, visible focus, ARIA only
  when semantics are not enough, keyboard navigation, `alt` text.

### Mutations and data loading

- Page data comes from `+page.server.ts` `load`, typed with `PageServerLoad`.
- Mutations use form actions (`Actions`) with `<form method="POST">` and
  `use:enhance`. Do not use `fetch` for mutations.
- Return validation errors with `fail(400, { values, errors })`.
- Reload data after a successful action by calling `invalidateAll()` inside the
  `use:enhance` callback.
- Redirect after login/logout style flows with `redirect(303, ...)`.
- Never expose secrets or JWT-like values to the client.

### Styles

- Tailwind utility classes in markup; no inline `style` attributes.
- Design tokens and base styles live in `src/routes/layout.css`.
- Use responsive and dark-mode-capable classes from the start.
- Keep a single visual language: cards, badges, alerts, tables, and form fields
  should reuse the same class combinations.

### Language

- All code, configuration, and UI copy in English: identifiers, types, comments,
  config keys, file names, scripts, and user-facing text.
- Persisted domain values that are part of the data contract (for example
  `CrewStatus` values) keep their current values.
- Comments explain the **why** behind non-obvious decisions, never restate code.

## 4. Project Structure

```text
src/
├── app.html
├── app.d.ts
├── lib/
│   ├── assets/
│   ├── components/          # Shared UI (PascalCase.svelte)
│   ├── interfaces/          # Types, one kebab-case file per entity
│   ├── server/              # Server-only: DB, validation, queries
│   │   ├── db.ts
│   │   ├── measurements.ts
│   │   └── validation.ts
│   └── utils/               # Pure helpers (bmi, dates, forms)
└── routes/
    ├── +layout.svelte
    ├── +page.svelte
    └── mediciones/
        ├── +page.server.ts
        ├── +page.svelte
        └── MeasurementForm.svelte
data/                        # SQLite file, gitignored
```

## 5. Data Access

- Only `src/lib/server/**` may import `node:sqlite`. Never import it (or the DB
  module) from client code or from a `+page.svelte`.
- `src/lib/server/db.ts` opens `data/astrolife.db` (or `DATABASE_PATH`) lazily on
  first query, creates the directory, enables WAL, and initializes the schema
  idempotently. Laziness keeps builds from creating `data/`.
- Queries use prepared statements; no string interpolation of user input.
- Validation is pure and testable (`src/lib/server/validation.ts`) and returns
  `{ values, errors }`, where `errors` maps field name to an English message.
- Any schema change is a contract: state column, type, nullability, default, and
  `CHECK` constraints before implementing. Existing data must keep working.

## 6. Orchestration

| Work                                           | Owner                                                          |
| ---------------------------------------------- | -------------------------------------------------------------- |
| Planning, server routes, DB, validation, tests | `astrolife-lead`                                               |
| Any `.svelte` or `.svelte.ts` file             | `svelte-file-editor` (installed subagent)                      |
| Codebase reconnaissance                        | `explore` (installed subagent)                                 |
| Multi-step non-Svelte work                     | `general` (installed subagent)                                 |
| Independent review                             | `astrolife-reviewer`                                           |
| Visual design / UI polish                      | `frontend-design`, `ui-design`, `web-design-guidelines` skills |

- Use the Svelte MCP server for documentation and the autofixer for every
  `.svelte`/`.svelte.ts` file.
- Do not let two agents edit the same file. Sequence shared files.
- `astrolife-reviewer` is required for DB, form-action, and cross-cutting UI
  changes. Skip it only for docs and copy.
- Do not commit or push unless the user asks.

## 7. Rules for AI Agents

1. Use Svelte 5 runes. Do not use legacy stores, `$:`, or slots.
2. Destructure props with `$props()`; do not use `export let`.
3. Use `$derived` for computed values and `$bindable` for two-way component props.
4. Handle loading, error, and empty states in every data-driven view.
5. Mutations go through form actions with `use:enhance`; no manual mutation fetch.
6. Use `fail()` for validation and `redirect()` for navigation after success.
7. Never import `src/lib/server/**` or `node:sqlite` from client code.
8. Use prepared statements and validated numeric inputs for every query.
9. Keep DB field names in `snake_case` and match them in interfaces.
10. No `any`; define interfaces and reuse them between server and UI types.
11. No new dependencies without asking the user first.
12. Styles use Tailwind classes; no inline styles.
13. All code, configuration, and UI text in English.
14. Comments explain the why, not the what.
15. Use `#lib/` imports with the `.js` extension for TS modules (e.g.
    `#lib/server/db.js`), not long relative paths. SvelteKit 3 removed `$lib`.
16. Meet the accessibility rules in section 3.
17. Verify with `bun run check` and a smoke test of the changed flow. Skip the
    full test suite during the hackathon unless the user asks or the change is
    risky (DB schema, form actions).

## 8. Verification

Hackathon mode: fast feedback over exhaustive coverage.

```bash
bun run check   # svelte-kit sync + svelte-check (required)
bun run lint    # prettier --check + eslint (when touching many files)
```

Smoke-test the changed flow in the browser (submit, reload, confirm persistence)
before reporting. Run the tests (`bun run test:unit -- --run`) only when the user
asks or for risky changes (DB schema, form actions). There is no browser test
project, so the suite starts no Chromium. Run `bun run build` before deploying.

Report the commands run and their results. Never claim a check passed without
seeing the output. Separate new failures from pre-existing ones.

## 9. Skills

- `astrolife-patterns` — SQLite access, form actions, validation checklist, and
  CRUD workflow. Load when implementing server or data features.
- `svelte-code-writer`, `svelte-core-bestpractices` — installed Svelte guidance.
- `frontend-design`, `ui-design`, `web-design-guidelines` — installed design
  guidance for UI work.

## 10. Svelte MCP

You have access to the Svelte MCP server with Svelte 5 and SvelteKit docs.

### list-sections

Use it first to discover documentation sections. When asked about Svelte or
SvelteKit topics, always start here.

### get-documentation

Retrieves full documentation for one or more sections. After listing sections,
fetch every section relevant to the task.

### svelte-autofixer

Analyzes Svelte code and returns issues and suggestions. Use it whenever writing
Svelte code, and keep calling it until it returns no issues.

### playground-link

Generates a Svelte Playground link from a snippet. Only after the user confirms,
and never when the code was written to the project.
