# DistributionOS

DistributionOS is an AI-powered growth and distribution platform.

This repository currently contains the v0.1 production-grade skeleton only:

- Next.js 15 frontend
- TypeScript
- Tailwind CSS
- FastAPI backend
- Docker files
- GitHub Actions
- linting
- formatting
- type checking

No AI agents, RAG layer, OpenAI integration, business logic, database schema, or CareerScore-specific code has been implemented yet.

## Structure

```text
apps/web/          Next.js frontend
backend/          FastAPI backend
database/         Database placeholder for future schema and migrations
docs/             Project documentation
infra/            Docker and deployment support files
tests/            Cross-project tests and future test assets
```

## Frontend

```bash
cd apps/web
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

The backend runs at:

```text
http://localhost:8000
```

Health check:

```text
GET /health
```

## Quality Gates

Frontend:

```bash
npm run lint
npm run typecheck
npm run build
```

Backend:

```bash
cd backend
ruff check . --no-cache
black --check .
mypy app
pytest
```

## Docker

Frontend:

```bash
docker build -f infra/docker/frontend.Dockerfile -t distributionos-web .
```

Backend:

```bash
docker build -f infra/docker/backend.Dockerfile -t distributionos-api .
```
