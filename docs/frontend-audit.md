# Frontend audit

**Audit date:** 2026-11-24  
**Scope:** Follow-up review after implementing the requested frontend flows. Status describes local prototype behavior, not production backend or blockchain integration.

## 1. Route inventory

The app has two `page.tsx` route files plus a `not-found.tsx` fallback; `layout.tsx` and `globals.css` provide shared layout and styles.

| App Router route | Implementation | Content / stub status |
| --- | --- | --- |
| `/` | [`app/page.tsx`](../app/page.tsx) → `LandingPage` | Real landing page. |
| `/{...slug}` | [`app/[...slug]/page.tsx`](../app/%5B...slug%5D/page.tsx) → `PortalShell` and `RouteContent` | Real catch-all dispatch, not a stub. Its supported page families are listed below. |

The catch-all currently dispatches these application paths:

| Path family | Content | Status |
| --- | --- | --- |
| `/borrower`, `/borrower/onboarding`, `/borrower/add-credential`, `/borrower/assistant`, `/borrower/activity`, `/borrower/profile`, `/borrower/credentials/{id}`, `/borrower/mandates/{id}`, `/borrower/runs/{id}`, `/borrower/offers/{id}` | `BorrowerApp` selects the corresponding borrower screen. | Real screens backed by the local store/mock API. |
| `/issuer/{issuerId}`, `/issuer/{issuerId}/subjects`, `/issuer/{issuerId}/issue`, `/issuer/{issuerId}/credentials`, `/issuer/{issuerId}/status`, `/issuer/{issuerId}/keys`, `/issuer/{issuerId}/activity` | `IssuerPortal`; legacy aliases `/issue`, `/credentials`, `/status`, `/keys`, `/activity` are also handled. | Real screens, with simulated issuance and registry operations. |
| `/lender/{lenderId}`, `/lender/{lenderId}/requests`, `/lender/{lenderId}/requests/{requestId}`, `/lender/{lenderId}/policy`, `/lender/{lenderId}/issuers`, `/lender/{lenderId}/offers`, `/lender/{lenderId}/compliance`, `/lender/{lenderId}/settings` | `LenderPortal`; legacy `/requests`, `/requests/{id}`, `/policy`, `/issuers`, `/offers`, `/compliance`, and `/settings` are also handled. | Real screens, using synthetic requests and local state. |
| `/admin`, `/admin/registry`, `/admin/queue`, `/admin/audit` | `AdminPortal`. | Real screens, with mock governance and audit behavior. |
| `/explorer` | `ExplorerPortal`. | Real explorer UI; events and live feed are simulated locally. |
| `/lab` | `AttackLabPortal`. | Real simulation UI; scenarios are predetermined, not executed against a live policy engine. |
| `/design` | `ComponentGallery` (special case in the catch-all page). | Real component gallery. |

**Routing:** The catch-all allowlists supported route families and calls `notFound()` for unknown or unsupported paths. `app/not-found.tsx` provides the 404 page. The portal switcher includes Design.

## 2. Placeholder and wiring scan

- No `built in the next step`, `coming soon`, `TODO`, `lorem`, or empty click-handler matches remain in the reviewed application source.
- Components do not import JSON. Domain seed JSON is loaded through [`lib/api/seed-data.ts`](../lib/api/seed-data.ts); locale JSON remains isolated to `lib/i18n`.
- The unused `ActivityStamp` component was removed. CSV/JSON exports and the encrypted wallet backup now create files; issuer key rotation and chain receipts remain explicitly simulated local actions.
- Unsupported route targets no longer silently fall through to a generic page.

## 3. Requested flow audit

“Works” means the requested interaction works in the local prototype; it does not imply a live backend or blockchain service.

