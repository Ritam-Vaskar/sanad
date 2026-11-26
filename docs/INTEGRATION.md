# SANAD Frontend–Backend Integration Guide

This document maps the Next.js frontend (`apps/web`) to the backend services (`services/credential`, `services/core`) and smart contracts (`contracts/`), covering API contracts, C6 seam interfaces, missing endpoints, real-world requirements replaced by mocks, environment variables, and how to run in mock vs. live mode.

---

## 1. API Functions & Seam Interfaces

All frontend API calls go through [`apps/web/lib/api/index.ts`](../apps/web/lib/api/index.ts) (8 groups, 23 functions) and the three C6 seam hooks under `apps/web/lib/{wallet,runs,chain}/`.

Response validation schemas live in [`apps/web/lib/schemas/index.ts`](../apps/web/lib/schemas/index.ts) (and [`apps/web/lib/runs/types.ts`](../apps/web/lib/runs/types.ts) for SSE events). Canonical JSON Schemas live in [`shared/schemas/`](../shared/schemas/).

### 1.1 API Groups (`apps/web/lib/api/`)

| Group | Function | Live Endpoint | Request / Response Schema | Backend Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `credential` | `issueCredential(type, subjectId, selectedIssuerId?)` | `POST /issue/:type` | Body: `{ subjectId, issuerId? }` → `credentialResponseSchema` (`KycCredential` / `GigIncomeCredential` / `CashFlowCredential`) | Prompt 3 | Covered |
| `credential` | `revokeCredential(id)` | `POST /revoke` | Body: `{ id }` → `revokeResponseSchema` | Prompt 4 | Covered |
| `credential` | `getStatusList(issuerId, listId?)` | `GET /status/:issuer/:listId` | Query: path params (`default` if omitted) → `statusListResponseSchema` | Prompt 4 | Covered |
| `wallet` | `getBorrowers()` | `GET /borrowers` | — → `borrowerListResponseSchema` | — | **NEEDS BACKEND** |
| `wallet` | `getBorrower(id)` | `GET /borrowers/:id` | — → `borrowerResponseSchema` | — | **NEEDS BACKEND** |
| `wallet` | `getCredentials(borrowerId)` | `GET /borrowers/:id/credentials` | — → `credentialListResponseSchema` | — | **NEEDS BACKEND** |
| `wallet` | `getMandates(borrowerId)` | `GET /borrowers/:id/mandates` | — → `mandateListResponseSchema` | — | **NEEDS BACKEND** |
| `mandate` | `proposeMandate(text)` | `POST /mandates/proposal` | Body: `{ text }` → `mandateProposalResponseSchema` (`Mandate.schema.json`) | Prompt 8 | Covered |
| `mandate` | `createMandate(input)` | `POST /mandates` | Body: `CreateMandateInput` → `mandateResponseSchema` (`Mandate.schema.json`) | Prompt 8 | Covered |
| `mandate` | `revokeMandate(id)` | `POST /mandates/:id/revoke` | Body: `{}` → `revokeResponseSchema` | Prompt 8 | Covered |
| `runs` | `startRun(mandateId)` | `POST /runs` | Body: `{ mandateId }` → `agentRunResponseSchema` | Prompt 10 (SSE only) | **NEEDS BACKEND** |
| `runs` | `subscribeRun(runId)` | `GET /runs/:id` | — → `agentRunResponseSchema` | Prompt 10 (SSE only) | **NEEDS BACKEND** |
| `runs` | `acceptOffer(runId, offerId, signature)` | `POST /runs/:id/accept` | Body: `{ offerId, signature }` → `acceptOfferResponseSchema` | Prompt 11 | Covered |
| `runs` | `getOffers(runId)` | `GET /runs/:id/offers` | — → `offerListResponseSchema` (`Offer.schema.json`) | Prompt 10 / 11 | **NEEDS BACKEND** |
| `activity` | `getActivity(borrowerId)` | `GET /activity?borrower=` | Query: `borrower` → `activityListResponseSchema` | Prompt 11 | Covered |
| `activity` | `addMockReceipt(input)` | `POST /disclosure-receipts` | Body: `MockReceiptInput` → `mockReceiptResponseSchema` | — (mock-only helper) | **NEEDS BACKEND** (remove/bypass in live) |
| `lender` | `getLenders()` | `GET /lenders` | — → `lenderListResponseSchema` | Prompt 7 (per-id only) | **NEEDS BACKEND** |
| `lender` | `getLenderRequests(lenderId)` | `GET /lenders/:id/requests` | — → `lenderRequestListResponseSchema` | Prompt 7 | Covered |
| `lender` | `getPolicies(lenderId?)` | `GET /lenders/:id/policy` or `GET /policies` | — → `policyListResponseSchema` | Prompt 6 / 7 | **NEEDS BACKEND** |
| `admin` | `getAdminOverview()` | `GET /admin/overview` | — → `adminOverviewResponseSchema` | — | **NEEDS BACKEND** |
| `admin` | `getIssuers()` | `GET /issuers` | — → `issuerListResponseSchema` | Prompt 3 (`did.json` only) | **NEEDS BACKEND** |
| `admin` | `getAuditLog()` | `GET /audit` | — → `auditLogResponseSchema` | Prompt 9 (`/audit/verify` only) | **NEEDS BACKEND** |
| `admin` | `verifyAuditChain()` | `GET /audit/verify` | — → `auditVerifyResponseSchema` | Prompt 9 | Covered |
| `admin` | `getAttackScenarios()` | `GET /lab/attack-scenarios` | — → `attackScenarioListResponseSchema` | Prompt 15 (UI-driven) | **NEEDS BACKEND** |
| `chain` | `getChainEvents(filter?)` | `GET /chain/events` | Query: `type?`, `limit?` → `chainEventListResponseSchema` | Prompt 2 / 15 (RPC) | **NEEDS BACKEND** |

