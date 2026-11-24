Project: SANAD, a borrower-owned verifiable credit passport with AI loan agents. This repo is the Next.js App Router frontend (TypeScript strict, Tailwind, shadcn/ui, zustand, TanStack Query, zod), currently running entirely on mock JSON in data/ through lib/api.

Rules:
1. Components never import JSON directly; all data goes through lib/api. The mock API is the source of truth until a backend group is switched live.
2. Do not change behaviour or visuals unless the task says so. Prefer small, reviewable diffs.
3. Colours come from the design tokens in globals.css only. No raw hex in components.
4. Pages or components that read the store or localStorage are client components; the persisted store must be hydration-safe.
5. No new dependencies without asking.
6. Before finishing any task run typecheck, lint and build, and summarise what changed and what is still open.
7. Never put keys, secrets or personal data in the repo. Synthetic data only.
