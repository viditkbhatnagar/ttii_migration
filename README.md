# TTII JS Monorepo Foundation (Phase 02)

This repository now includes a JavaScript/TypeScript monorepo foundation for the TTII migration.

## Layout

- `apps/api`: Fastify + TypeScript API skeleton.
- `apps/web`: React + Vite web skeleton.
- `packages/shared-types`: cross-app type contracts.
- `packages/ui`: shared React UI component package.
- `migration`: migration planning, status, handoffs, reports.
- `app` and `public_html`: legacy PHP codebase (left untouched).

## Prerequisites

- Node.js 24+
- npm 11+
- Docker Desktop (for containerized local stack)

## Environment

1. Copy env template:
   - `cp .env.example .env`
2. Adjust values for your machine if needed.

## Local bootstrap (fresh clone)

1. Install workspace dependencies:
   - `npm ci`
2. Run baseline checks:
   - `npm run ci`
3. Start app stack locally:
   - `npm run dev`

Default endpoints:

- API health: `http://localhost:4000/api/health`
- Web app: `http://localhost:5173`

## Dockerized local stack

1. Ensure `.env` exists (`cp .env.example .env`).
2. Build and start containers:
   - `npm run docker:up`
3. Stop containers:
   - `npm run docker:down`

## CI baseline

CI workflow is defined in `.github/workflows/ci.yml` and runs:

1. `npm ci`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
