# LedgerBloom

LedgerBloom is a smart budget and receipt tracker portfolio application.

## Current stages

### Stage 0 — foundation

- Spring Boot API skeleton
- React + TypeScript frontend skeleton
- PostgreSQL via Docker Compose
- Environment-based database configuration
- Flyway baseline
- Health endpoint and frontend connectivity check

### Stage 1A — Category Management API (backend only)

- Flyway `V1__create_categories_table.sql`
- Category CRUD REST API
- Case-insensitive unique category names
- Structured API error responses

### Stage 1B — Category Management UI (frontend)

- Primary navigation in `AppLayout` (Home, Categories)
- Category list, create, edit, and delete flows
- Native `fetch` client against Stage 1A endpoints
- Client-side form validation plus structured API error display

Stage 1B does **not** include a category detail page, search/pagination/sorting, budgets, authentication, receipts, OCR, reports, notifications, exports, or cloud deployment.

### Stage 2A — Expense Management API (backend only)

- Flyway `V2__create_expenses_table.sql`
- Expense CRUD REST API with category assignment
- Optional filters by year/month and/or category
- Newest-date-first ordering
- Category deletion blocked while expenses reference the category

Stage 2A does **not** include an Expense frontend, monthly aggregate totals, budgets, recurring expenses, income, receipts, OCR, authentication, or pagination/search.

### Stage 2B — Expense Management UI (frontend)

- Primary navigation adds **Expenses** (Home, Categories, Expenses)
- Expense list, create, edit, and delete flows
- Optional filters by month/year and/or category
- Native `fetch` client against Stage 2A endpoints
- Client-side amount validation plus structured API error display

Stage 2B originally deferred Income; Income is delivered in Stage 3 below.

### Stage 3 — Income Management (full stack)

- Flyway `V3__create_income_entries_table.sql` (`income_entries`, separate from expenses)
- Income CRUD REST API with optional year/month and/or source filters
- Income UI: list, create, edit, delete, filters, nav link, home CTA
- Shared frontend money helpers extracted for reuse by Expenses and Income

Stage 3 does **not** include monthly totals, net cash flow, dashboards, budgets, recurring income, authentication, or bank connections.

### Stage 4 — Monthly Financial Dashboard (reporting)

- Reporting-only `GET /api/dashboard/monthly` combining Income and Expense totals for a selected month
- Dashboard UI at `/dashboard` with summary cards, category spending, income-by-source, and largest entries
- No changes to Income or Expense CRUD architecture or tables

Stage 4 does **not** include charts/chart libraries, authentication, multi-month comparisons, exports, or pagination of underlying ledger rows.

### Stage 5 — Monthly Budget Management (full stack)

- V4 `monthly_budgets` and `category_budget_limits` tables
- Budget CRUD API comparing planned limits to actual Expense totals
- Budgets UI at `/budgets` with month selection, category limits, and status labels
- Light dashboard budget overview when a budget exists for the selected month

Stage 5 does **not** include recurring budgets, rollovers, savings goals, notifications, charts, authentication, or annual/weekly budgets.

### Stage 6 — Recurring Expenses / Subscriptions (full stack)

- V5 `recurring_expenses` table for scheduled obligations
- CRUD + upcoming payments + mark-paid creating a real Expense only after explicit confirmation
- Recurring UI at `/recurring` with filters, upcoming section, and Mark Paid flow
- Category deletion also blocked when referenced by a recurring item

Stage 6 does **not** include automatic background expense creation, reminders/notifications, authentication, bank integrations, receipts, OCR, or recurring income.

### Stage 7 — Cash Flow Planning (full stack)

- V6 `recurring_income` table for expected income schedules (separate from `income_entries`)
- Recurring Income CRUD + upcoming + mark-received creating a real IncomeEntry only after confirmation
- Required `expectedNextIncomeDate` on mark-received (409 conflict on stale/duplicate)
- Dashboard **Cash Flow Planning** section: expected income/obligations, projected income, upcoming lists for the selected month
- In-app overdue / due today / due soon labels on recurring expense and income UIs

Stage 7 does **not** include email/SMS/push notifications, scheduled jobs, background auto-posting, charts, authentication, or bank sync.

### Stage 8 — Reporting, Trends, and Exports

- `GET /api/reports/monthly-comparison` for multi-month comparisons (max 24 months) with per-month totals, budget status, and recurring cash-flow projections
- `GET /api/reports/year-to-date` aggregating January through the current month (or all 12 months for past years): totals, averages, highest/best/worst months, budget totals, category/source breakdowns
- CSV exports: `GET /api/exports/monthly-transactions.csv` (raw ledger rows) and `GET /api/exports/monthly-summary.csv` (multi-section summary) for a selected month
- `Content-Disposition` response header exposed via CORS so browser clients can read the suggested filename
- CSV cell escaping guards against formula injection (leading `=`, `+`, `-`, `@` are neutralized with a leading `'`)
- Frontend routes: `/reports` (overview), `/reports/trends`, `/reports/year-to-date`, `/reports/monthly` (printable report with print CSS)
- Reports nav link and CSV download actions in the SPA

