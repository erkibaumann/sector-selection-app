# Sector Selection App

A small full-stack application for selecting one or more business sectors and saving the selection for the current browser session. The form is built with Angular, while Laravel provides the API, validation, persistence, and session handling.

## Assignment materials

The original task materials and the one-off extraction script used while preparing the sector seed data are retained for reference:

- [Assignment specification](reference/assignment.md)
- [Original legacy form](reference/index%20(1).html)
- [Sector extraction script](reference/extract_sectors.py)

The extraction script documents how the supplied sector options were converted into structured data. It is not used by the application at runtime.

## Technology stack

- Angular 21 with standalone components, signals, and reactive forms
- Bootstrap 5 CSS
- Laravel 13
- SQLite
- Pest for backend tests
- Vitest through Angular's test runner for frontend tests

## Requirements

- PHP 8.3 or newer with the SQLite extension
- Composer 2
- Node.js supported by Angular 21
- npm 11 or a compatible npm version

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

```bash
cd frontend
npm ci
npm start
```

Open `http://localhost:4200` in a browser.

The Angular development server proxies `/api` requests to Laravel. This keeps requests same-origin in the browser and allows Laravel's session and CSRF cookies to work without hardcoded backend URLs in the Angular application.

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
| `GET` | `/api/csrf-cookie` | Initialize Laravel's CSRF protection before saving |

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

### Submission storage

Submissions and sectors have a many-to-many relationship through the `sector_submission` pivot table. This keeps the data normalized and allows each submission to contain multiple sectors.

No user accounts or authentication flow are needed for this assignment. Laravel's session ID identifies the submission, and `updateOrCreate` ensures there is at most one submission per session. The same `POST` endpoint therefore handles both initial saves and later edits.

### Session identity and CSRF

Because the session cookie is the only thing identifying a visitor, every API route must run Laravel's session middleware. The API routes therefore prepend the `web` middleware group in `bootstrap/app.php`:

```php
$middleware->api(prepend: 'web');
```

This project initially used Laravel Sanctum's `statefulApi()` helper instead. That helper applies the session and CSRF middleware **conditionally** — only when a request's `Origin` or `Referer` header matches a configured stateful domain. Any other caller reached the controller with no session at all, and `$request->session()` then threw `Session store not set on request`, turning a well-formed request into a `500`. That failure was invisible in development, where the Angular proxy always sends a matching `Origin`, and it would have surfaced in production as a total outage the first time the deployment hostname was missing from the stateful-domain list.

Prepending the group makes the dependency unconditional and declared rather than inferred from request headers. A request without a CSRF token now receives a `419`, which is the correct answer, instead of a `500`.

With that in place Sanctum had no remaining role — this application has no tokens, no guards, and no authentication — so the package was removed and its single useful route replaced by `GET /api/csrf-cookie`. Angular's built-in XSRF interceptor reads the `XSRF-TOKEN` cookie and sends it back as an `X-XSRF-TOKEN` header, which is exactly what Laravel validates.

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