### 1.2 C6 Seam Hooks (`apps/web/lib/{wallet,runs,chain}/`)

| Module | Hook / Interface | Live Implementation | Transport / Endpoint | Backend Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `lib/wallet` | `useWallet()` (`WalletProvider`) | `LiveWalletProvider` (`lib/wallet/live.ts`) | Browser IndexedDB + WebCrypto/ethers + `POST /runs/:id/presentation` | Prompt 5 | **NEEDS BACKEND** (stub) |
| `lib/runs` | `useRunEvents()` (`RunEventsSource`) | `SseRunEvents` (`lib/runs/sse.ts`) | `EventSource` `GET /runs/:id/events` + `POST /runs/:id/presentation` (`runEventSchema`) | Prompt 10 | **Partial** (SSE client implemented; requires core service + live wallet) |
| `lib/chain` | `useChain()` (`ChainReader`) | `EthersChainReader` (`lib/chain/ethers.ts`) | `ethers` v6 JSON-RPC (`NEXT_PUBLIC_RPC_URL` + `public/deployments.json`) | Prompt 2 / 15 | **NEEDS BACKEND** (stub; `ethers` not yet installed) |

---

## 2. Endpoints the UI Needs That `claude.md` Does Not Yet Define

`claude.md` Prompts 3–11 define the core protocol endpoints (`/issue/:type`, `/revoke`, `/status/:issuer/:listId`, `/verify`, `/lenders/:id/offer-request`, `/lenders/:id/present`, `/lenders/:id/requests`, `/mandates/proposal`, `/mandates`, `/mandates/:id/revoke`, `/audit/verify`, `/runs/:id/events`, `/runs/:id/presentation`, `/runs/:id/accept`, `/activity`).

To run all portals (`Borrower`, `Issuer`, `Lender`, `Admin`, `Explorer`, `Attack Lab`) in live mode, the backend also needs:

1. **Borrower / Persona directory** (or wallet-session endpoints):
   - `GET /borrowers`
   - `GET /borrowers/:id`
   - `GET /borrowers/:id/credentials` (when reading server-stored metadata instead of local-only IndexedDB)
   - `GET /borrowers/:id/mandates`
