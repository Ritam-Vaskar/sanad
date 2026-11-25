# API layer

The API layer is split into **8 groups** so the backend can be switched in one group at a time. Each group has a TypeScript interface (`lib/api/types.ts`), a **mock** implementation (current behaviour backed by the Zustand store and seed JSON) and a **live** implementation (real HTTP calls to backend services).

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_MODE` | `mock` | `mock` or `live` |
| `NEXT_PUBLIC_LIVE_GROUPS` | _(empty)_ | Comma-separated group names to run live (e.g. `credential,mandate`). Groups not listed stay on mock. |
| `NEXT_PUBLIC_CORE_URL` | _(empty)_ | Base URL of the core service (FastAPI). Required when any core-service group is live. |
| `NEXT_PUBLIC_CREDENTIAL_URL` | _(empty)_ | Base URL of the credential service (Fastify). Required when the `credential` group is live. |

## Groups and functions

| Function | Group | Request | Response | Mock behaviour | Live endpoint | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `issueCredential(type, subjectId, issuerId?)` | credential | Credential type, borrower ID, optional issuer ID | `Promise<Credential>` | Validates eligibility, issuer trust, status-list capacity in the store | `POST /issue/:type` | Covered by Prompt 3 |
| `revokeCredential(id)` | credential | Credential ID | `Promise<{ id, status: 'revoked' }>` | Flips status, updates status list, adds chain events | `POST /revoke` | Covered by Prompt 4 |
| `getStatusList(issuerId, listId?)` | credential | Issuer ID, optional list ID | `Promise<StatusList \| null>` | Returns from store | `GET /status/:issuer/:listId` | Covered by Prompt 4 |
| `getBorrowers()` | wallet | None | `Promise<Borrower[]>` | Returns all borrowers from store | `GET /borrowers` | NEEDS BACKEND |
| `getBorrower(id)` | wallet | Borrower ID | `Promise<Borrower \| null>` | Finds in store | `GET /borrowers/:id` | NEEDS BACKEND |
| `getCredentials(borrowerId)` | wallet | Borrower ID | `Promise<Credential[]>` | Filters by subjectId in store | `GET /borrowers/:id/credentials` | NEEDS BACKEND |
| `getMandates(borrowerId)` | wallet | Borrower ID | `Promise<Mandate[]>` | Filters by borrowerId in store | `GET /borrowers/:id/mandates` | NEEDS BACKEND |
| `proposeMandate(text)` | mandate | Natural-language request (1–500 chars) | `Promise<MandateProposal>` | Parses amount with regex, infers purpose | `POST /mandates/proposal` | Covered by Prompt 8 |
| `createMandate(input)` | mandate | Mandate fields + signature | `Promise<Mandate>` | Validates amount cap, disclosure rules, wallet signature | `POST /mandates` | Covered by Prompt 8 |
| `revokeMandate(id)` | mandate | Mandate ID | `Promise<{ id, status: 'revoked' }>` | Revokes mandate, stops runs, updates requests | `POST /mandates/:id/revoke` | Covered by Prompt 8 |
| `startRun(mandateId)` | runs | Active mandate ID | `Promise<AgentRun>` | Creates lender requests, offers, run state | `POST /runs` | NEEDS BACKEND |
| `subscribeRun(runId)` | runs | Run ID | `Promise<AgentRun \| null>` | Returns from store | `GET /runs/:id` | Covered by Prompt 10 (SSE) |
| `acceptOffer(runId, offerId, signature)` | runs | Run ID, offer ID, borrower signature | `Promise<{ runId, offerId, accepted, txHash? }>` | Validates wallet signature, updates state, records chain events | `POST /runs/:id/accept` | Covered by Prompt 11 |
| `getOffers(runId)` | runs | Run ID | `Promise<Offer[]>` | Filters offers by runId in store | `GET /runs/:id/offers` | NEEDS BACKEND |
| `getActivity(borrowerId)` | activity | Borrower ID | `Promise<ActivityEntry[]>` | Scoped to borrower's mandates | `GET /activity?borrower=` | Covered by Prompt 11 |
| `addMockReceipt(input)` | activity | mandateId, lenderId, categories, requestId | `Promise<ConsentReceipt>` | Creates receipt, adds chain event | `POST /disclosure-receipts` | NEEDS BACKEND |
| `getLenders()` | lender | None | `Promise<Lender[]>` | Returns from store | `GET /lenders` | NEEDS BACKEND |
| `getLenderRequests(lenderId)` | lender | Lender ID | `Promise<LenderRequest[]>` | Filters by lenderId in store | `GET /lenders/:id/requests` | Covered by Prompt 7 |
| `getPolicies(lenderId?)` | lender | Optional lender ID | `Promise<LenderPolicyDocument[]>` | Filters policies in store | `GET /lenders/:id/policy` | NEEDS BACKEND |
| `getAdminOverview()` | admin | None | `Promise<AdminOverview>` | Combines admin data with issuers/lenders | `GET /admin/overview` | NEEDS BACKEND |
| `getIssuers()` | admin | None | `Promise<Issuer[]>` | Returns from store | `GET /issuers` | NEEDS BACKEND |
| `getAuditLog()` | admin | None | `Promise<AuditEntry[]>` | Returns entries, applies simulated tampering | `GET /audit` | NEEDS BACKEND |
| `verifyAuditChain()` | admin | None | `Promise<AuditVerifyResult>` | Recomputes hash chain, finds first break | `GET /audit/verify` | Covered by Prompt 9 |
| `getAttackScenarios()` | admin | None | `Promise<AttackScenario[]>` | Returns from store | `GET /lab/attack-scenarios` | NEEDS BACKEND |
| `getChainEvents(filter?)` | chain | Optional type, limit | `Promise<ChainEvent[]>` | Filters and slices from store | `GET /chain/events` | NEEDS BACKEND |

## Architecture

```
lib/api/
├── index.ts          # API router: picks mock or live per group, flat re-exports
├── types.ts          # TypeScript interfaces for each group
├── http.ts           # Typed fetch wrapper (timeout, auth, zod, PolicyDenied)
├── mock-api.ts       # Original mock implementations (unchanged)
├── seed-data.ts      # JSON seed loader (unchanged)
├── README.md         # This file
├── mock/
│   ├── index.ts      # Barrel export
│   ├── credential.ts # Mock credential group
│   ├── wallet.ts     # Mock wallet group
│   ├── mandate.ts    # Mock mandate group
│   ├── runs.ts       # Mock runs group
│   ├── activity.ts   # Mock activity group
│   ├── lender.ts     # Mock lender group
│   ├── admin.ts      # Mock admin group
│   └── chain.ts      # Mock chain group
└── live/
    ├── index.ts      # Barrel export
    ├── credential.ts # Live → POST /issue/:type, POST /revoke, GET /status/…
    ├── wallet.ts     # Live → GET /borrowers/…
    ├── mandate.ts    # Live → POST /mandates/…
    ├── runs.ts       # Live → POST /runs, GET /runs/:id, POST /runs/:id/accept
    ├── activity.ts   # Live → GET /activity, POST /disclosure-receipts
    ├── lender.ts     # Live → GET /lenders/…
    ├── admin.ts      # Live → GET /admin/…, GET /issuers, GET /audit/…
    └── chain.ts      # Live → GET /chain/events

lib/schemas/
└── index.ts          # Zod schemas for all data files and API responses
```

## How to switch a group live

1. Build and start the backend service for that group.
2. Set the env vars:
   ```env
   NEXT_PUBLIC_API_MODE=live
   NEXT_PUBLIC_LIVE_GROUPS=credential
   NEXT_PUBLIC_CREDENTIAL_URL=http://localhost:4000
   ```
3. Restart the dev server. The credential group now calls the real service; all other groups stay on mock.

## Error handling

- `ApiError` — standard HTTP error with `{ code, message, rule? }`
- `PolicyDenied extends ApiError` — carries a `rule` name so the UI can show rule chips
- `NetworkError` — fetch failed (offline, DNS, etc.)
- `TimeoutError` — request exceeded the configured timeout (default 15 s)

## Zod validation

All response schemas live in `lib/schemas/index.ts`. In development, the HTTP client logs validation mismatches but still returns the data. In production, consider throwing on validation failures.

The existing data-file schemas in `data/schemas.ts` are re-exported from `lib/schemas/index.ts` for unified access.
