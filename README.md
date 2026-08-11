# Sector Selection App

A small full-stack application for selecting one or more business sectors and saving the selection for the current browser session. The form is built with Angular, while Laravel provides the API, validation, persistence, and session handling.

## Assignment materials

The original task materials and the one-off extraction script used while preparing the sector seed data are retained for reference:

- [Assignment specification](reference/assignment.md)
- [Original legacy form](reference/index%20(1).html)
- [Sector extraction script](reference/extract_sectors.py)

The extraction script documents how the supplied sector options were converted into structured data. It is not used by the application at runtime.

## Database dump

The assignment asks for a full database dump with both structure and data. It lives at [`backend/database/dump.sql`](backend/database/dump.sql) and is a plain `sqlite3 .dump`, so it can be read as a schema reference or loaded directly:

```bash
cd backend
sqlite3 database/database.sqlite < database/dump.sql
```

The dump contains the complete schema and all 79 supplied sectors. It deliberately contains **no** `sessions` or `submissions` rows: those are per-visitor runtime data rather than reference data, and session IDs are the credential that identifies a visitor, so shipping them in a file meant to document the schema would be wrong on both counts. Loading the dump gives the same starting state as `php artisan migrate:fresh --seed`.

To regenerate it after a schema change:

```bash
cd backend
php artisan migrate:fresh --seed
sqlite3 database/database.sqlite .dump > database/dump.sql
```

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

### 1. Start the backend

From the repository root:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php -r "file_exists('database/database.sqlite') || touch('database/database.sqlite');"
php artisan migrate --seed
php artisan serve
```

Laravel will run at `http://127.0.0.1:8000` by default. Keep this terminal running.

The seed command loads all 79 supplied sectors. To rebuild the local database later, run:

```bash
php artisan migrate:fresh --seed
```

This command deletes existing local submissions before recreating the tables.

### 2. Start the frontend

Open another terminal at the repository root:

If you use nvm, run `nvm use` to select the repository's pinned Node.js version. Then start Angular:

```bash
cd frontend
npm ci
npm start
```

Open `http://localhost:4200` in a browser.

The Angular development server proxies `/api` requests to Laravel. This keeps requests same-origin in the browser and allows Laravel's session and CSRF cookies to work without hardcoded backend URLs in the Angular application.

The application is intentionally designed for same-origin deployment; cross-origin API access is not part of its supported deployment model.

## Using the application

1. Enter a name.
2. Select one or more sectors. Hold Command on macOS or Control on Windows to select multiple entries.
3. Agree to the terms.
4. Select **Save**.

The first save creates a submission for the current Laravel session. Further saves update that same submission. Reloading the page during the session refills the form with the stored data; another browser session cannot access it.

## Running checks

Run the frontend tests and production build:

```bash
cd frontend
npm test -- --watch=false
npm run build
```

Run the backend test suite:

```bash
cd backend
php artisan test --compact
```