Stage 8 does **not** include PDF libraries, scheduled/emailed reports, or chart libraries (browser print-to-PDF is supported).

### Stage 9 — User Guidance and Help Center

- Reusable accessible `InfoTooltip` (click, focus, hover/tap, Escape, outside click; not hover-only)
- Expandable “How this works” panels on Dashboard, Budgets, Recurring Expenses/Income, Reports, Trends, and Monthly Report
- Searchable Help Center at `/help` with static topics (no backend help APIs)
- Shared calculation definitions and contextual Help links (`?topic=` / `?q=`)
- Help nav link and home CTA

Stage 9 does **not** include a product tour, onboarding checklist, sample data, videos, or backend-managed help content.

### Stage 10 — Authentication and Multi-User Ownership

- Flyway `V7__add_users_and_ownership.sql`: creates `users`, backfills a non-loginable `legacy@local.dev` ownership placeholder for pre-existing rows, and adds a `user_id` foreign key + per-user unique constraints to every financial table
- Session-cookie authentication (Spring Security + BCrypt), **not** JWT — see rationale below
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Every existing endpoint under `/api/**` (except `/api/health`, `/api/auth/register`, `/api/auth/login`, and CORS preflight `OPTIONS`) requires an authenticated session and is scoped to the caller's own data
- CSRF protection is enabled for **all** mutating requests including register and login (`XSRF-TOKEN` cookie + `X-XSRF-TOKEN` header; missing/invalid token → `403 FORBIDDEN`)
- Frontend: Register, Login, Logout, protected routes, session restore via `/api/auth/me`, shared `apiClient` with `credentials: 'include'` and CSRF bootstrap
- No default admin account and no committed credentials — users create accounts through registration
- New error codes: `UNAUTHORIZED`, `FORBIDDEN`, `EMAIL_ALREADY_EXISTS`, `INVALID_CREDENTIALS`, `AUTHENTICATION_REQUIRED`
- Cross-user access returns **404 `*_NOT_FOUND`**, never 403

**Why session cookies instead of JWT:** no token-signing library, key rotation, or client-side token storage; localhost SPA + API work with `SameSite=Lax` + `credentials: 'include'`; logout revokes the server session immediately.

**Ownership model:** every financial entity has a required `user`. Services resolve the caller via `CurrentUser` and scope every query. Category names and monthly budgets are unique per user.

**Legacy data placeholder:** rows that existed before Stage 10 are attributed to `legacy@local.dev` solely to satisfy `NOT NULL` foreign keys. That account has a BCrypt hash of an unrecorded random password and is not a usable login or admin account. Do not treat it as default credentials.

Stage 10 does **not** include OAuth/social login, MFA, or role-based admin permissions. Password reset and account settings arrive in Stage 11.

### Stage 11 — Account Management and Security Hardening

- Account settings UI at `/settings/account`: view email, update display name, change password, log out
- `GET /api/account`, `PUT /api/account/profile`, `PUT /api/account/password` (session-derived user only)
- Password policy minimum **12** characters for register, password change, and reset
- Password reset: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`; SPA routes `/forgot-password`, `/reset-password`
- Flyway `V9__password_reset_tokens.sql` stores **hashed** single-use tokens with expiry (raw tokens never persisted or logged)
- Local development may return a reset token only when `LEDGERBLOOM_DEV_RETURN_RESET_TOKEN=true`; production must keep this false and connect a real email provider later
- Lightweight in-memory login throttling after repeated failures (single-instance only; move to shared infra when horizontally scaled)
- Environment-driven CORS origin, session cookie Secure/HttpOnly/SameSite, and session timeout (see `.env.example`)
- Settings Security page explains password, session, CSRF, logout, and reset behavior in plain language

### Stage 12 — Budget Groups and Ledger UX

Budget planning moved from per-category limits to nine preset **budget groups**, with category colors, mandatory category→group mapping, and a unified expenses/income experience.

**Budget groups (backend)**

- Flyway `V12__category_color.sql`: optional `categories.color` (`#RRGGBB`)
- Flyway `V13__budget_groups.sql`:
  - `categories.budget_group` (required) with name-based backfill
  - `monthly_budgets.user_modified`
  - `budget_group_limits` table replacing `category_budget_limits`
  - Existing category limits are rolled up into group limits; those months are locked (`user_modified = TRUE`)
- Nine groups with default monthly amounts: Bills $2,000 · Subscriptions $200 · Groceries $250 · Eating Out $200 · Transportation $200 · Medical $200 · Child Care $500 · Debt Payments $250 · Personal & Household $500
- Group-limit CRUD at `/api/budgets/monthly/{id}/groups`
- `POST /api/budgets/monthly/generate` creates or refreshes an auto-managed budget
- Auto budgets stay unlocked until the user edits a total or group limit; unlocked budgets refresh from presets, recurring bills, and actual spend (`max` of the three)
- Loading a budget backfills missing groups; migrated partial locked budgets with below-preset amounts are reset to the defaults
- Expense and recurring-expense mutations sync unlocked auto budgets for the affected month(s)

**Categories**

