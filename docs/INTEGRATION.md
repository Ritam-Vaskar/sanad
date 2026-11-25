# SANAD — Frontend Integration Contract

**Tag:** `frontend-v1`  
**Date:** 2026-11-26  
**Scope:** Next.js frontend at `apps/web` (this repo). Describes every connection point between the UI and the backend services defined in the build playbook (`claude.md`).

---

## 1. API function table

Every UI data function, its group, the TypeScript interface file, the Zod schema used to validate the response, the backend prompt that should deliver the endpoint, and current wiring status.

Schema files: `lib/api/types.ts` for request/response TypeScript types; `lib/schemas/index.ts` for Zod validators (re-exports `data/schemas.ts`).

| Function | Group | TS interface | Live endpoint | Backend prompt | Status |
|---|---|---|---|---|---|
| `issueCredential(type, subjectId, issuerId?)` | credential | `CredentialApi` | `POST /issue/:type` | Prompt 3 | **Covered** |
| `revokeCredential(id)` | credential | `CredentialApi` | `POST /revoke` | Prompt 4 | **Covered** |
| `getStatusList(issuerId, listId?)` | credential | `CredentialApi` | `GET /status/:issuer/:listId` | Prompt 4 | **Covered** |
| `getBorrowers()` | wallet | `WalletApi` | `GET /borrowers` | — | **NEEDS BACKEND** |
| `getBorrower(id)` | wallet | `WalletApi` | `GET /borrowers/:id` | — | **NEEDS BACKEND** |
| `getCredentials(borrowerId)` | wallet | `WalletApi` | `GET /borrowers/:id/credentials` | — | **NEEDS BACKEND** |
| `getMandates(borrowerId)` | wallet | `WalletApi` | `GET /borrowers/:id/mandates` | — | **NEEDS BACKEND** |
| `proposeMandate(text)` | mandate | `MandateApi` | `POST /mandates/proposal` | Prompt 8 | **Covered** |
| `createMandate(input)` | mandate | `MandateApi` | `POST /mandates` | Prompt 8 | **Covered** |
| `revokeMandate(id)` | mandate | `MandateApi` | `POST /mandates/:id/revoke` | Prompt 8 | **Covered** |
| `startRun(mandateId)` | runs | `RunsApi` | `POST /runs` | — | **NEEDS BACKEND** |
| `subscribeRun(runId)` | runs | `RunsApi` | `GET /runs/:id/events` (SSE) | Prompt 10 | **Covered** |
| `acceptOffer(runId, offerId, signature)` | runs | `RunsApi` | `POST /runs/:id/accept` | Prompt 11 | **Covered** |
| `getOffers(runId)` | runs | `RunsApi` | `GET /runs/:id/offers` | — | **NEEDS BACKEND** |
| `getActivity(borrowerId)` | activity | `ActivityApi` | `GET /activity?borrower=:id` | Prompt 11 | **Covered** |
| `addMockReceipt(input)` | activity | `ActivityApi` | `POST /disclosure-receipts` | — | **NEEDS BACKEND** |
| `getLenders()` | lender | `LenderApi` | `GET /lenders` | — | **NEEDS BACKEND** |
| `getLenderRequests(lenderId)` | lender | `LenderApi` | `GET /lenders/:id/requests` | Prompt 7 | **Covered** |
| `getPolicies(lenderId?)` | lender | `LenderApi` | `GET /lenders/:id/policy` | — | **NEEDS BACKEND** |
| `getAdminOverview()` | admin | `AdminApi` | `GET /admin/overview` | — | **NEEDS BACKEND** |
| `getIssuers()` | admin | `AdminApi` | `GET /issuers` | — | **NEEDS BACKEND** |
| `getAuditLog()` | admin | `AdminApi` | `GET /audit` | — | **NEEDS BACKEND** |
| `verifyAuditChain()` | admin | `AdminApi` | `GET /audit/verify` | Prompt 9 | **Covered** |
| `getAttackScenarios()` | admin | `AdminApi` | `GET /lab/attack-scenarios` | — | **NEEDS BACKEND** |
| `getChainEvents(filter?)` | chain | `ChainApi` | `GET /chain/events` | — | **NEEDS BACKEND** |

**Summary:** 11 functions are covered by the prompts; 14 need backend endpoints that the playbook does not yet define.

