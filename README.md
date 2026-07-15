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
- Home page **Coming soon** card notes that Income is planned for a future stage

Stage 2B does **not** include Income, monthly totals, budgets, search/pagination, charts, receipts, authentication, or exports.

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

Stable codes include: `CATEGORY_NOT_FOUND`, `CATEGORY_NAME_ALREADY_EXISTS`, `CATEGORY_IN_USE`, `EXPENSE_NOT_FOUND`, `INVALID_EXPENSE_DATA`, `VALIDATION_FAILED`, `INVALID_REQUEST`, `INTERNAL_SERVER_ERROR`.

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
| `/` | Home (health check, CTAs, Income coming-soon card) |
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

- No Income tracking, monthly totals, budgets, search, pagination, charts, receipts, authentication, or exports
- No date-picker library; filters use month dropdown + year number input
- List order follows the backend (newest expense date first)

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

The backend allows only:

`http://localhost:5173`

No wildcard origin is configured.

## Features intentionally deferred

Deferred beyond Stage 2A:

- Expense frontend UI
- Monthly aggregate totals (future reporting will combine separate Expense and Income totals)
- Income management API and UI (planned as a separate controlled stage before monthly financial summaries; Income will remain its own backend feature and database table — not a generic Transaction entity)
- Category detail page, search, pagination, sorting UI controls
- Budgets
- Recurring expenses / subscriptions
- Authentication and users
- Receipt upload and OCR
- Reports and exports
- Notifications
- AWS or other cloud deployment
- Spring Security and Actuator

Do not treat those as implemented until a later stage explicitly adds them.