- Create/update require a budget group so spending rolls into the correct bucket
- Optional category color for list accents
- Categories live under Budgets (`/budgets/categories`); legacy `/transactions/categories` and `/categories` routes redirect

**Budget UI**

- Monthly budget page shows the nine group limits, remaining/spend status, and auto-generate/refresh actions
- Manual create still sets an overall total and seeds group presets (locked)
- Help/calculation copy refers to group limits instead of category limits

**Income and expense UX**

- Expenses and income pages fold recorded rows, remaining/expected upcoming items, and all recurring schedules into one place
- Legacy recurring list routes redirect into those pages
- Display helpers: description/title vs merchant or source, monthly-equivalent amounts for short cadences, category color accents
- Page-level “Looking at” scope filters (all / recorded / upcoming / schedules)

**Current limitations**

- Deleting a group limit locks the month and stays deleted across reloads. Use **Restore default budget groups** to recreate only missing presets without overwriting edited amounts or removing existing groups
- No savings goals, budget rollovers, charts, or email delivery for password reset
- Auto-budget refresh does not run for user-locked months, and never recreates deleted groups on ordinary page loads

Stage 12 does **not** include bank sync, OCR/receipts, push notifications, or production hosting.

## Repository structure

```text
ledgerbloom/
├── backend/            # Spring Boot API (Java 21)
├── frontend/           # React + TypeScript + Vite SPA
├── docker-compose.yml  # Local PostgreSQL
├── .env.example        # Placeholder Compose variables
├── .gitignore
└── README.md
```

## Prerequisites

- Java 21 (Eclipse Temurin 21 recommended)
- Node.js 24 LTS (includes npm)
- Docker Desktop with Compose support
- Git

## Environment-variable setup

### Docker Compose (PostgreSQL)

1. Copy the example file:

```bash
cp .env.example .env
```

2. Replace placeholder values in `.env` if desired.
3. Keep `.env` out of Git (it is already ignored).

Variables used by Compose:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_DB` | Database name |
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_PORT` | Host port mapped to container `5432` |

### Backend (Spring Boot)

Spring Boot does **not** automatically load the root `.env` file.

Export these variables in your shell before starting the backend:

```bash
export DB_URL=jdbc:postgresql://localhost:5432/ledgerbloom
export DB_USERNAME=ledgerbloom
export DB_PASSWORD=change-me
```

Use values that match your Compose `.env`.

| Variable | Purpose |
| --- | --- |
| `DB_URL` | JDBC URL |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |

### Frontend (Vite)

1. Copy the example file:

```bash
cp frontend/.env.example frontend/.env.local
```

2. Keep `frontend/.env.local` out of Git.

| Variable | Value for local development |
| --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8080` |

## Start PostgreSQL

```bash
docker compose up -d
```

Check status:

```bash
docker compose ps
docker compose exec postgres pg_isready -U ledgerbloom -d ledgerbloom
```

## Stop PostgreSQL

```bash
docker compose down
```

This stops containers but keeps the named Docker volume (`ledgerbloom_pgdata`) unless you explicitly remove volumes.

## Start the backend

```bash
export DB_URL=jdbc:postgresql://localhost:5432/ledgerbloom
export DB_USERNAME=ledgerbloom
export DB_PASSWORD=change-me
cd backend
./mvnw spring-boot:run
```

The API listens on `http://localhost:8080`.

## Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The UI listens on `http://localhost:5173`.

## Run backend tests

```bash
cd backend
./mvnw test
```

## Run frontend tests

```bash
cd frontend
npm test -- --run
```

## Build the backend

```bash
cd backend
./mvnw clean package
```

## Build the frontend

```bash
cd frontend
npm run build
```

## Health endpoint

`GET /api/health`

Example response:

```json
{
  "status": "UP",
  "service": "ledgerbloom-api"
}
```

This is an API-process health check. It does not inspect PostgreSQL availability.

## Category UI (Stage 1B)

With PostgreSQL, the backend, and the Vite frontend running:

1. Open `http://localhost:5173`
2. Use the primary nav (Home / Categories) or the home page **Manage categories** CTA
3. Create, edit, and delete categories through the UI

### Frontend routes

| Path | Page |
| --- | --- |
| `/` | Home (health check + link to Categories) |
| `/categories` | Category list |
| `/categories/new` | Create category |
| `/categories/:id/edit` | Edit category (`:id` must be a positive safe integer) |

Invalid edit IDs (missing, `0`, negative, decimal, non-numeric, or unsafe integers) show a not-found state **without** calling the API.

### Frontend layout notes

- `CategoriesPage` owns loading, retries, list data, delete confirmation/pending state, and success/error feedback
- `CategoryList` is presentational (categories, deleting id, delete handler)
- Create/update success messages travel through React Router location state and are cleared with `replace` (they do not survive a full refresh)
- Shared API helpers live in `frontend/src/api/`; category endpoint functions stay in `frontend/src/features/categories/api/`

## Category API (Stage 1A)

The Category UI consumes these backend endpoints.

### Endpoints