---

## 2. Endpoints the UI needs that the backend plan does not define

The build playbook (Prompts 3–11) describes specific endpoints but leaves the following gaps. Each one is called by real UI code and must be provided before the corresponding API group can go live.

### Core service (`NEXT_PUBLIC_CORE_URL`)

| Endpoint | Called by | Purpose |
|---|---|---|
| `POST /runs` | `startRun(mandateId)` | Creates a new agent run for the given active mandate; returns an `AgentRun` with an `id` the UI uses to subscribe to SSE. |
| `GET /runs/:id/offers` | `getOffers(runId)` | Returns all `Offer` objects produced in a completed run; the offers screen polls or fetches this once the SSE stream ends. |
| `POST /disclosure-receipts` | `addMockReceipt(input)` | Records a consent receipt after a lender presentation; returns the full `ConsentReceipt` including `commitmentHash`, `txHash`, and `block`. |
| `GET /borrowers` | `getBorrowers()` | Returns all borrower profiles. Used by the Demo Panel persona switcher and the issuer subjects screen. |
| `GET /borrowers/:id` | `getBorrower(id)` | Returns a single borrower profile. Used to load every borrower screen. |
| `GET /borrowers/:id/credentials` | `getCredentials(borrowerId)` | Returns all credentials in the borrower's wallet. Used on every borrower screen. |
| `GET /borrowers/:id/mandates` | `getMandates(borrowerId)` | Returns all mandates for a borrower. Used on the assistant, activity, and mandate detail screens. |
| `GET /lenders` | `getLenders()` | Returns all registered lenders. Used on the assistant (to list approved lenders in the permission slip) and the admin portal. |
| `GET /lenders/:id/policy` | `getPolicies(lenderId?)` | Returns the versioned policy document for a lender. Used on the lender policy screen and the offer comparison screen. |
| `GET /admin/overview` | `getAdminOverview()` | Returns aggregated admin data: chain status, counts, governance log, queue, plus embedded `issuers[]` and `lenders[]` arrays. |
| `GET /issuers` | `getIssuers()` | Returns all registered issuers. Used by the admin registry, the issuer portal entity switcher, and lender trusted-issuer screens. |
| `GET /audit` | `getAuditLog()` | Returns the full hash-chained audit log. Used on the admin audit screen and by `verifyAuditChain()`. |
| `GET /lab/attack-scenarios` | `getAttackScenarios()` | Returns the list of Attack Lab scenario definitions (title, description, stage, rule). |

### Credential service (`NEXT_PUBLIC_CREDENTIAL_URL`)

No additional endpoints beyond those in Prompt 3 and 4. The credential group is fully covered once `/issue/:type`, `/revoke`, and `/status/:issuer/:listId` are deployed.

### Chain / indexer (no dedicated URL variable yet)

| Endpoint | Called by | Purpose |
|---|---|---|
| `GET /chain/events` | `getChainEvents(filter?)` | Returns indexed on-chain events (MandateCreated, DisclosureRecorded, StatusRootUpdated, IssuerRegistered, etc.) filtered by type and paginated by limit. Used by the Explorer live feed and the admin overview. |

> **Action item:** Add `NEXT_PUBLIC_CHAIN_URL` to the environment and update `lib/api/live/chain.ts` to point at the indexer rather than the core service. The chain group has its own ethers-based reader in `lib/chain/ethers.ts` that can serve as an alternative if a REST indexer is not available.

---

## 3. What the mock simulates — real system requirements

The following behaviors are **fully functional in the mock** and must be replaced with real implementations before production use. The UI behavior (screens, rule chips, error states) will be unchanged; only the data source changes.

### 3.1 Credential signing and verification

**Mock:** `issueCredential` in `lib/api/mock/credential.ts` constructs a `Credential` object in memory and writes it to the Zustand store. No SD-JWT is produced; there is no cryptographic signature.

**Real system must:**
- Accept a subject `did:key` and profile ID, run eligibility checks, and produce a fully signed SD-JWT VC (ES256K or P-256 as decided in Prompt 3).
- Include `cnf` (holder public key), `iss`, `iat`, `exp`, and a status reference (`statusListIndex` + list URI) in the JWT payload.
- Mark employer name, platform name, and average monthly inflows as selectively disclosable but not shared by default.
- Return the SD-JWT string; the UI stores it in the wallet credential list.