2. **Run lifecycle & offer retrieval**:
   - `POST /runs` (create/start a run from `mandateId` and return initial `AgentRun` before opening SSE)
   - `GET /runs/:id` (fetch current `AgentRun` snapshot on reconnect/reload)
   - `GET /runs/:id/offers` (fetch ranked `Offer[]` for `/borrower/offers/[runId]`)
3. **Issuer & Lender directory / policies**:
   - `GET /issuers` (list registered issuers with registry status and key hash)
   - `GET /lenders` (list registered lenders with policy summaries)
   - `GET /lenders/:id/policy` and `GET /policies` (expose versioned policy documents to Lender Portal)
4. **Admin, Audit & Attack Lab**:
   - `GET /admin/overview` (pending registration queue, schema versions, chain status / relayer cap)
   - `GET /audit` (list hash-chained audit entries alongside `GET /audit/verify`)
   - `GET /lab/attack-scenarios` (or live attack-runner endpoints for `/lab`)
5. **Chain indexer / Explorer**:
   - `GET /chain/events` (indexed `SanadTrustRegistry` + `SanadMandateLedger` events, or implement `EthersChainReader` directly against RPC)
6. **Prototype-only endpoint to retire in live mode**:
   - `POST /disclosure-receipts` (`addMockReceipt`): in live mode, disclosure receipts are emitted on-chain by `services/core` during `wallet_present` / `accept` (Prompts 10–11), so the UI should not post mock receipts.

---

## 3. What the Mock Simulates That the Real System Must Do for Real

| Domain | Mock Behaviour (`apps/web`) | Real System Requirement (`services/*`, `contracts/`, `apps/web`) |
| --- | --- | --- |
| **Credential signing & verification** | `mock-api.ts` builds plain JSON `claims[]` with threshold flags and checks `borrower.monthlyIncome` in memory; `startRun()` checks `status` strings in Zustand. | `services/credential` signs real SD-JWT VCs (ES256K / custom signer, `cnf`, `iss`, `iat`, `exp`, status reference), enforces eligibility server-side, and `POST /verify` verifies SD-JWT signature, `did:web` key hash vs `SanadTrustRegistry`, expiry, status bit, key-binding JWT, and nonce/audience. |
| **Status lists** | `status-lists.json` 256-bit array mutated in Zustand on `revokeCredential()`. | Bitstring status list compressed (`gzip` + `base64url`), signed as JWT at `GET /status/:issuer/:listId`, with `POST /revoke` updating the list and calling `SanadTrustRegistry.updateStatusRoot()` on-chain. |
| **Wallet key handling & presentation** | `lib/crypto/wallet.ts` generates a browser WebCrypto P-256 keypair, encrypts JWK with PBKDF2 + AES-GCM in `localStorage` (`sanad-demo-v1`), and `MockWalletProvider.present()` returns a synthetic JSON string. | `LiveWalletProvider` (Prompt 5) uses `ethers` v6 secp256k1 key, derives `did:key` + ETH address, stores encrypted keystore and credentials in IndexedDB, produces real SD-JWT selective-disclosure presentations + JWS `r\|\|s` key-binding JWTs, and signs EIP-712 typed data. |
| **Mandate signature verification** | `createMandate()` verifies a WebCrypto P-256 signature over canonical JSON (`mandateSigningMessage`) in the browser. | `services/core` verifies EIP-712 `Mandate` signature matching `borrower` address, enforces deterministic caps (`<= 100000`, `<= 24h`, `allowAccept=false`, no `employerName`/raw statements), and relays `createMandate` / `revokeMandateWithSig` on-chain. |
| **On-chain writes** | `makeHash()` generates random `0x…` strings, increments `blockHeight` in Zustand, and appends synthetic `ChainEvent`s. | Relayer (`web3.py`) submits real transactions to `SanadTrustRegistry` and `SanadMandateLedger` on testnet (e.g. Base Sepolia), returning real tx hashes and enforcing daily relayer tx caps. |
| **SSE run events** | `simulateRun()` (`lib/sim/runSimulator.ts`) replays scripted `runs.json` steps on `setTimeout` timers. | LangGraph agent in `services/core` streams live node events over SSE `GET /runs/:id/events`, emits `presentation_request` interrupts, waits for `POST /runs/:id/presentation` from `SseRunEvents`, and computes offers via deterministic lender engines. |
| **PEP decisions & audit log** | `mock-api.ts` checks basic `mandate.status` / `allowedLenders` inline; `audit-log.json` is static with a toggleable `simulateTampering` flag. | `services/core/pep.authorize(action, ctx)` enforces every rule (mandate signature, on-chain `isMandateActive` with 5s Redis cache, expiry, caps, lender registry, disclosure subset, `accept_loan` denied) and appends hash-chained entries to MongoDB verified by `GET /audit/verify`. |
| **Chain indexing** | `ExplorerPortal` reads `chainEvents` from Zustand; `chainFeed.ts` appends synthetic events every 8s when `Live` toggle is on. | `EthersChainReader` (`lib/chain/ethers.ts`) queries `NEXT_PUBLIC_RPC_URL` using contract addresses in `apps/web/public/deployments.json` (or a backend indexer at `GET /chain/events`). |