| Method | Path | Success |
| --- | --- | --- |
| `GET` | `/api/categories` | `200` — list alphabetically by `LOWER(name)` |
| `GET` | `/api/categories/{id}` | `200` / `404` |
| `POST` | `/api/categories` | `201` + `Location` / `400` / `409` |
| `PUT` | `/api/categories/{id}` | `200` / `400` / `404` / `409` |
| `DELETE` | `/api/categories/{id}` | `204` / `404` / `409` (`CATEGORY_IN_USE`) |

### Example create body

```json
{
  "name": "Groceries",
  "description": "Weekly shopping"
}
```

### Validation rules

- `name`: required, not blank, max 80 characters (after trim in the service)
- `description`: optional, max 255 characters; blank/whitespace becomes `null`
- Duplicate names are rejected case-insensitively (`Groceries` and `groceries` conflict)

Controller Bean Validation checks the inbound JSON. The service re-validates the **normalized** (trimmed) name and description before persistence so invalid values cannot be saved even if the service is called outside the controller.

### Error response format

```json
{
  "timestamp": "2026-07-15T16:00:00Z",
  "status": 409,
  "error": "Conflict",
  "code": "CATEGORY_NAME_ALREADY_EXISTS",
  "message": "A category with name 'Groceries' already exists",
  "path": "/api/categories",
  "fieldErrors": null
}
```

Stable codes include: `CATEGORY_NOT_FOUND`, `CATEGORY_NAME_ALREADY_EXISTS`, `CATEGORY_IN_USE`, `EXPENSE_NOT_FOUND`, `INVALID_EXPENSE_DATA`, `RECURRING_EXPENSE_NOT_FOUND`, `INVALID_RECURRING_EXPENSE_DATA`, `INVALID_RECURRING_EXPENSE_FILTER`, `RECURRING_EXPENSE_PAYMENT_CONFLICT`, `RESOURCE_NOT_FOUND`, `VALIDATION_FAILED`, `INVALID_REQUEST`, `INTERNAL_SERVER_ERROR`.

Stable codes added in Stage 10: `UNAUTHORIZED` (401, missing/invalid session), `FORBIDDEN` (403, includes CSRF failures), `EMAIL_ALREADY_EXISTS` (409), `INVALID_CREDENTIALS` (401), `AUTHENTICATION_REQUIRED` (401, defensive service-layer guard).

Validation failures may include a `fieldErrors` array of `{ "field", "message" }`.

### Category deletion protection

Deleting a category that still has expenses returns `409` with code `CATEGORY_IN_USE`. The database foreign key uses `ON DELETE RESTRICT` as a final guard.

### Flyway V1

Migration `V1__create_categories_table.sql` creates:

- `categories` (`id`, `name`, `description`, `created_at`, `updated_at`)
- unique index `ux_categories_name_lower` on `LOWER(name)`

## Expense UI (Stage 2B)

With PostgreSQL, the backend, and the Vite frontend running:

1. Open `http://localhost:5173`
2. Use the primary nav (Home / Categories / Expenses) or the home page CTAs
3. Create categories first if needed, then create, edit, delete, and filter expenses

### Frontend routes

| Path | Page |
| --- | --- |
| `/` | Home (health check + CTAs for Categories, Expenses, Income) |
| `/categories` | Category list |
| `/categories/new` | Create category |
| `/categories/:id/edit` | Edit category |
| `/expenses` | Expense list with filters |
| `/expenses/new` | Create expense |
| `/expenses/:id/edit` | Edit expense (`:id` must be a positive safe integer) |

Invalid expense edit IDs show a not-found state **without** calling the API.

### Supported fields and actions

| Field | Create/Edit | List display |
| --- | --- | --- |
| Description | Required, max 160 | Yes |
| Merchant | Optional, max 120 | When present |
| Amount | Required, > 0, max 10 digits + 2 decimals | Formatted currency |
| Expense date | Required (`YYYY-MM-DD`) | Yes |
| Category | Required (dropdown from Category API) | Category name |
| Notes | Optional | When present |

Actions: create, edit, delete (with native confirmation), filter, clear filters, retry on load failure.

### Filters

- Month (1–12) and year must be selected together
- Category filter is optional
- Apply sends validated query params; Clear resets filters and reloads the full list
- Active filters are preserved after delete and refresh

### Client validation

- Description required; merchant/notes trimmed with blank → `null` on submit
- Amount kept as string in the form; validated without floating-point math; commas stripped before submit
- Category required; expense date required
- Backend remains the final authority for validation

### Frontend layout notes

- `ExpensesPage` owns loading, filters, retries, list data, delete confirmation/pending state, and success/error feedback
- `ExpenseList` and `ExpenseFilters` are presentational / filter UI only
- `ExpenseForm` is shared between create and edit; `ExpenseFormPage` loads categories (and expense on edit)
- Create/update success messages travel through React Router location state and are cleared with `replace`

### Current limitations

- No monthly totals, budgets, search, pagination, charts, receipts, authentication, or exports
- No date-picker library; filters use month dropdown + year number input
- List order follows the backend (newest expense date first)

## Income (Stage 3)

With PostgreSQL, the backend, and the Vite frontend running:

