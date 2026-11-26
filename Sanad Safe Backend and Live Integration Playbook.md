# Sanad: Safe Backend and Live Integration Playbook

This is the second playbook. Keep using the original prompts (Prompts 2 to 11 in your claude.md) as the base for each backend step. This one gives you three things: where you actually stand, the safety rules, and a short Delta prompt for each phase that you paste after the original prompt. The deltas fix gaps I found in your integration guide.

## 1. Where you are

| Area | Status | Note |
| --- | --- | --- |
| Prompts 0 and 1 (monorepo scaffold) | Done | apps/web, services/credential, services/core, contracts, shared schemas, compose, Makefile |
| Frontend UI, six portals | Done | Built in v0 and finished with Copilot |
| C5 mock and live API split | Done | NEXT\_PUBLIC\_API\_MODE and NEXT\_PUBLIC\_LIVE\_GROUPS |
| C6 seams (wallet, run events, chain) | Done | useWallet, useRunEvents, useChain with identical mock behaviour |
| C8 integration guide | Done, with gaps | See section 2 |
| C9 move into the monorepo | Done |  |
| C7 tests | Partial | vitest 4 of 4 passes; Playwright never ran because the lockfile policy blocked vitest 5.1.2 (under 24 hours old) and Playwright was not linked |
| C3b shared policy parity | Not done | The mock PEP checks are inline and the audit log is static with a tamper flag |
| Backend | Not started | contracts/ is empty; both services only have /health |

## 2. Findings in your integration guide (fix before building)

1. **Credentials must never be stored on the server.** The guide lists GET /borrowers/:id/credentials. Do not build it. In live mode the wallet group must read credentials from the browser wallet. The backend only offers synthetic profiles (GET /profiles) for personas and the issuer's subject picker.
2. **Some UI actions probably bypass lib/api.** The guide lists 25 functions in its table (it says 23), but none for the issuer credentials table, issuer subjects and activity, admin approve, reject and deactivate, lender policy edit, the offers table or the compliance log. If those change the store directly, they cannot go live. Phase 0 audits this.
3. **Signature shapes.** acceptOffer takes a signature string, but the real call needs an EIP-712 Acceptance object (typed data, signature, signer). Mandates need a fixed disclosureMask bit layout shared by the UI, contract and backend.
4. **Mock and real crypto differ on purpose** (P-256 in the mock, secp256k1 for real). That is fine, but EIP-712 hashes must match across TypeScript, Solidity and Python, so you need shared test vectors.
5. **Attack Lab live needs a real runner.** Otherwise it stays a scripted animation.
6. **Admin has no auth model.** Use clearly labelled demo auth plus an env flag and API key; never expose admin or lab endpoints publicly without them.
7. **Test tooling.** Keep the release-age policy and pin versions older than its window. Do not disable it.

## 3. Safety rules (apply to every phase)

**Git**

- Commit and tag the current frontend now (git tag frontend-v1). Keep main always demo-able in mock mode.
- One branch per phase. Merge to main only when the done-when checks pass. Review every diff that touches env files, keys or dependencies.

**Secrets and keys**

- Only .env.example is committed, with empty values. .env and .env.local are gitignored. Consider a pre-commit secret scanner such as gitleaks.
- Use three throwaway testnet wallets: deployer, relayer, governance. Never reuse a personal wallet. If a key leaks, abandon the wallet and redeploy.
- Never paste private keys or API keys into Copilot chat, and do not attach .env files to a chat.

**Chain**

- Testnet only. Backend, scripts and frontend refuse to run unless the chain id is in a testnet allowlist.
- The relayer may call only your two contracts and known functions, with a daily cap, a per-borrower cap and a balance floor.
- Run forge test before any deploy. Deploy to local anvil first. After any redeploy, run the sync script so addresses match in shared/, apps/web/public and the service envs.

**Dependencies**

- Pin exact versions. Do not install a release newer than about 14 days. Keep the pnpm release-age policy on.

**Backend**

- Validate every request body (zod, pydantic). Standard error shape {code, message, rule?}. CORS allowlist from env. Rate limits. No claims, tokens or personal data in logs.
- Admin and lab endpoints are off unless their env flag and an API key are set.
- The LLM only proposes. Treat lender text as untrusted data, validate model output against a schema, set timeouts, and never give it keys.

**Rollback**