### 3.2 Credential status lists

**Mock:** `revokeCredential` flips a bit in the in-memory `statusLists` array and fabricates a `txHash`. `getStatusList` returns that in-memory array.

**Real system must:**
- Maintain a per-issuer gzip+base64url bitstring status list signed as a JWT, served at `GET /status/:issuer/:listId`.
- On revocation: flip the bit, re-sign the list, call `updateStatusRoot` on `SanadTrustRegistry` with the list hash, and return the on-chain `txHash`.
- The `listHash` in the returned `StatusList` must match the value stored on-chain so the lender's verification step can compare them.

### 3.3 Wallet key handling and SD-JWT presentation

**Mock:** The browser wallet (`lib/crypto/wallet.ts`) generates a real P-256 key pair with Web Crypto and stores it AES-GCM encrypted in the Zustand store. Signing uses `crypto.subtle.sign`. However, `present()` in `lib/wallet/mock.ts` does not produce a real SD-JWT presentation — it returns a stub string.

**Real system must:**
- Implement `present(credentialId, requestedClaims[], { nonce, aud })` as described in Prompt 5: build an SD-JWT presentation disclosing only the requested claims, attach a key-binding JWT signed with the wallet key (ECDSA P-256 → JWS r‖s form), and return the full SD-JWT presentation string.
- The key-binding JWT must include `nonce`, `aud`, and `iat` so the verifier can check replay and audience.
- The wallet must implement `signTypedData('Mandate', payload)` and `signTypedData('Acceptance', payload)` using EIP-712 canonical encoding over the same P-256 key (or a parallel secp256k1 key for Ethereum compatibility — this is the ES256K vs P-256 decision from Prompt 3).

### 3.4 Mandate signature verification

**Mock:** `createMandate` in `lib/api/mock/mandate.ts` calls `verifyWalletMessage` from `lib/crypto/wallet.ts`, which does perform real P-256 ECDSA verification using the stored public key. This is the one piece of real cryptography in the mock path.

**Real system must:**
- Accept the signed mandate at `POST /mandates`, verify the EIP-712 signature against `borrower.ethAddress`, call `createMandate` on `SanadMandateLedger`, and return the `mandateHash` and `txHash`.
- Enforce all PEP rules at the API boundary: amount cap (₹1,00,000), disclosure restrictions (employerName, rawStatements, exactIncome always false), `allowAccept` always false, expiry at most 24 hours, lenders must be registered and active.

### 3.5 On-chain writes

**Mock:** The store fabricates `txHash` values for mandate creation, credential revocation, disclosure receipts, and registry changes. No actual transactions are submitted.

**Real system must:**
- Use the relayer wallet (web3.py, `services/core`) to call `SanadMandateLedger.createMandate`, `revokeMandate`, and `recordDisclosure`.
- Use the issuer key (services/credential) to call `SanadTrustRegistry.updateStatusRoot` on revocation.
- Return real `txHash` values in every response that claims to record something on-chain.
- Enforce the daily transaction cap (`admin.chainStatus.dailyTransactionCap`) in the relayer; the Admin portal displays the current usage.

### 3.6 SSE run events

**Mock:** `lib/sim/runSimulator.ts` replays scripted steps from `data/runs.json` on `setTimeout`, respecting the demo speed setting. It checks mandate revocation mid-run and emits a blocked event. The browser does not connect to any real SSE endpoint.

**Real system must:**
- Expose `GET /runs/:id/events` as a Server-Sent Events stream.
- Emit typed `RunStep` events (see `lib/runs/types.ts`) as the LangGraph agent progresses through nodes: intent understood → mandate validated → lenders discovered → per-lender: permission check / presentation request / proof shared / offer received → offers compared → awaiting acceptance.
- Include `pepRule` and `decision` fields on every PEP gate event so the UI can show rule chips.
- When the borrower wallet needs to present, emit a `presentation_request` event; the UI's `SseRunEvents` client in `lib/runs/sse.ts` receives this, calls `wallet.present()`, and POSTs the result to `POST /runs/:id/presentation`.
- If the mandate is revoked mid-run, emit a `blocked` event with `pepRule: "mandate_revoked"` and close the stream.