1. Open `http://localhost:5173`
2. Use the primary nav (Home / Categories / Expenses / Income) or the home page **Manage income** CTA
3. Create, edit, delete, and filter income entries

### Frontend routes

| Path | Page |
| --- | --- |
| `/income` | Income list with filters |
| `/income/new` | Create income |
| `/income/:id/edit` | Edit income (`:id` must be a positive safe integer) |

### Supported fields and actions

| Field | Create/Edit | List display |
| --- | --- | --- |
| Description | Required, max 160 | Yes |
| Source | Required, max 120 | Yes |
| Amount | Required, > 0, max 10 digits + 2 decimals | Formatted currency |
| Income date | Required (`YYYY-MM-DD`) | Yes |
| Notes | Optional | When present |

Actions: create, edit, delete (native confirmation), filter by month/year and/or source, clear filters, retry on load failure.

### Filters

- Month (January–December) and year must be selected together
- Source is a free-text filter (case-insensitive on the API)
- Apply sends validated query params; Clear resets filters
- Active filters are preserved after delete and Retry

### Income API endpoints

| Method | Path | Success |
| --- | --- | --- |
| `GET` | `/api/income` | `200` — newest `incomeDate`, then `id` descending |
| `GET` | `/api/income/{id}` | `200` / `404` |
| `POST` | `/api/income` | `201` + `Location` / `400` |
| `PUT` | `/api/income/{id}` | `200` / `400` / `404` |
| `DELETE` | `/api/income/{id}` | `204` / `404` |

Optional filters on `GET /api/income`: `year` + `month` together, and/or `source` (trimmed; blank treated as absent; case-insensitive).

### Flyway V3

Migration `V3__create_income_entries_table.sql` creates:

- `income_entries` (`id`, `description`, `source`, `amount`, `income_date`, `notes`, `created_at`, `updated_at`)
- check `ck_income_entries_amount_positive` (`amount > 0`)
- indexes `ix_income_entries_income_date`, `ix_income_entries_source`, `ix_income_entries_income_date_source`
- No foreign key to categories or expenses

### Current limitations

- No budgets, recurring income, authentication, bank connections, receipts, search, or pagination
- Source is free text (no dedicated source table in this stage)
- Monthly reporting is provided separately by Stage 4 (`/dashboard`)

## Monthly Dashboard (Stage 4)

With PostgreSQL, the backend, and the Vite frontend running:

1. Open `http://localhost:5173/dashboard` (or use nav **Dashboard** / home **View dashboard**)
2. Select month and year, then **Update report**
3. Review summary cards, category spending, income by source, and largest entries

### Frontend route

| Path | Page |
| --- | --- |
| `/dashboard` | Monthly financial dashboard |

### Dashboard API

| Method | Path | Success |
| --- | --- | --- |
| `GET` | `/api/dashboard/monthly?year=&month=` | `200` dashboard DTO / `400` invalid period |

Required query params: `year` (1–9999) and `month` (1–12). Both must be provided.

Response includes: `totalIncome`, `totalExpenses`, `netCashFlow` (income − expenses), entry counts, `spendingByCategory`, `incomeBySource`, `largestExpense`, `largestIncome`, and optional `budget` summary when a Stage 5 monthly budget exists.

Totals are calculated on the backend from existing Income and Expense repositories. Income and Expense CRUD tables/APIs are unchanged. Budget planning data comes from the Stage 5 budgets API / tables.

### Current limitations

- No chart libraries or multi-month comparisons
- No exports, authentication, or drill-down editing from the dashboard cards

## Budgets (Stage 5)

With PostgreSQL, the backend, and the Vite frontend running:

1. Open `http://localhost:5173/budgets` (or use nav **Budgets** / home **Manage budgets**)
2. Select month and year, then **Load budget**
3. Create an overall monthly budget, then optional category limits
4. Review actual expenses, remaining amounts, percent used, and status
5. On the dashboard for the same month, confirm the budget overview appears

Period state uses query parameters such as `/budgets?year=2026&month=7` so create/edit/delete flows can return to the same month.

### Frontend routes

| Path | Page |
| --- | --- |
| `/budgets` | Monthly budget view for a selected month |
| `/budgets/new` | Create monthly budget |
| `/budgets/:id/edit` | Edit monthly budget total limit |

### Budget API

| Method | Path | Success |
| --- | --- | --- |
| `GET` | `/api/budgets/monthly?year=&month=` | `200` budget DTO / `404` `BUDGET_NOT_FOUND` |
| `POST` | `/api/budgets/monthly` | `201` + `Location` |
| `PUT` | `/api/budgets/monthly/{id}` | `200` |
| `DELETE` | `/api/budgets/monthly/{id}` | `204` (cascades category limits) |
| `POST` | `/api/budgets/monthly/{budgetId}/categories` | `201` + `Location` |
| `PUT` | `/api/budgets/monthly/{budgetId}/categories/{limitId}` | `200` |
| `DELETE` | `/api/budgets/monthly/{budgetId}/categories/{limitId}` | `200` budget DTO |