| Checklist flow | Status | Implemented behavior / boundary |
| --- | --- | --- |
| 1. Landing → borrower onboarding → Rahul passport | **Works** | Wallet creation encrypts a browser-generated P-256 signing key; the Rahul seed passport shows three active credentials ([`onboarding-passport.tsx`](../components/borrower/onboarding-passport.tsx), [`wallet.ts`](../lib/crypto/wallet.ts)). |
| 2. Add proof for an ineligible persona | **Works** | Priya sees the ₹25,000 threshold refusal, including the reason; the mock API enforces the same rule ([`proof-and-details.tsx`](../components/borrower/proof-and-details.tsx), [`mock-api.ts`](../lib/api/mock-api.ts)). |
| 3. Assistant prompts and guardrails | **Works** | English and Hindi requests produce a permission slip; employer, over-cap, and “ignore limits” requests are blocked with rule indicators ([`assistant.tsx`](../components/borrower/assistant.tsx)). |
| 4. Sign a mandate | **Works** | The wallet signs the canonical mandate payload; the signed transaction chip is recorded in activity and Explorer ([`wallet.ts`](../lib/crypto/wallet.ts), [`mock-api.ts`](../lib/api/mock-api.ts)). |
| 5. Run agent and stop | **Works** | The timeline records distinct per-lender events, receipts, and progress. Stop halts the run and revokes the permission ([`mandate-run-offers.tsx`](../components/borrower/mandate-run-offers.tsx), [`runSimulator.ts`](../lib/sim/runSimulator.ts)). |
| 6. Offers and acceptance | **Works** | Eligible runs show two cost-ranked offers, comparison and repayment schedule; acceptance requires borrower signature and shows a summary. Ineligible personas receive rejection results ([`mandate-run-offers.tsx`](../components/borrower/mandate-run-offers.tsx), [`wallet.ts`](../lib/crypto/wallet.ts)). |
| 7. Activity receipts | **Works** | Consent receipts include matching request IDs for lender requests and Explorer events; the details toggle controls their technical IDs ([`activity-profile.tsx`](../components/borrower/activity-profile.tsx), [`mock-api.ts`](../lib/api/mock-api.ts)). |
| 8. Revoke a mandate | **Works** | Revocation updates mandate, lender-request, borrower activity, and Explorer state; previously shared receipts are retained ([`mock-api.ts`](../lib/api/mock-api.ts), [`demo-store.ts`](../lib/store/demo-store.ts)). |
| 9. Issuer wizard and revocation | **Works** | Issuance adds a passport credential and Explorer event; revocation updates the status grid and causes subsequent lender checks to fail ([`issuer-portal.tsx`](../components/portals/issuer-portal.tsx), [`mock-api.ts`](../lib/api/mock-api.ts)). |
| 10. Lender workspaces | **Works** | Both lender workspaces expose request detail, verification/checklist evidence, withheld rows, gauges, policy editing, and compliance retention controls ([`lender-portal.tsx`](../components/portals/lender-portal.tsx)). |
| 11. Admin governance and audit | **Works** | Admin can approve pending issuers, preview deactivation impact, verify the audit chain, and tamper so verification fails at entry 7 ([`admin-portal.tsx`](../components/portals/admin-portal.tsx), [`mock-api.ts`](../lib/api/mock-api.ts)). |
| 12. Explorer | **Works** | Feed, search, and detail drawer are available; public details expose decoded fields rather than private proofs ([`explorer-portal.tsx`](../components/portals/explorer-portal.tsx), [`chain-details-drawer.tsx`](../components/shared/chain-details-drawer.tsx)). |
| 13. Attack Lab | **Works** | Exactly eight scenarios are available and produce Blocked results at their configured rule stages; the lab is a deterministic local simulation ([`attack-scenarios.json`](../data/attack-scenarios.json), [`verification.ts`](../lib/verification.ts)). |
| 14. Language and technical-details toggles | **Works** | English/Hindi selection updates document language, navigation, shared portal headings, and borrower copy. Technical IDs in borrower activity are hidden until enabled ([`topbar-controls.tsx`](../components/layout/topbar-controls.tsx), [`activity-profile.tsx`](../components/borrower/activity-profile.tsx)). |
| 15. Reset demo | **Works** | Reset clears persisted demo state and TanStack Query cache, restores seed data, and returns to Rahul ([`demo-panel.tsx`](../components/layout/demo-panel.tsx), [`demo-store.ts`](../lib/store/demo-store.ts)). |

## 4. Prioritized fix list

1. **Before production use:** Replace local mock APIs, deterministic simulations, and client-only state transitions with authenticated backend services and an actual chain/indexer integration.
2. **Before production use:** Define and independently review custody, signing-key recovery, issuer credential signatures, and server-side authorization/policy enforcement.
3. **Localization follow-up:** Some detailed portal copy, data labels, and long descriptions remain English when Hindi is selected; the toggle and core navigation/shared headings work.
