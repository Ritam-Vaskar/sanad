# Sanad

A borrower-owned verifiable credit passport prototype.

## Run locally

```sh
pnpm install
pnpm dev:web
```

The web app remains in mock mode by default.

## Run the monorepo

```sh
make up
```

- Web: http://localhost:3000
- Credential service: http://localhost:4000/health
- Core service: http://localhost:8000/health

## Check the web app

```sh
cd apps/web
pnpm run check
```

This runs type-checking, lint, Vitest policy/audit tests, a production build, and the Playwright golden-path test. Playwright installs Chromium when it is not already available.

## Layout

- `apps/web` - Next.js frontend
- `services/credential` - Node/TypeScript credential service
- `services/core` - Python/FastAPI core service
- `contracts` - smart contracts
- `shared/schemas` - JSON Schemas
- `data` - local demo infrastructure