Actuals, remaining, percent used, and over-budget flags are calculated from Expense data and are not stored. Percent used uses BigDecimal scale 2 with `RoundingMode.HALF_UP`. Category limits may exceed the overall monthly limit (allowed for now). Category deletion is blocked with `409 CATEGORY_IN_USE` when referenced by expenses or category budget limits.

Status labels: **On track** (< 80% used), **Near budget** (≥ 80% and not over), **Over budget** (actual > limit).

### Database (V4)

Confirm with `psql` after startup:

- tables `monthly_budgets`, `category_budget_limits`
- unique `(budget_year, budget_month)` and `(monthly_budget_id, category_id)`
- FK cascade from limits → budgets; RESTRICT from limits → categories
- indexes `ix_monthly_budgets_year_month`, `ix_category_budget_limits_monthly_budget_id`, `ix_category_budget_limits_category_id`

### Current limitations

- No recurring budgets, automatic copying, rollovers, savings goals, notifications, charts, annual/weekly budgets, or authentication

## Recurring Expenses (Stage 6)

With PostgreSQL, the backend, and the Vite frontend running:

1. Open `http://localhost:5173/recurring` (nav **Recurring** / home **Manage recurring**)
2. Create weekly, monthly, and annual recurring items
3. Filter by active status, category, and cadence
4. Review upcoming payments (default next 30 days)
5. Mark Paid with confirmation — creates one Expense and advances `nextPaymentDate`
6. Confirm the new expense appears under **Expenses**

`active` defaults to `true` in the database (`DEFAULT TRUE`) and the create form defaults the checkbox to checked. Past `nextPaymentDate` values are allowed (overdue items); dates are not auto-advanced without Mark Paid.

### Frontend routes

| Path | Page |
| --- | --- |
| `/recurring` | List, filters, upcoming, mark paid |
| `/recurring/new` | Create recurring expense |
| `/recurring/:id/edit` | Edit recurring expense |

### Recurring API

| Method | Path | Success |
| --- | --- | --- |
| `GET` | `/api/recurring-expenses` | `200` (filters: `active`, `categoryId`, `cadence`) |
| `GET` | `/api/recurring-expenses/upcoming?days=` | `200` (default 30 days; active only) |
| `GET` | `/api/recurring-expenses/{id}` | `200` / `404` |
| `POST` | `/api/recurring-expenses` | `201` + `Location` |
| `PUT` | `/api/recurring-expenses/{id}` | `200` |
| `DELETE` | `/api/recurring-expenses/{id}` | `204` |
| `POST` | `/api/recurring-expenses/{id}/mark-paid` | `200` `{ createdExpense, updatedRecurringExpense }` |

Mark-paid request body (required):

```json
{
  "expectedNextPaymentDate": "2026-08-01"
}
```

`expectedNextPaymentDate` is required and must equal the row’s current `nextPaymentDate` at lock time. Missing/null → `400 VALIDATION_FAILED`; malformed → `400 INVALID_REQUEST`; mismatch (stale/duplicate) → `409 RECURRING_EXPENSE_PAYMENT_CONFLICT`.

Mark-paid runs in one transaction: pessimistic write lock → compare expected date → create one Expense → advance `nextPaymentDate`. Cadence advances use `LocalDate.plusWeeks` / `plusMonths` / `plusYears` (Java end-of-month semantics, e.g. Jan 31 + 1 month → Feb 28/29).

### Database (V5)

- table `recurring_expenses`
- `ck_recurring_expenses_amount_positive`, `ck_recurring_expenses_cadence`
- `fk_recurring_expenses_category` `ON DELETE RESTRICT`
- indexes on category, next payment date, active, cadence, and `(active, next_payment_date)`

### Current limitations

- No reminders, auto-posting, bank sync, receipts, OCR, proration, or recurring income

## Expense API (Stage 2A)

The Expense UI consumes these backend endpoints.

### Endpoints

| Method | Path | Success |
| --- | --- | --- |
| `GET` | `/api/expenses` | `200` — newest `expenseDate`, then `id` descending |
| `GET` | `/api/expenses/{id}` | `200` / `404` |
| `POST` | `/api/expenses` | `201` + `Location` / `400` / `404` |
| `PUT` | `/api/expenses/{id}` | `200` / `400` / `404` |
| `DELETE` | `/api/expenses/{id}` | `204` / `404` |

### Filter query parameters

Optional on `GET /api/expenses`:

| Param | Rules |
| --- | --- |
| `year` + `month` | Must both be present or both absent; `month` 1–12; `year` 1–9999 |
| `categoryId` | Optional; must be positive when provided |

Examples:

- `GET /api/expenses`
- `GET /api/expenses?year=2026&month=7`
- `GET /api/expenses?categoryId=3`
- `GET /api/expenses?year=2026&month=7&categoryId=3`

An unknown `categoryId` filter returns an empty list (not `404`). Missing category on create/update returns `404 CATEGORY_NOT_FOUND`.

Month filtering uses half-open bounds: `expense_date >= first day of month` and `expense_date < first day of next month`.

### Example create body

```json
{
  "description": "Weekly shopping",
  "merchant": "Local Market",
  "amount": 45.50,
  "expenseDate": "2026-07-10",
  "categoryId": 1,
  "notes": "Optional note"
}
```