---

## 4. Environment Variables

Configure these in `.env.local` (for `apps/web`) or root `.env` (see [`.env.example`](../.env.example)):

| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_MODE` | `mock` | `"mock"` forces all groups and C6 seams to use mock implementations. `"live"` enables live mode for groups listed in `NEXT_PUBLIC_LIVE_GROUPS`. |
| `NEXT_PUBLIC_LIVE_GROUPS` | `""` | Comma-separated list of groups to run live when `NEXT_PUBLIC_API_MODE=live`. Valid values: `credential`, `wallet`, `mandate`, `runs`, `activity`, `lender`, `admin`, `chain`. |
| `NEXT_PUBLIC_CREDENTIAL_URL` | `http://localhost:4000` | Base URL of `services/credential` (required when `credential` is in `NEXT_PUBLIC_LIVE_GROUPS`). |
| `NEXT_PUBLIC_CORE_URL` | `http://localhost:8000` | Base URL of `services/core` (required when any core group or `runs` SSE is live). |
| `NEXT_PUBLIC_RPC_URL` | `""` | EVM testnet JSON-RPC URL (required by `EthersChainReader` when `chain` is live). |

Live chain reads also expect deployed contract addresses in [`apps/web/public/deployments.json`](../apps/web/public/deployments.json) (`SanadTrustRegistry`, `SanadMandateLedger`).

---

## 5. How to Run

### Mock Mode (default — no backend required)

```bash
# From repo root
pnpm install
pnpm run dev:web
```

Or with explicit env vars:

```bash
NEXT_PUBLIC_API_MODE=mock pnpm --filter sanad-web dev
```

### Live Mode (per group)

Set `NEXT_PUBLIC_API_MODE=live` and list only the groups whose backend endpoints are ready in `NEXT_PUBLIC_LIVE_GROUPS`. Unlisted groups automatically stay on mock:

```bash
# Example: only credential service is live; everything else stays mock
NEXT_PUBLIC_API_MODE=live \
NEXT_PUBLIC_LIVE_GROUPS=credential \
NEXT_PUBLIC_CREDENTIAL_URL=http://localhost:4000 \
pnpm --filter sanad-web dev
```

```bash
# Example: credential + mandate + runs + activity live
NEXT_PUBLIC_API_MODE=live \
NEXT_PUBLIC_LIVE_GROUPS=credential,mandate,runs,activity \
NEXT_PUBLIC_CREDENTIAL_URL=http://localhost:4000 \
NEXT_PUBLIC_CORE_URL=http://localhost:8000 \
pnpm --filter sanad-web dev
```

To run the full stack in Docker Compose (from repo root):

```bash
make up
```
