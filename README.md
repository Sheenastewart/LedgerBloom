# LedgerBloom

LedgerBloom is a smart budget and receipt tracker portfolio application.

## Stage 0 scope

Stage 0 creates the full-stack foundation only:

- Spring Boot API skeleton
- React + TypeScript frontend skeleton
- PostgreSQL via Docker Compose
- Environment-based database configuration
- Flyway readiness with no business schema yet
- A simple health endpoint and frontend connectivity check

Stage 0 does **not** include categories, expenses, budgets, authentication, receipts, OCR, reports, notifications, exports, or cloud deployment.

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

## CORS restriction

The backend allows only:

`http://localhost:5173`

No wildcard origin is configured.

## Features intentionally deferred

Deferred beyond Stage 0:

- Categories and expenses
- Budgets
- Authentication and users
- Receipt upload and OCR
- Reports and exports
- Notifications
- AWS or other cloud deployment
- Spring Security and Actuator

Do not treat those as implemented until a later stage explicitly adds them.