### Example response

```json
{
  "id": 1,
  "description": "Weekly shopping",
  "merchant": "Local Market",
  "amount": 45.50,
  "expenseDate": "2026-07-10",
  "category": { "id": 1, "name": "Groceries" },
  "notes": "Optional note",
  "createdAt": "2026-07-15T18:00:00Z",
  "updatedAt": "2026-07-15T18:00:00Z"
}
```

### Validation rules

- `description`: required, not blank, max 160 characters (after trim)
- `merchant`: optional, max 120 characters; blank becomes `null`
- `amount`: required, `BigDecimal`, greater than zero, at most 2 decimal places, fits `NUMERIC(12,2)` — excess decimals are rejected (not rounded)
- `expenseDate`: required (`YYYY-MM-DD`)
- `categoryId`: required, positive, must exist
- `notes`: optional `TEXT`; blank becomes `null`

### Flyway V2

Migration `V2__create_expenses_table.sql` creates:

- `expenses` (`id`, `description`, `merchant`, `amount`, `expense_date`, `notes`, `category_id`, `created_at`, `updated_at`)
- check `ck_expenses_amount_positive` (`amount > 0`)
- foreign key `fk_expenses_category` → `categories(id)` `ON DELETE RESTRICT`
- indexes `ix_expenses_expense_date`, `ix_expenses_category_id`, `ix_expenses_expense_date_category_id`

### Manual Expense API verification

With Postgres and the backend running:

```bash
curl -i -X POST http://localhost:8080/api/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":"Groceries"}'

curl -i -X POST http://localhost:8080/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{"description":"Weekly shopping","merchant":"Market","amount":45.50,"expenseDate":"2026-07-10","categoryId":1}'

curl -i 'http://localhost:8080/api/expenses?year=2026&month=7'
curl -i 'http://localhost:8080/api/expenses?categoryId=1'
curl -i -X DELETE http://localhost:8080/api/categories/1
```

### Manual Category API verification

```bash
docker compose up -d
docker compose exec postgres pg_isready -U ledgerbloom -d ledgerbloom

export DB_URL=jdbc:postgresql://localhost:5432/ledgerbloom
export DB_USERNAME=ledgerbloom
export DB_PASSWORD=change-me
cd backend
./mvnw spring-boot:run
```

In another terminal:

```bash
curl -i -X POST http://localhost:8080/api/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":"Groceries","description":"Weekly shopping"}'

curl -i http://localhost:8080/api/categories
curl -i http://localhost:8080/api/categories/1

curl -i -X PUT http://localhost:8080/api/categories/1 \
  -H 'Content-Type: application/json' \
  -d '{"name":"Groceries","description":"Updated"}'

curl -i -X POST http://localhost:8080/api/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":"groceries"}'

curl -i -X POST http://localhost:8080/api/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":""}'

curl -i http://localhost:8080/api/categories/99999
curl -i -X DELETE http://localhost:8080/api/categories/1
curl -i http://localhost:8080/api/categories/1
```

## CORS restriction

Allowed origins come from `LEDGERBLOOM_CORS_ALLOWED_ORIGINS` (comma-separated exact origins). Local default:

`http://localhost:5173`

No wildcard origin is configured. `allowCredentials(true)` is set so the browser sends/receives the session cookie (`LEDGERBLOOM_SESSION`) and the CSRF cookie (`XSRF-TOKEN`) on cross-port requests from the Vite dev server; browsers reject `allowCredentials(true)` combined with a wildcard origin or wildcard headers, so both the origin list and the allowed-headers list stay explicit.

## Authentication and account API

Session-cookie authentication (see Stages 10–11). Send `credentials: 'include'` on every API request.

### Endpoints

| Method | Path | Auth required | Success |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No (CSRF required) | `201` + user body / `400` validation / `409` `EMAIL_ALREADY_EXISTS` / `403` CSRF |
| `POST` | `/api/auth/login` | No (CSRF required) | `200` + user body / `401` `INVALID_CREDENTIALS` / `429` `LOGIN_THROTTLED` / `403` CSRF |
| `POST` | `/api/auth/forgot-password` | No (CSRF required) | `200` generic message (optional local-only `devResetToken`) |
| `POST` | `/api/auth/reset-password` | No (CSRF required) | `200` success message / `400` `INVALID_RESET_TOKEN` or validation |
| `POST` | `/api/auth/logout` | Yes (CSRF required) | `204`, clears the session and cookies |
| `GET` | `/api/auth/me` | Yes | `200` + user body / `401` `UNAUTHORIZED` |
| `GET` | `/api/account` | Yes | `200` + safe profile fields |
| `PUT` | `/api/account/profile` | Yes (CSRF) | `200` + updated profile |
| `PUT` | `/api/account/password` | Yes (CSRF) | `200` + profile; current session stays authenticated; other sessions expire naturally |

Every other `/api/**` endpoint requires an authenticated session. `/api/health` remains public and is also used by the SPA to initialize the CSRF cookie.

### Production email delivery (password reset)

