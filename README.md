# Sector Selection App

A small full-stack application for selecting one or more business sectors and saving the selection for the current browser session. The form is built with Angular, while Laravel provides the API, validation, persistence, and session handling.

## Database dump

The assignment asks for a full dump of structure and data. [`backend/database/dump.sql`](backend/database/dump.sql) is a plain `sqlite3 .dump` holding the schema and all 79 sectors:

```bash
cd backend
sqlite3 database/database.sqlite < database/dump.sql
```

It deliberately contains no `sessions` or `submissions` rows — those are per-visitor runtime data, and session IDs are the credential that identifies a visitor. Loading it gives the same starting state as `php artisan migrate:fresh --seed`. Regenerate it after a schema change with `sqlite3 database/database.sqlite .dump > database/dump.sql`.

## Technology stack

- Angular 22 with standalone components, signals, and reactive forms
- Bootstrap 5 CSS, English and Estonian interface translations
- Laravel 13
- SQLite
- Pest for backend tests
- Vitest through Angular's test runner for frontend tests

## Requirements

- PHP 8.3 or newer with the SQLite extension
- Composer 2
- Node.js 24.15 or newer (also pinned in `.nvmrc` and `frontend/package.json`)
- npm 11 (the exact package-manager version is pinned in `frontend/package.json`)

## Local setup

Two terminals. Backend:

```bash
cd backend
composer setup   # installs, creates .env and the SQLite file, migrates, seeds
composer dev     # serves on http://127.0.0.1:8000
```

Frontend:

```bash
cd frontend
npm ci
npm start
```

Open `http://localhost:4200`.

To rebuild the local database later, `php artisan migrate:fresh --seed` — this deletes existing submissions.

### Why the dev server proxies `/api`

Angular serves on `localhost:4200` and Laravel on `127.0.0.1:8000`. A browser treats those as two different **origins** (scheme + host + port), and it restricts what one origin may do to another: cross-origin requests need CORS headers, and cookies need extra opt-ins on both ends to travel at all.

That matters here because Laravel's session cookie is the only thing identifying a visitor, and its `XSRF-TOKEN` cookie is what authorises a save. If the browser withholds them, nothing works.

`frontend/proxy.conf.json` makes the Angular dev server forward `/api` to Laravel, so the browser only ever talks to `localhost:4200` and both cookies are sent automatically. It also means Angular requests relative paths like `/api/sectors` with no backend host anywhere in the code — nothing to configure per environment, and no risk of shipping a development URL to production, where the web server routes `/api` the same way.

## Using the application

1. Enter a name.
2. Expand the categories or filter by a name or full category path, then check one or more leaf sectors. Sectors with children are navigation-only categories.
3. Agree to the terms.
4. Select **Save**.

The language selector at the top of the card switches the interface between English and Estonian at any point, including validation messages already on screen.

The first save creates a submission for the current Laravel session. Further saves update that same submission. Reloading the page during the session refills the form with the stored data; another browser session cannot access it.

## Running checks

```bash
cd frontend
npm test -- --watch=false
npm run build          # output in frontend/dist/frontend/browser

cd ../backend
php artisan test --compact
```

## API

| Method | Endpoint          | Purpose                                                      |
| ------ | ----------------- | ------------------------------------------------------------ |
| `GET`  | `/api/sectors`    | Return the sectors and their parent relationships            |
| `GET`  | `/api/submission` | Return the current session's submission, or `204 No Content` |
| `POST` | `/api/submission` | Create or update the current session's submission            |

The submission request body has this shape:

```json
{
  "name": "Ada Lovelace",
  "sector_ids": [19, 342],
  "agreed_to_terms": true
}
```

Laravel requires a name of at most 255 characters, at least one distinct existing leaf-sector ID, and acceptance of the terms. Invalid requests receive a `422 Unprocessable Content` response with validation errors.

## Design decisions

### Sectors

- **Hierarchy via a self-referencing `parent_id`,** not indentation baked into names. The supplied option IDs stay as primary keys, and Angular derives the nesting and breadcrumb paths, so no presentation detail lives in the database.
- **Siblings sort alphabetically at each level.** This reproduces the supplied ordering exactly, so no `sort_order` column is needed.
- **Only leaf sectors are selectable.** Sectors with children are navigation-only headings. Selections stay independent — no cascade, no tri-state. Laravel enforces the same rule, and the form drops any stored category ID when refilling.
- **Native controls rather than a UI library.** The selector is checkboxes, buttons, nested lists, and a scroll area. A native `<select multiple>` needs undiscoverable Ctrl-click and behaves poorly on mobile; a third-party tree would add a second design system and an emulated ARIA tree in place of controls browsers already handle correctly.

### Backend

- **Session identity, no authentication.** "The user's own data during the session" is the session cookie. `updateOrCreate` keyed on the session ID keeps at most one submission per session, so a single `POST /api/submission` covers both create and edit.
- **Many-to-many through `sector_submission`.** Keeps the data normalised and lets a submission hold any number of sectors.
- **API routes prepend the `web` middleware group** — `$middleware->api(prepend: 'web')`. Sanctum's `statefulApi()` was used first, but it applies session middleware *conditionally*, only when `Origin` or `Referer` matches a configured domain; any other caller reached `$request->session()` with no session and got a `500` instead of a `419`. Prepending makes the dependency unconditional and declared. Sanctum then had no role left — no tokens, no guards, no auth — so it was removed.
- **Trimmed framework defaults.** With no auth, the `users` and `password_reset_tokens` tables, the `User` model, and `config/auth.php` are gone, and the framework migration was reduced to the `sessions` table alone. The cache and queue migrations were dropped in favour of the file cache and synchronous queue.

### Frontend

