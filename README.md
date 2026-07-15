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

Stage 1B does **not** include a category detail page, search/pagination/sorting, expenses, budgets, authentication, receipts, OCR, reports, notifications, exports, or cloud deployment.

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
| `DELETE` | `/api/categories/{id}` | `204` / `404` |

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

Stable codes include: `CATEGORY_NOT_FOUND`, `CATEGORY_NAME_ALREADY_EXISTS`, `VALIDATION_FAILED`, `INVALID_REQUEST`, `INTERNAL_SERVER_ERROR`.

Validation failures may include a `fieldErrors` array of `{ "field", "message" }`.

### Flyway V1

Migration `V1__create_categories_table.sql` creates:

- `categories` (`id`, `name`, `description`, `created_at`, `updated_at`)
- unique index `ux_categories_name_lower` on `LOWER(name)`

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

Deferred beyond Stage 1B:

- Category detail page, search, pagination, sorting UI controls
- Expenses (including “category is in use” delete protection)
- Budgets
- Authentication and users
- Receipt upload and OCR
- Reports and exports
- Notifications
- AWS or other cloud deployment
- Spring Security and Actuator

Do not treat those as implemented until a later stage explicitly adds them.