Forgot-password generates a cryptographically secure token, stores only its SHA-256 hash, and invalidates prior unused tokens for that user. Connect a transactional email provider later by sending a link such as `{FRONTEND_ORIGIN}/reset-password?token=…` out-of-band. Keep `LEDGERBLOOM_DEV_RETURN_RESET_TOKEN` and `LEDGERBLOOM_DEV_RESET_INBOX_ENABLED` **false** in production so raw tokens never appear in API responses or logs.

### Register body shape

```json
{
  "email": "jane@example.com",
  "password": "<choose-a-strong-password>",
  "confirmPassword": "<choose-a-strong-password>",
  "displayName": "Jane Doe"
}
```

Do not commit real passwords. `password` must be at least 12 characters and must match `confirmPassword`. Responses never include the password or hash:

```json
{
  "id": 2,
  "email": "jane@example.com",
  "displayName": "Jane Doe",
  "createdAt": "2026-07-15T19:00:00Z",
  "lastLoginAt": null
}
```

Login failures always return a generic `INVALID_CREDENTIALS` message and never reveal whether the email exists.

### CSRF

1. Call a safe GET such as `/api/health` with `credentials: 'include'` so the server sets the `XSRF-TOKEN` cookie.
2. On `POST` / `PUT` / `PATCH` / `DELETE`, send header `X-XSRF-TOKEN` with that cookie value.
3. Keep CSRF enabled for register, login, logout, and all other mutating APIs.
4. Missing or invalid tokens return `403 FORBIDDEN` with a safe JSON body.

### Ownership

Every category, expense, income entry, budget, and recurring item belongs to exactly one user. Fetching another user's resource by ID returns the same `404 *_NOT_FOUND` response as a nonexistent ID.

## Reporting and Exports API (Stage 8)

### Reports

| Method | Path | Success |
| --- | --- | --- |
| `GET` | `/api/reports/monthly-comparison?startYear=&startMonth=&endYear=&endMonth=` | `200` / `400` invalid period or range too large |
| `GET` | `/api/reports/year-to-date?year=` | `200` / `400` invalid or future year |

`monthly-comparison` spans a maximum of 24 inclusive months (`REPORT_RANGE_TOO_LARGE` beyond that). Each month row includes actual income/expenses, net cash flow, optional budget status (`null` when no budget exists for that month), and recurring-driven cash-flow projections (mirrors the Stage 7 planning logic).

`year-to-date` covers January through December for past years, or January through the current month for the current year. It aggregates totals, averages, highest/best/worst months by income, expenses, and net cash flow, year-wide budget totals, and category/source breakdowns.

### Exports

| Method | Path | Success |
| --- | --- | --- |
| `GET` | `/api/exports/monthly-transactions.csv?year=&month=` | `200` CSV attachment / `400` invalid period |
| `GET` | `/api/exports/monthly-summary.csv?year=&month=` | `200` CSV attachment / `400` invalid period / `500` `EXPORT_GENERATION_FAILED` |

`monthly-transactions.csv` lists every income and expense row for the month (newest date first, `EXPENSE` before `INCOME` on ties) with columns `Type,Date,Description,SourceOrMerchant,Category,Amount,Notes`. `monthly-summary.csv` is a multi-section file: month metrics, category spending, and income by source.

Both exports respond with `Content-Type: text/csv; charset=UTF-8` and `Content-Disposition: attachment; filename="ledgerbloom-<report>-YYYY-MM.csv"`. CORS exposes `Content-Disposition` so browser clients can read the filename.

Stable codes added in Stage 8: `INVALID_REPORT_PERIOD`, `REPORT_RANGE_TOO_LARGE`, `EXPORT_GENERATION_FAILED`.

### CSV formula-injection protection

Any cell value beginning with `=`, `+`, `-`, or `@` (after trimming) is prefixed with a single quote `'` before being written, so spreadsheet applications (Excel, Google Sheets, LibreOffice) render it as literal text instead of evaluating it as a formula. Cells containing a comma, quote, or newline are additionally wrapped in double quotes with embedded quotes doubled, per standard CSV escaping. See `com.ledgerbloom.report.CsvUtil`.

### Current limitations

- No PDF library (use browser print / Save as PDF), scheduled or emailed reports, or chart libraries

## Features intentionally deferred

Deferred beyond Stage 11:

- Guided product tour, home onboarding checklist, sample/demo data, video tutorials
- Backend-managed help content and admin help editor
- Charts / chart libraries and server-generated PDF exports
- Category detail page, search, pagination, sorting UI controls
- Recurring budgets / budget rollover / savings goals
- Email, SMS, or push reminders for recurring schedules
- OAuth/social login, email verification, multi-factor authentication, role-based permissions
- Production transactional email for password reset (local uses opt-in dev token return only)
- Shared/distributed login throttling and multi-session revocation for horizontal scale
- Receipt upload and OCR
- Background jobs / automatic posting of recurring ledger rows
- Visual redesign / design system
- AWS or other cloud deployment beyond environment-based security configuration placeholders
- Spring Boot Actuator

Do not treat those as implemented until a later stage explicitly adds them.