- Every phase can be undone by switching its group flag back to mock or reverting to the last tag. Never delete mock mode; it is your demo fallback.

**Windows**

- Run Foundry, Python services, make and Docker from WSL2 to avoid path, line-ending and tooling problems.

## 4. Roadmap

| Phase | Branch | Original prompt | Result | Rollback |
| --- | --- | --- | --- | --- |
| 0 Stabilise and freeze | phase-0-freeze | none | Green tests, API gaps closed, protocol frozen | revert to frontend-v1 |
| 1 Contracts | phase-1-contracts | 2 | Contracts tested and on testnet, test vectors | redeploy, keep chain group on mock |
| 2 Credential service | phase-2-credential | 3, 4 | Real issue, revoke, status, verify | credential flag back to mock |
| 3 Live wallet | phase-3-wallet | 5 | Real keys, presentations, signatures in the browser | wallet flag back to mock |
| 4 Lender | phase-4-lender | 6, 7 | Engines, policies, gateway, lender data endpoints | lender flag back to mock |
| 5 Mandates, PEP, audit | phase-5-mandate | 8, 9 | Signed mandates on-chain, enforcement, audit chain | mandate flag back to mock |
| 6 Agent, accept, receipts | phase-6-runs | 10, 11 | Live run over SSE, acceptance, on-chain receipts | runs and activity back to mock |
| 7 Directory, admin, chain, lab | phase-7-admin | none (new) | Remaining endpoints and the live Attack Lab | admin flag back to mock |
| 8 Go live per group | per group | none | Each group switched live with tests | flag back to mock |
| 9 Harden, deploy, submit | phase-9-ship | 16, 17, 18 | Public URL, deck, README | previous tag |

## 5. How to run each phase

1. Create the phase branch.
2. Run the original prompt from claude.md (where one is listed).
3. Paste the Delta prompt below.
4. Run the done-when checks.
5. Review the diff, commit, merge to main, tag.

### Phase 0: Stabilise and freeze

**P0.1 Fix test tooling**

```text
Fix the test tooling without weakening the pnpm release-age policy. Pin vitest, @playwright/test and related packages to the newest versions that are older than the policy window; do not disable the policy or add exceptions. Link @playwright/test in apps/web, install the browsers, and get the check script (typecheck, lint, vitest, build, Playwright in mock mode) green from a clean clone. Report every version you pinned and why.
```

**P0.2 API coverage audit**

```text
Audit apps/web for every place that reads or writes data without going through lib/api: direct store mutations in components or lib/store, imports of seed data, local helpers that change state. List them in docs/api-gaps.md with file, action and the API group that should own it. Then add the missing functions to the interfaces and to the mock and live implementations (live ones may be stubs marked NEEDS BACKEND) and route the UI through them: issuer subjects list, issued credentials table, issuer activity, credential revoke, admin approve, reject and deactivate, lender policy save, offers list, compliance log, consent and activity writes. Mock behaviour must not change. Update docs/INTEGRATION.md (fix the function count) and keep typecheck, lint, tests and build green.
```

**P0.3 Freeze the protocol**

```text
Create docs/PROTOCOL.md and matching shared schemas as the single contract for the frontend, contracts and backend.
1 Disclosure categories with fixed bit positions for disclosureMask: kycStatus 0, ageOver21 1, incomeThreshold 2, incomeBand 3, cashflowStability 4, employerName 5 (protected), rawStatements 6 (protected), exactIncome 7 (protected). Add helpers converting UI booleans to a mask and back (TypeScript now, Python later).
2 EIP-712 types: Mandate(address borrower,uint256 maxAmount,uint256 maxEmi,bytes32 lendersHash,uint32 disclosureMask,uint256 nonce,uint64 expiry) and Acceptance(bytes32 mandateId,bytes32 offerHash,uint64 expiry,uint256 nonce), domain name Sanad, version 1, with chainId and verifying contract. Define SignedAcceptance as {typedData, signature, signer} and change acceptOffer to take it.
3 Rule names with their UI chip text (amount_cap, emi_range, lender_not_registered, lender_inactive, expiry_window, protected_category, accept_not_delegable, plus the PEP and verification rules) and the standard error shape {code, message, rule?}. Make the mock return exactly these.
4 SSE run event types as zod, including presentation_request.
5 An endpoint ownership table: which service (credential or core) serves each endpoint.
6 shared/test-vectors/eip712.json with 3 fixed Mandate and 3 fixed Acceptance examples (inputs now; expected hashes filled in Phase 1).
Do not change UI behaviour except where these shapes require it.
```

