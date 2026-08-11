# Sector Selection App

A small full-stack application for selecting one or more business sectors and saving the selection for the current browser session. The form is built with Angular, while Laravel provides the API, validation, persistence, and session handling.

## Assignment materials

The original specification, the supplied legacy form, and the one-off script used to extract the sector data are kept in [`reference/`](reference/). None of it runs at runtime.

## Database dump

The assignment asks for a full dump of structure and data. [`backend/database/dump.sql`](backend/database/dump.sql) is a plain `sqlite3 .dump` holding the schema and all 79 sectors:

```bash
cd backend
sqlite3 database/database.sqlite < database/dump.sql
```

It deliberately contains no `sessions` or `submissions` rows — those are per-visitor runtime data, and session IDs are the credential that identifies a visitor. Loading it gives the same starting state as `php artisan migrate:fresh --seed`. Regenerate it after a schema change with `sqlite3 database/database.sqlite .dump > database/dump.sql`.

## Technology stack

- Angular 22 with standalone components, signals, and reactive forms
- Bootstrap 5 CSS
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
- **Accessibility is built on native semantics.** Labels are associated, hints and errors are wired through `aria-describedby`, focus moves to the first invalid control on a failed submit and back to the save button once a save settles, and result counts are announced politely. The selector uses semantic nested lists rather than an emulated ARIA tree.

### Scope

- **Same-origin deployment.** Session and CSRF cookies are the entire identity mechanism, so both applications are expected under one public origin, with the web server routing `/api/*` to Laravel. Cross-origin access is not a supported deployment model.
- **Production hardening is deliberately partial.** Rate limiting is enabled (60 requests per minute per IP, via the file cache) and sessions expire after 120 idle minutes with Laravel's cleanup lottery. Tuning those limits and scheduling session pruning are deployment concerns rather than parts of this assignment.

## Project structure

```text
sector-selection-app/
├── backend/     Laravel API, database migrations, seed data, and Pest tests
├── frontend/    Angular application and Vitest tests
├── reference/   Original assignment, legacy form, and extraction script
└── README.md
```
