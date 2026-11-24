# Mock API contract

These in-memory functions are the prototype boundary for future server routes and services. Inputs and outputs are TypeScript-shaped summaries; successful calls return promises unless noted. The demo Zustand store remains the shared source of truth until each endpoint is replaced.

| Mock function | Inputs | Output | Backend endpoint to replace |
| --- | --- | --- | --- |
| `issueCredential(type, subjectId, selectedIssuerId?)` | Credential type, borrower ID, optional issuer ID | `Promise<Credential>`; rejects when eligibility, issuer trust, or status-list capacity fails | `POST /issue/:type` |
| `revokeCredential(id)` | Credential ID | `Promise<{ id, status: 'revoked' }>` | `POST /revoke` |
| `getStatusList(issuerId, listId?)` | Issuer ID and optional list ID | `Promise<StatusList \| null>` | `GET /status/:issuer/:listId` |
| `proposeMandate(text)` | Natural-language request (1–500 characters) | `Promise<{ purpose, maxAmount, maxEmi, allowedLenders, sourceText }>` | `POST /mandates/proposal` |
| `createMandate(input)` | Mandate fields excluding generated ID, hashes, and status | `Promise<Mandate>`; validates amount cap and disclosure privacy rules | `POST /mandates` |
| `revokeMandate(id)` | Mandate ID | `Promise<{ id, status: 'revoked' }>`; also stops runs tied to the mandate | `POST /mandates/:id/revoke` |
| `startRun(mandateId)` | Active mandate ID | `Promise<AgentRun>`; creates lender requests, offers, and run state | `GET /runs/:id/events` (SSE start) |
| `subscribeRun(runId)` | Run ID | `Promise<AgentRun \| null>` | `GET /runs/:id/events` (SSE subscribe) |
| `acceptOffer(runId, offerId, signature)` | Run ID, offer ID, non-empty borrower signature | `Promise<{ runId, offerId, accepted: true }>` | `POST /runs/:id/accept` |
| `getActivity(borrowerId)` | Borrower ID | `Promise<ActivityEntry[]>` scoped to the borrower's mandates | `GET /activity` |
| `getLenderRequests(lenderId)` | Lender ID | `Promise<LenderRequest[]>` | `GET /lenders/:id/requests` |
| `verifyAuditChain()` | None | `Promise<{ valid, brokenIndex, entries }>` | `GET /audit/verify` |
| `getChainEvents(filter?)` | Optional event type and result limit | `Promise<ChainEvent[]>` | Chain RPC / indexer query |
| `addMockReceipt(input)` | Mandate ID, lender ID, disclosed categories, request ID | `Promise<ConsentReceipt>` | `POST /disclosure-receipts` |
| `getBorrowers()` | None | `Promise<Borrower[]>` | `GET /borrowers` |
| `getBorrower(id)` | Borrower ID | `Promise<Borrower \| null>` | `GET /borrowers/:id` |
| `getCredentials(borrowerId)` | Borrower ID | `Promise<Credential[]>` | `GET /borrowers/:id/credentials` |
| `getLenders()` | None | `Promise<Lender[]>` | `GET /lenders` |
| `getIssuers()` | None | `Promise<Issuer[]>` | `GET /issuers` |
| `getMandates(borrowerId)` | Borrower ID | `Promise<Mandate[]>` | `GET /borrowers/:id/mandates` |
| `getOffers(runId)` | Run ID | `Promise<Offer[]>` | `GET /runs/:id/offers` |
| `getAdminOverview()` | None | `Promise<AdminData & { issuers: Issuer[]; lenders: Lender[] }>` | `GET /admin/overview` |
| `getPolicies(lenderId?)` | Optional lender ID | `Promise<LenderPolicyDocument[]>` | `GET /lenders/:id/policy` |
| `getAttackScenarios()` | None | `Promise<AttackScenario[]>` | `GET /lab/attack-scenarios` |
| `getAuditLog()` | None | `Promise<AuditEntry[]>` | `GET /audit` |