### 3.7 PEP (Policy Enforcement Point) decisions

**Mock:** `lib/verification.ts` runs deterministic rule checks against the in-memory store. The mock `runSimulator.ts` checks mandate revocation but does not call a real PEP for every step.

**Real system must:**
- Implement `pep.authorize(action, ctx)` in `services/core/pep` (Prompt 9) with the following action types: `search_lenders`, `request_offer`, `disclose`, `accept_loan`, `disclose_bank_statement`.
- Check in order: mandate exists and signature is valid → not revoked (Redis cache, 5 s TTL) → not expired → action is in the allowed set → amount and EMI within mandate limits → lender is allowed and active in the registry → requested disclosure categories are a subset of the mandate mask → `accept_loan` and `disclose_bank_statement` are always denied for the agent.
- Write an audit log entry for every decision (allow or deny) with `actor`, `action`, `decision`, `rule`, `mandateId`, and `timestamp`.
- Return the rule name in the response body so the UI can display it as a rule chip.

### 3.8 Chain indexing

**Mock:** `lib/sim/chainFeed.ts` appends synthetic `ChainEvent` objects to the store on a timer. The Explorer reads from the store, not from an RPC node.

**Real system must:**
- Index `SanadTrustRegistry` and `SanadMandateLedger` events (IssuerRegistered, LenderRegistered, StatusRootUpdated, MandateCreated, MandateRevoked, DisclosureRecorded) from the testnet.
- Expose these at `GET /chain/events` (filterable by `type`, paginated by `limit` and `before`), **or** let the UI read directly via ethers v6 with `lib/chain/ethers.ts` using `NEXT_PUBLIC_RPC_URL` and addresses from `shared/deployments.json`.
- Decoded fields must contain only public identifiers (IDs, hashes). No personal data.
- The Explorer "live feed" should update within 10 seconds of a new on-chain event (either long-polling or SSE from the indexer, or a direct `eth_getLogs` poll from the browser).

---

## 4. Environment variables

All `NEXT_PUBLIC_*` variables are embedded at build time and exposed to the browser. Secret values must never be `NEXT_PUBLIC_*`.

| Variable | Default | Required when | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_MODE` | `mock` | Always | `mock` runs entirely on local JSON seed data. `live` enables live groups listed in `NEXT_PUBLIC_LIVE_GROUPS`. |
| `NEXT_PUBLIC_LIVE_GROUPS` | _(empty)_ | `API_MODE=live` | Comma-separated list of group names to route to the real backend. Valid values: `credential`, `wallet`, `mandate`, `runs`, `activity`, `lender`, `admin`, `chain`. Groups not listed remain on mock. |
| `NEXT_PUBLIC_CORE_URL` | _(empty)_ | Any core-service group is live | Base URL of `services/core` (FastAPI). Example: `https://api.sanad.demo`. No trailing slash. Required for groups: `wallet`, `mandate`, `runs`, `activity`, `lender`, `admin`. |
| `NEXT_PUBLIC_CREDENTIAL_URL` | _(empty)_ | `credential` group is live | Base URL of `services/credential` (Fastify). Example: `https://cred.sanad.demo`. No trailing slash. |
| `NEXT_PUBLIC_CHAIN_URL` | _(empty)_ | `chain` group is live via indexer | Base URL of the chain indexer REST API. If not set, `lib/chain/ethers.ts` reads directly from the RPC node using `NEXT_PUBLIC_RPC_URL`. |
| `NEXT_PUBLIC_RPC_URL` | _(empty)_ | `chain` group uses direct RPC | Testnet RPC endpoint (Base Sepolia or Polygon Amoy). Never use a mainnet URL. |
| `NEXT_PUBLIC_REGISTRY_ADDRESS` | _(empty)_ | `chain` group uses direct RPC | Deployed address of `SanadTrustRegistry`. Read from `shared/deployments.json` once contracts are deployed. |
| `NEXT_PUBLIC_LEDGER_ADDRESS` | _(empty)_ | `chain` group uses direct RPC | Deployed address of `SanadMandateLedger`. |
| `NEXT_PUBLIC_CHAIN_ID` | `84532` | `chain` group uses direct RPC | EVM chain ID. `84532` = Base Sepolia. `80002` = Polygon Amoy. |