- **Reactive forms and signals.** The parent owns the `FormControl`, server errors, and save lifecycle; the standalone tree selector takes sectors and selected IDs as inputs and emits ordered ID arrays. A typed API service keeps HTTP out of the components.
- **Bootstrap as CSS only.** Responsive layout, form, and validation styling without pulling in JavaScript components or a second design system.
- **Accessibility is built on native semantics.** Labels are associated and hints and errors are wired through `aria-describedby`. Where a native element already carries the meaning, it is used instead of the ARIA attribute that would declare it: `fieldset`/`legend` groups the sectors rather than `role="group"` with `aria-labelledby`, `<output>` carries the save and loading status rather than `role="status"`, and the selector is semantic nested lists rather than an emulated ARIA tree. A failed submit moves focus to the first invalid control.
- **Nothing is disabled while saving.** The save button is marked `aria-disabled`, and a guard in the submit handler is what actually blocks a second request. Setting `disabled` on the element the user has just activated moves focus to `<body>`, costing a keyboard user their place — a real, lasting change traded against a window too short to click twice in. The fields stay editable for the same reason: a request that resolves in milliseconds is not something a user can type into.

### Language

- **One dictionary per language, read through a signal.** `frontend/src/app/i18n/translations.ts` holds the `en` and `et` objects; switching re-renders every string at once. That includes validation messages already on screen, because the error table names a dictionary key rather than holding a sentence.
- **A missing translation is a build error.** The Estonian dictionary is typed as `typeof en`, so an omitted or misspelled key fails `npm run build` rather than rendering blank at runtime.
- **Counts are interpolated by small functions, not an ICU message format.** Estonian takes the partitive singular after a number — "1 sektor" but "3 sektorit" — so the distinction is real, but two languages do not justify a message-format parser.
- **Localisation crosses the network boundary.** An interceptor sends the chosen language as `Accept-Language`, since the browser's own header describes the browser rather than the switcher, and `SetLocale` maps it to a Laravel locale. A `422` therefore arrives in the language the page is showing.
- **`lang/` holds overrides only.** Laravel registers its own translations as a second lang path and merges the application's file over them, so `lang/en/validation.php` contains just the four field names this application invents rather than a copy of the framework's catalogue. `lang/et/validation.php` covers the ten rules actually in use; anything else resolves through `fallback_locale`.
- **Sector names stay in English,** including in the Estonian filter placeholder, because they come from the database. Translating them is a schema change, not a dictionary key.

### Scope

- **Same-origin deployment.** Session and CSRF cookies are the entire identity mechanism, so both applications are expected under one public origin, with the web server routing `/api/*` to Laravel. Cross-origin access is not a supported deployment model.
- **Production hardening is deliberately partial.** Rate limiting is enabled (60 requests per minute per IP, via the file cache) and sessions expire after 120 idle minutes with Laravel's cleanup lottery. What is missing, and why, is listed under [What I would do differently for a real product](#what-i-would-do-differently-for-a-real-product).

## What I would do differently for a real product

This is a demonstration, so some concerns are shown rather than built out. Each omission below was a decision, and this is what reversing it would take.

### Would build

- **End-to-end tests.** Both sides are covered separately, but nothing drives a real browser against a real Laravel session. Playwright against the production build and a seeded database would cover the save, reload, and edit cycle — the one path that actually depends on both halves agreeing.
- **A CI pipeline.** Pint, Pest, Vitest, and the production build on every push, with the bundle budget failing the build rather than printing a warning nobody reads.
- **Error monitoring.** Failures currently collapse into a "please try again" message, which is right for the user and useless for the developer. Sentry or equivalent on both sides.
- **Scheduled session pruning.** Sessions are database-backed and expire after 120 idle minutes, but rely on Laravel's cleanup lottery. A scheduled `session:prune`, and Redis rather than SQLite, would suit a real deployment.

### Would build differently

- **The sector selector as a `ControlValueAccessor`,** so `formControlName="sector_ids"` replaces the manual value and change wiring. The interface costs more boilerplate than the parent wiring it removes, which is not worth paying for a single consumer.
- **Namespaced element IDs in the selector.** `sector-filter` and its siblings are fixed strings, so two instances on one page would collide. A generated per-instance prefix is the fix, and it buys nothing while exactly one instance exists.
- **A more forgiving filter.** It matches a lowercased substring of the full path, so "manufacturing wood" does not find "Manufacturing › Wood". Folding diacritics and matching terms in any order would fix that; all 79 sector names are ASCII English, so neither earns its complexity yet.
- **Build-time translation.** Angular's `$localize` extracts messages and emits one bundle per locale, so a user downloads only their own language. It also means a build artefact per locale and an extraction step in CI — disproportionate for two languages and one form, and the dictionaries would move to a translation-management service anyway once non-developers own the copy.
- **Translated sector names,** via a table keyed by sector and locale, joined at read time.

### Would need a product decision first

- **Accounts.** "The user's own data during the session" is the assignment's boundary, and the session cookie is the whole identity mechanism. Real ownership means authentication, and the session cookie stops being sufficient the moment a user expects their data on a second device.
- **Analytics and cookie consent.** Nothing tracks the user, which is precisely why there is no consent banner. Adding either forces the other.
- **Remembering the language,** in `localStorage` or a cookie, and negotiating the first-visit language from the browser instead of defaulting to English.
- **Retranslating server validation messages.** A `422` arrives in the language it was requested in, so a message already on screen keeps that language if the user switches afterwards. Returning message keys instead of sentences would fix it, at the cost of duplicating Laravel's catalogue in the client — the wrong trade for a state reachable only when client validation passes and the server still rejects.

## Project structure

```text
sector-selection-app/
├── backend/     Laravel API, database migrations, seed data, and Pest tests
├── frontend/    Angular application and Vitest tests
└── README.md
```
