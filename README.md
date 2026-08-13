# Sector Selection

A small full-stack application for selecting business sectors. It stores one submission per browser
session and lets the user edit that submission until the session ends.

This repository is a technical assignment. It demonstrates an accessible Angular form backed by a
Laravel API and PostgreSQL database.

## At a glance

- Angular renders the form, sector hierarchy, validation, and English or Estonian interface.
- Laravel validates requests and stores each submission against its session ID.
- PostgreSQL stores the 79 supplied sectors as a parent-child hierarchy.
- Native HTML controls provide the core keyboard and screen-reader behaviour.

## Technology stack

- Angular 22 with standalone components, signals, and reactive forms
- Bootstrap 5 CSS
- Laravel 13
- PostgreSQL 18
- Pest for backend tests
- Vitest through Angular's test runner for frontend tests

## Prerequisites

- Docker with Compose for the included PostgreSQL database
- PHP 8.4 or newer with the PostgreSQL PDO driver, and Composer
- Node.js and npm; the tested Node.js version is recorded in `.nvmrc`

Composer and npm install the exact application dependencies from their lock files. The setup
commands stop with a direct error if Docker, the PHP database driver, or a compatible runtime is
missing.

## Local setup

Use two terminals.

### 1. Start the backend

```bash
cd backend
docker compose up -d --wait
composer setup
composer dev
```

These commands start PostgreSQL 18, install the PHP dependencies, create `backend/.env`, run the
migrations, seed all 79 sectors, and serve the API at `http://127.0.0.1:8000`.

### 2. Start the frontend

```bash
cd frontend
npm ci
npm start
```

### 3. Open the application

Open `http://localhost:4200`.

To rebuild the local database later, run this command from `backend/`:

```bash
php artisan migrate:fresh --seed
```

This command deletes all existing submissions.

### The database port

The PostgreSQL container publishes host port **15432**. The `DB_PORT` value in `backend/.env`
controls this port for both Laravel and `compose.yaml`.

After changing `DB_PORT`, run `docker compose up -d` again to publish the new port.

## Using the application

1. Enter a name.
2. Expand the categories or filter by a sector name or full category path.
3. Select one or more leaf sectors. Categories that contain sectors are navigation only.
4. Agree to the terms.
5. Select **Save**.

The language selector switches the interface between English and Estonian. It also updates
validation messages that are already visible.

The first save creates a submission for the current Laravel session. Later saves update the same
submission. Reloading the page restores the saved data while that session remains active. Another
browser session cannot access it.

## Running checks

```bash
cd frontend
npm test -- --watch=false
npm run build          # output in frontend/dist/frontend/browser

cd ../backend
docker compose up -d --wait   # the Pest suite runs against PostgreSQL
php artisan test --compact
```

Tests use a separate `sector_selection_test` database on the same PostgreSQL server. The test suite
creates it automatically on the first run and never touches development data.

## Database dump

The assignment requires a complete database dump. The dump is in
[`backend/database/dump.sql`](backend/database/dump.sql). It contains the schema and all 79 sectors.

Local setup does not use the dump. The `composer setup` command creates and seeds the database.

The dump deliberately excludes `sessions` and `submissions`. These tables contain per-visitor
runtime data, and a session ID identifies its visitor. Loading the dump therefore creates the same
starting state as `php artisan migrate:fresh --seed`.

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

Laravel requires:

- a name with no more than 255 characters;
- at least one distinct ID for an existing leaf sector; and
- acceptance of the terms.

Invalid requests receive a `422 Unprocessable Content` response with validation errors.

## Design decisions

### Sectors

**The hierarchy uses `parent_id`.** Each sector can refer to another sector as its parent. The
supplied option IDs remain the primary keys. Angular uses these relationships to build the nested
list and full category paths. The database does not store visual indentation.

**Angular sorts siblings alphabetically.** This produces the supplied order without a `sort_order`
column. Sorting in the client also avoids differences between database collations.