**Done when:** the check script is green including Playwright; docs/api-gaps.md is empty or only lists stubs; docs/PROTOCOL.md exists. Then tag phase-0-done.

### Phase 1: Contracts (Prompt 2, then this Delta)

```text
Additions to the contracts:
1 Add Pausable to SanadMandateLedger (the owner can pause createMandate and recordDisclosure) and two-step ownership transfer on both contracts.
2 Use the exact EIP-712 types and domain from docs/PROTOCOL.md. Add a Foundry test that computes the Mandate and Acceptance hashes for the fixed inputs and writes the expected values into shared/test-vectors/eip712.json.
3 Add fuzz tests for createMandate (random expiry and nonce) and for recordDisclosure authorisation.
4 Add scripts/sync-deployments.mjs that copies deployments.json to shared/ and apps/web/public/ and updates the address entries in the env example files (never real keys).
5 No private keys in code or scripts; read from env. The deploy script must refuse to run unless the chain id is in an allowlist of testnets.
Do not deploy to a testnet until forge test passes and a local anvil deployment plus the registration script works.
```

**Done when:** forge test is green; anvil deploy and registration work; testnet deploy done and addresses synced in all three places; the test-vector file has real hashes.

### Phase 2: Credential service (Prompts 3 and 4, then this Delta)

```text
Additions:
1 GET /profiles: synthetic borrower profiles for personas and the issuer subject picker. GET /issuers/:id/issued: issuance log metadata only (credential id, type, subject alias, status index, status, dates); never claim values.
2 GET /issuers (registry status joined with issuer metadata). Record in docs/PROTOCOL.md which service serves it.
3 /verify returns the ordered named checks using the rule names from docs/PROTOCOL.md.
4 Never log credential contents or tokens. Validate every body with zod and return the standard error shape. Add per-IP rate limits and a CORS allowlist from env.
5 Issuer seeds come from env and are dev-only; document that production would use a KMS.
Tests: tampered claim, unregistered issuer, deactivated issuer, expired, revoked, wrong audience, replayed nonce, missing key-binding.
```

### Phase 3: Live wallet (Prompt 5, then this Delta)

```text
Implement LiveWalletProvider in apps/web/lib/wallet/live.ts with these constraints:
1 Keys and credentials stay in the browser (IndexedDB, encrypted). No endpoint stores claims. In live mode the wallet group reads credentials from the wallet and personas from GET /profiles.
2 Use the typed-data builders from docs/PROTOCOL.md. A unit test must reproduce every hash in shared/test-vectors/eip712.json.
3 Presentations disclose only the requested claims; a test proves undisclosed claims are absent.
4 Encryption: per-wallet salt, PBKDF2 or scrypt, AES-GCM, no passphrase storage; a wrong passphrase must fail.
5 The mock provider stays selectable by the same flags.
```

### Phase 4: Lender (Prompts 6 and 7, then this Delta)

```text
Additions:
1 Seed versioned policies for QuickRepair (vehicle repair) and Gramin (working capital). Add GET /lenders, GET /lenders/:id/policy, GET /policies, GET /lenders/:id/offers and GET /lenders/:id/compliance (disclosure log with retention dates; only disclosed claims are stored).
2 Lender request records use borrower aliases only.
3 Fixture test against the frontend seed data (apps/web/data/offers.json): 40000 at 20 percent for 18 months gives EMI 2590.53 with fee 600 plus GST 108; 50000 at 24 percent for 24 months gives EMI 2643.55 with fee 1000 plus GST 180.
4 Persona tests: Priya (income below threshold), Imran (expired KYC), Kavita (risk flag) must produce the same rejections and reasons as the variants in apps/web/data/runs.json.
5 Per-lender API keys; reject inactive or unregistered lenders.
```

### Phase 5: Mandates, PEP and audit (Prompts 8 and 9, then this Delta)

```text
Additions:
1 Use the disclosure bit map and EIP-712 types from docs/PROTOCOL.md. Add a Python test that reproduces the hashes in shared/test-vectors/eip712.json and recovers signers.
2 Add GET /mandates?borrower=address and GET /mandates/:id. POST /mandates/proposal returns violations with the shared rule names.
3 Relayer safety: call only the two known contracts and known function selectors; refuse unless the chain id is allowlisted; daily and per-borrower caps; stop and report when the balance falls below a floor; never log keys.
4 Audit: GET /audit (list) next to GET /audit/verify, using exactly the hash scheme documented in docs/PROTOCOL.md; audit every PEP decision and every relay.
5 Admin and lab endpoints are disabled unless their env flag and API key are set.
```