> **Never commit real values.** Copy `.env.example` to `.env.local` and fill in values locally. `.env.local` is in `.gitignore`.

---

## 5. Running in mock mode and switching groups live

### 5.1 Full mock mode (default)

No backend required. All data comes from JSON files in `data/` through the Zustand store.

```env
# .env.local — mock mode (can also be omitted entirely; this is the default)
NEXT_PUBLIC_API_MODE=mock
```

```bash
pnpm dev
```

The app starts immediately with Rahul's seed data. Reset Demo in the floating panel restores the original records.

### 5.2 Switching one group live

Build and start the backend service for that group, then set the env vars and restart the dev server. All other groups continue on mock.

**Example: go live on the credential group only**

```env
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_LIVE_GROUPS=credential
NEXT_PUBLIC_CREDENTIAL_URL=http://localhost:4000
```

```bash
pnpm dev
```

The issuer portal now calls the real credential service for `/issue/:type`, `/revoke`, and `/status/:issuer/:listId`. Everything else (borrower wallet, mandates, runs, lenders, admin, chain) stays on mock data.

**Example: credential + mandate + runs live**

```env
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_LIVE_GROUPS=credential,mandate,runs
NEXT_PUBLIC_CREDENTIAL_URL=http://localhost:4000
NEXT_PUBLIC_CORE_URL=http://localhost:8000
```

### 5.3 Recommended switch-on sequence

Match each switch to the backend step that provides the endpoint. Keep earlier groups on mock until the step that depends on them is also live, to avoid partial flows.

| Step | Switch live | What unlocks |
|---|---|---|
| Prompt 4 deployed and tested | `credential` | Real credential issuance and revocation; issuer status grid reflects the live status list. |
| Prompt 5 (wallet library) done | Real `wallet.present()` in `lib/wallet/live.ts` | SD-JWT presentations sent to lenders; key-binding JWT checked. No group flag needed — the wallet hook is switched separately via `lib/wallet/use-wallet.ts`. |
| Prompt 7 deployed | `lender` | Real lender request detail; verification checklist comes from the backend verifier. |
| Prompts 8 + 9 deployed | `mandate` | Mandate creation and revocation write to the chain; PEP decisions appear as rule chips. |
| Prompts 10 + 11 deployed | `runs` | Live SSE timeline; acceptance requires a real borrower signature verified server-side. |
| Prompt 11 + chain indexer | `activity`, `chain` | Consent receipts match on-chain DisclosureRecorded events; Explorer reads real events. |

### 5.4 Verifying a group switch

After switching a group, run the full golden path manually before switching another group:

1. Rahul: onboarding → passport shows 3 credentials.
2. Issue a new credential in the issuer portal; it appears in the passport.
3. Revoke it; the lender request detail shows a failing check.
4. Assistant → sign a mandate → watch agent → compare offers → accept → see consent receipt.
5. Explorer shows the mandate and receipt events.
6. Attack Lab: all 8 scenarios end Blocked.

If any step fails with a network or validation error, check the browser console for `[api]` prefixed messages. The `http.ts` wrapper logs Zod mismatches in development without throwing, so a schema mismatch will appear as a warning before it causes a UI problem.

---

## Appendix: schema files quick reference

| Data entity | Zod schema | TypeScript type |
|---|---|---|
| Borrower | `borrowersSchema` | `Borrower` |
| Credential | `credentialsSchema` | `Credential` |
| Issuer | `issuersSchema` | `Issuer` |
| Lender | `lendersSchema` | `Lender` |
| Mandate | `mandatesSchema` | `Mandate` |
| Agent run | `runsSchema` | `AgentRun` |
| Offer | `offersSchema` | `Offer` |
| Lender request | `lenderRequestsSchema` | `LenderRequest` |
| Activity entry | `activitySchema` | `ActivityEntry` |
| Chain event | `chainEventsSchema` | `ChainEvent` |
| Status list | `statusListsSchema` | `StatusList` |
| Policy document | `policiesSchema` | `LenderPolicyDocument` |
| Audit entry | `auditLogSchema` | `AuditEntry` |
| Attack scenario | `attackScenariosSchema` | `AttackScenario` |
| Admin data | `adminSchema` | `AdminData` |

All schemas are defined in `data/schemas.ts` and re-exported from `lib/schemas/index.ts`.