The Angular production files are written to `frontend/dist/frontend/browser`.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/sectors` | Return the sectors and their parent relationships |
| `GET` | `/api/submission` | Return the current session's submission, or `204 No Content` |
| `POST` | `/api/submission` | Create or update the current session's submission |

The submission request body has this shape:

```json
{
  "name": "Ada Lovelace",
  "sector_ids": [1, 19],
  "agreed_to_terms": true
}
```

Laravel requires a name of at most 255 characters, at least one distinct existing sector ID, and acceptance of the terms. Invalid requests receive a `422 Unprocessable Content` response with validation errors.

## Design decisions

### Sector hierarchy

Sectors use a self-referencing `parent_id` instead of storing indentation in their names. The original sector IDs are retained as primary keys. Angular constructs the hierarchy from the parent relationships and renders the indentation, keeping presentation details out of the database.

Sibling sectors are sorted alphabetically at each level. This reproduces the supplied ordering without adding a separate sort column.

The rendered `<option>` labels still use non-breaking spaces for indentation, as the original file did. That is a deliberate limit rather than a leftover: browsers do not reliably apply `padding` or `text-indent` inside an `<option>`, so non-breaking spaces are the only indentation that renders consistently. The difference from the original is where the indentation comes from — Angular derives it from each sector's depth at render time, instead of it being stored in the sector names.

The native multi-select is retained because the assignment explicitly asks for a sectors selectbox. This preserves native platform behavior and fidelity to the supplied form, with the tradeoff that hierarchy is conveyed visually rather than exposed as nested semantic structure.

### Submission storage

Submissions and sectors have a many-to-many relationship through the `sector_submission` pivot table. This keeps the data normalized and allows each submission to contain multiple sectors.

No user accounts or authentication flow are needed for this assignment. Laravel's session ID identifies the submission, and `updateOrCreate` ensures there is at most one submission per session. The same `POST` endpoint therefore handles both initial saves and later edits.

Because there is no authentication, Laravel's default `users` and `password_reset_tokens` tables were removed along with the `User` model, its factory, and `config/auth.php`. The framework's default migration creates `sessions` in the same file, so that migration was reduced to the session table alone rather than deleted. Its `user_id` column is kept because Laravel's database session handler writes that column whenever an authentication guard is bound, which it always is. The unused cache and queue migrations were also removed: this small application uses the file cache and synchronous queue defaults, so it does not need database tables or a queue worker.

### Session identity and CSRF

Because the session cookie is the only thing identifying a visitor, every API route must run Laravel's session middleware. The API routes therefore prepend the `web` middleware group in `bootstrap/app.php`:

```php
$middleware->api(prepend: 'web');
```

This project initially used Laravel Sanctum's `statefulApi()` helper instead. That helper applies the session and CSRF middleware **conditionally** — only when a request's `Origin` or `Referer` header matches a configured stateful domain. Any other caller reached the controller with no session at all, and `$request->session()` then threw `Session store not set on request`, turning a well-formed request into a `500`. That failure was invisible in development, where the Angular proxy always sends a matching `Origin`, and it would have surfaced in production as a total outage the first time the deployment hostname was missing from the stateful-domain list.

Prepending the group makes the dependency unconditional and declared rather than inferred from request headers. A request without a CSRF token now receives a `419`, which is the correct answer, instead of a `500`.

With that in place Sanctum had no remaining role — this application has no tokens, no guards, and no authentication — so the package was removed. The initial API requests for the sectors and current submission establish the session and `XSRF-TOKEN` cookies. Angular's built-in XSRF interceptor sends that token back as an `X-XSRF-TOKEN` header on the save request, which is exactly what Laravel validates. No separate CSRF initialization request is needed.

### Production hardening scope

Laravel's API rate limiter uses Laravel's file cache and allows 60 requests per minute per IP address. A production deployment should tune that limit to its traffic and operational requirements. A scheduled session-pruning job remains out of scope for this local technical assignment. Laravel's standard session expiry remains enabled here: database sessions expire after 120 idle minutes and expired rows are swept opportunistically by the framework's session-cleanup lottery.

### Frontend structure

The Angular component uses a reactive form so validation and form state are explicit. Signals represent loading, saving, success, and error states, while a typed API service keeps HTTP code separate from the form component.

Bootstrap is included as CSS only. It provides consistent responsive layout, form, validation, and feedback styling without adding JavaScript components or another application-level abstraction.

### Accessibility

Form controls have associated labels, help and error text is connected with `aria-describedby`, invalid controls receive visible feedback, and save results use an `output` element. The form remains keyboard-operable and uses the native multi-select control.

## Project structure

```text
sector-selection-app/
├── backend/     Laravel API, database migrations, seed data, and Pest tests
├── frontend/    Angular application and Vitest tests
├── reference/   Original assignment, legacy form, and extraction script
└── README.md
```

## Deployment notes

Build Angular with `npm run build` and serve the generated files as static assets. Serve Laravel from its `backend/public` directory, and configure the web server so `/api/*` reaches Laravel while frontend routes reach Angular.

Keeping both applications under one public origin is the simplest deployment arrangement because the application relies on Laravel's session and CSRF cookies. Production environment values, HTTPS, and the chosen database should be configured on the deployment platform; Laravel's development server is not intended for production use.