**Only leaf sectors are selectable.** A sector with children is a navigation heading. Selections do
not cascade, and there is no tri-state selection. Laravel rejects category IDs. Angular also drops
any stored category ID when it refills the form.

**The selector uses native controls.** Checkboxes, buttons, and nested lists provide accessible
keyboard and touch interaction without a third-party component.

### Backend

**PostgreSQL is used throughout.** Development and tests use the same database engine, while
Compose makes its version and setup reproducible.

**The session cookie identifies the submission.** An `updateOrCreate` operation keyed by session ID
keeps one submission per session, so the same endpoint handles the first save and later edits.

**Submissions and sectors have a many-to-many relationship.** The `sector_submission` table keeps
the data normalised and allows each submission to contain multiple sectors.

**Every API route starts the Laravel session.** The API prepends Laravel's `web` middleware so the
session cookie is always available. Authentication middleware is unnecessary because the
assignment has no accounts.

**Unused framework defaults were removed.** Authentication, cache, and queue database structures
are unnecessary for this application's scope.

### Frontend

**Reactive forms manage form state and validation.** The sector selector receives values and emits
changes, while a typed API service keeps HTTP logic out of the components.

**Bootstrap provides CSS only** for responsive layout and form styling; no component library is
needed.

**Accessibility starts with native HTML.** Labels, `fieldset`, `legend`, `output`, and nested lists
provide the form's semantics. Hints and errors are connected to their controls, and a failed submit
moves focus to the first invalid field.

**The Save button remains focusable while saving.** It uses `aria-disabled` to communicate its
state, while the submit handler prevents duplicate requests. The status output announces progress
without moving keyboard focus.

### Language

**A signal selects a typed English or Estonian dictionary.** Switching it updates all interface
copy, including visible client-side errors. The two small dictionaries share one file; a larger
application would separate them by locale.

**Small functions handle the count messages.** They cover the English and Estonian forms without
adding a message-format library.

**The selected language also controls server validation.** Requests send `Accept-Language`, and
Laravel returns validation messages in the chosen language.

**Sector names remain in English.** They come from the supplied database data. Translated names
would require locale-specific records in the database.

### Scope

**Deployment is same-origin.** Keeping the frontend and API on one origin lets Laravel's session
and Cross-Site Request Forgery (CSRF) cookies work without cross-origin configuration.

**Production hardening is intentionally limited.** Basic request throttling and session expiry are
included. Broader operational work is left out to keep this technical assignment proportionate.

## What I would do differently for a real product

This assignment demonstrates the main concerns without building a complete production system. The
following work would depend on the product's scale and requirements.

### Would build

- **End-to-end tests** for the complete browser, API, and session flow.
- **Automated checks** that run formatting, tests, and the production build for every change.
- **Error monitoring** so developers can diagnose failures hidden behind user-friendly messages.

### Would build differently

- **Form integration.** A reusable sector selector could implement `ControlValueAccessor`; the
  current input/output wiring is simpler for one use.
- **Element IDs.** Multiple selectors on one page would need unique ID prefixes.
- **Filtering.** A larger dataset would benefit from term matching and accent handling.
- **Translation workflow.** More languages would justify separate locale files and tooling for
  translators.
- **Sector translations.** Locale-specific database records could let the API return translated
  names from the request language.

### Would need a product decision first

- **Accounts.** Cross-device access would require authentication instead of session-only identity.
- **Analytics and consent.** Tracking should be added only with an agreed purpose and consent
  policy.
- **Remembered language.** Local storage, a cookie, or a language code in the URL could preserve
  the choice after a refresh.
- **Server error translation.** Returning error keys would let visible server errors follow a
  language change, but would duplicate the validation catalogue in the frontend.

## Project structure

```text
sector-selection-app/
├── backend/     Laravel API, database migrations, seed data, and Pest tests
├── frontend/    Angular application and Vitest tests
└── README.md
```
