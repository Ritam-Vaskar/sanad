/**
 * API group interfaces.
 *
 * Each group defines the contract between the UI and the data layer.
 * Mock implementations (current behaviour) and live implementations
 * (real fetch calls) both satisfy these interfaces.
 */

import type {
  ActivityEntry, AdminData, AgentRun, AttackScenario, AuditEntry,
  Borrower, ChainEvent, Credential, Issuer, Lender, LenderPolicyDocument,
  LenderRequest, Mandate, Offer, StatusList,
} from '@/types'

// ── credential group ─────────────────────────────────────────────────────────

export interface CredentialApi {
  /** POST /issue/:type */
  issueCredential(
    type: Credential['type'],
    subjectId: string,
    selectedIssuerId?: string,
  ): Promise<Credential>

  /** POST /revoke */
  revokeCredential(id: string): Promise<{ id: string; status: 'revoked' }>

  /** GET /status/:issuer/:listId */
  getStatusList(issuerId: string, listId?: string): Promise<StatusList | null>
}

// ── wallet-facing group ──────────────────────────────────────────────────────

export interface WalletApi {
  /** GET /borrowers */
  getBorrowers(): Promise<Borrower[]>

  /** GET /borrowers/:id */
  getBorrower(id: string): Promise<Borrower | null>

  /** GET /borrowers/:id/credentials */
  getCredentials(borrowerId: string): Promise<Credential[]>

  /** GET /borrowers/:id/mandates */
  getMandates(borrowerId: string): Promise<Mandate[]>
}

// ── mandate group ────────────────────────────────────────────────────────────

export type MandateProposal = {
  purpose: string
  maxAmount: number
  maxEmi: number
  allowedLenders: string[]
  sourceText: string
}

export type CreateMandateInput = Omit<Mandate, 'id' | 'mandateHash' | 'txHash' | 'status'> & {
  signature: string
}

export interface MandateApi {
  /** POST /mandates/proposal */
  proposeMandate(text: string): Promise<MandateProposal>

  /** POST /mandates */
  createMandate(input: CreateMandateInput): Promise<Mandate>

  /** POST /mandates/:id/revoke */
  revokeMandate(id: string): Promise<{ id: string; status: 'revoked' }>
}

// ── runs group ───────────────────────────────────────────────────────────────

export interface RunsApi {
  /** GET /runs/:id/events (SSE start) */
  startRun(mandateId: string): Promise<AgentRun>

  /** GET /runs/:id/events (SSE subscribe) */
  subscribeRun(runId: string): Promise<AgentRun | null>

  /** POST /runs/:id/accept */
  acceptOffer(
    runId: string,
    offerId: string,
    signature: string,
  ): Promise<{ runId: string; offerId: string; accepted: true; txHash?: string }>

  /** GET /runs/:id/offers */
  getOffers(runId: string): Promise<Offer[]>
}

// ── activity group ───────────────────────────────────────────────────────────

export type MockReceiptInput = {
  mandateId: string
  lenderId: string
  categories: string[]
  requestId: string
}

export type ConsentReceipt = ActivityEntry & {
  mandateId: string
  lenderId: string
  categories: string[]
  requestId: string
  commitmentHash: string
  txHash: string
  block: number
}

export interface ActivityApi {
  /** GET /activity?borrower= */
  getActivity(borrowerId: string): Promise<ActivityEntry[]>

  /** POST /disclosure-receipts (mock only in prototype) */
  addMockReceipt(input: MockReceiptInput): Promise<ConsentReceipt>
}

// ── lender group ─────────────────────────────────────────────────────────────

export interface LenderApi {
  /** GET /lenders */
  getLenders(): Promise<Lender[]>

  /** GET /lenders/:id/requests */
  getLenderRequests(lenderId: string): Promise<LenderRequest[]>

  /** GET /lenders/:id/policy */
  getPolicies(lenderId?: string): Promise<LenderPolicyDocument[]>
}

// ── admin group ──────────────────────────────────────────────────────────────

export type AdminOverview = AdminData & { issuers: Issuer[]; lenders: Lender[] }

export type AuditVerifyResult = {
  valid: boolean
  brokenIndex: number
  entries: number
}

export interface AdminApi {
  /** GET /admin/overview */
  getAdminOverview(): Promise<AdminOverview>

  /** GET /issuers */
  getIssuers(): Promise<Issuer[]>

  /** GET /audit */
  getAuditLog(): Promise<AuditEntry[]>

  /** GET /audit/verify */
  verifyAuditChain(): Promise<AuditVerifyResult>

  /** GET /lab/attack-scenarios */
  getAttackScenarios(): Promise<AttackScenario[]>
}

// ── chain group ──────────────────────────────────────────────────────────────

export interface ChainApi {
  /** Chain RPC / indexer query */
  getChainEvents(filter?: { type?: string; limit?: number }): Promise<ChainEvent[]>
}

// ── combined ─────────────────────────────────────────────────────────────────

export type ApiGroupName =
  | 'credential'
  | 'wallet'
  | 'mandate'
  | 'runs'
  | 'activity'
  | 'lender'
  | 'admin'
  | 'chain'

export interface SanadApi {
  credential: CredentialApi
  wallet: WalletApi
  mandate: MandateApi
  runs: RunsApi
  activity: ActivityApi
  lender: LenderApi
  admin: AdminApi
  chain: ChainApi
}