### Phase 6: Agent, accept, receipts (Prompts 10 and 11, then this Delta)

```text
Additions:
1 POST /runs (from a signed, active mandateId; the graph starts at discover_lenders because parsing and signing already happened), GET /runs/:id (snapshot for reload), GET /runs/:id/offers.
2 SSE events must validate against the zod schema used by apps/web/lib/runs/types.ts. Add a contract test that parses a recorded stream with that schema.
3 presentation_request events wait for POST /runs/:id/presentation with a timeout and emit a clean failure event if the wallet is closed.
4 accept takes SignedAcceptance; verify the typed data, signer, human caller, active mandate, unexpired offer and unused nonce.
5 After accept, write DisclosureRecorded receipts on-chain with salted commitments; GET /activity returns receipts with tx hashes. Live mode must not need POST /disclosure-receipts.
6 Revoking the mandate mid-run must produce a PEP denial event on the next step.
```

### Phase 7: Directory, admin, chain and Attack Lab (new)

```text
Build the remaining endpoints in services/core:
1 GET /admin/overview (queue, schema versions, chain status, relayer cap usage). POST /admin/queue/:id/approve and /reject. POST /admin/issuers/:id/active and /admin/lenders/:id/active, which call the registry contract with the governance key behind demo admin auth and the env flag. Add GET /admin/issuers/:id/impact first so the UI can show the impact preview.
2 Chain reads: prefer EthersChainReader in the frontend against the RPC (getLogs for the two contracts). Add GET /chain/events only if RPC limits make it unreliable.
3 Attack Lab: POST /lab/run/:scenarioId, enabled only when LAB_ENABLED is true. It builds the bad input for each scenario and calls the real verification, PEP and mandate-validation code, returning the failing stage and rule. It uses synthetic profiles only.
4 Retire mock-only endpoints (the mock receipt helper) in live mode.
```

### Phase 8: Go live, one group at a time

Order: credential, wallet, lender, mandate, runs, activity, chain, admin last.

Before adding a group to NEXT\_PUBLIC\_LIVE\_GROUPS, all of these must be true:

1. Backend tests for that group pass.
2. Record real responses as fixtures and parse them with the frontend zod schemas in a test.
3. You walked through the matching UI flow by hand.
4. A Playwright test for that flow passes in live mode.
5. The branch is merged and tagged. If anything breaks later, remove the group from the flag.

### Phase 9: Harden, deploy and submit (Prompts 16, 17, 18, then this Delta)

```text
Additions:
1 make seed is idempotent (running it twice changes nothing) and refuses to run against a non-testnet chain.
2 Playwright runs the happy path and four attack paths in both mock and live mode.
3 Logs contain no claims, tokens, keys or personal data. Rate limits and input validation exist on every POST route.
4 Production env: secrets from the environment, HTTPS, admin and lab endpoints off unless explicitly enabled, relayer funded with testnet ETH only.
5 Record a backup demo video, and keep mock mode working as a fallback.
6 README states honest limitations: issuer-signed threshold assertions rather than zero-knowledge proofs, wallet must be open for presentations, simulated Account Aggregator, testnet only, demo admin auth.
```

## 6. If time runs short

Aim first for this live slice: contracts, credential issue and verify, live wallet, mandate on-chain, run, accept and receipts, plus the explorer reading chain events. Admin, lender dashboards and the Attack Lab can stay on mock, with the Attack Lab live runner as the first thing to add back. Say plainly in the deck which groups are live. A hybrid demo that works beats a fully live demo that fails.

## 7. Pre-demo checklist

- Fresh clone, install, make up, make seed all work.
- Golden path works with every planned group live, and again with the fallback flags set to mock.
- Forged credential, replayed presentation, over-cap mandate and unsigned accept are all rejected with the right rule name.
- Revoking a mandate mid-run stops the agent; the explorer shows the events without personal data.
- No secrets in git history (scan it), relayer balance is above the floor, RPC and faucet access are confirmed the day before.
- Backup video recorded; deck and README match what is actually live.
