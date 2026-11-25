/**
 * API router — picks mock or live implementation per group.
 *
 * Environment variables:
 *   NEXT_PUBLIC_API_MODE        "mock" (default) | "live"
 *   NEXT_PUBLIC_LIVE_GROUPS     comma-separated list of groups to run live
 *                               (e.g. "credential,mandate")
 *   NEXT_PUBLIC_CORE_URL        base URL of the core service
 *   NEXT_PUBLIC_CREDENTIAL_URL  base URL of the credential service
 *
 * When API_MODE is "mock", everything uses the mock implementations.
 * When API_MODE is "live", only the groups listed in LIVE_GROUPS use
 * real HTTP calls; the rest stay on mock.
 */

import type { ApiGroupName, SanadApi } from './types'
import { createHttpClient } from './http'

// ── mock implementations (always available) ──────────────────────────────────
import {
  mockCredentialApi,
  mockWalletApi,
  mockMandateApi,
  mockRunsApi,
  mockActivityApi,
  mockLenderApi,
  mockAdminApi,
  mockChainApi,
} from './mock'

// ── live factory imports ─────────────────────────────────────────────────────
import { createLiveCredentialApi } from './live/credential'
import { createLiveWalletApi } from './live/wallet'
import { createLiveMandateApi } from './live/mandate'
import { createLiveRunsApi } from './live/runs'
import { createLiveActivityApi } from './live/activity'
import { createLiveLenderApi } from './live/lender'
import { createLiveAdminApi } from './live/admin'
import { createLiveChainApi } from './live/chain'

// ── env parsing ──────────────────────────────────────────────────────────────

const API_MODE = process.env.NEXT_PUBLIC_API_MODE ?? 'mock'
const LIVE_GROUPS = new Set<ApiGroupName>(
  (process.env.NEXT_PUBLIC_LIVE_GROUPS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as ApiGroupName[],
)
const CORE_URL = process.env.NEXT_PUBLIC_CORE_URL ?? ''
const CREDENTIAL_URL = process.env.NEXT_PUBLIC_CREDENTIAL_URL ?? ''

function isLive(group: ApiGroupName): boolean {
  if (API_MODE === 'mock') return false
  return LIVE_GROUPS.has(group)
}

function requireUrl(name: string, url: string): string {
  if (!url) {
    throw new Error(
      `[api] ${name} is required when running group in live mode. ` +
      `Set it in your environment.`,
    )
  }
  return url
}

// ── lazy singletons for HTTP clients ─────────────────────────────────────────

let _coreClient: ReturnType<typeof createHttpClient> | null = null
let _credentialClient: ReturnType<typeof createHttpClient> | null = null

function coreClient() {
  if (!_coreClient) {
    _coreClient = createHttpClient({
      baseUrl: requireUrl('NEXT_PUBLIC_CORE_URL', CORE_URL),
    })
  }
  return _coreClient
}

function credentialClient() {
  if (!_credentialClient) {
    _credentialClient = createHttpClient({
      baseUrl: requireUrl('NEXT_PUBLIC_CREDENTIAL_URL', CREDENTIAL_URL),
    })
  }
  return _credentialClient
}

// ── build the API object ─────────────────────────────────────────────────────

function buildApi(): SanadApi {
  return {
    credential: isLive('credential')
      ? createLiveCredentialApi(credentialClient())
      : mockCredentialApi,

    wallet: isLive('wallet')
      ? createLiveWalletApi(coreClient())
      : mockWalletApi,

    mandate: isLive('mandate')
      ? createLiveMandateApi(coreClient())
      : mockMandateApi,

    runs: isLive('runs')
      ? createLiveRunsApi(coreClient())
      : mockRunsApi,

    activity: isLive('activity')
      ? createLiveActivityApi(coreClient())
      : mockActivityApi,

    lender: isLive('lender')
      ? createLiveLenderApi(coreClient())
      : mockLenderApi,

    admin: isLive('admin')
      ? createLiveAdminApi(coreClient())
      : mockAdminApi,

    chain: isLive('chain')
      ? createLiveChainApi(coreClient())
      : mockChainApi,
  }
}

/** The singleton API instance for the entire app. */
export const api: SanadApi = buildApi()

// ── flat re-exports for backward compatibility ───────────────────────────────
// These let existing imports like `import { getBorrower } from '@/lib/api'`
// work without changing any UI component.

// credential group
export const issueCredential = api.credential.issueCredential.bind(api.credential)
export const revokeCredential = api.credential.revokeCredential.bind(api.credential)
export const getStatusList = api.credential.getStatusList.bind(api.credential)

// wallet group
export const getBorrowers = api.wallet.getBorrowers.bind(api.wallet)
export const getBorrower = api.wallet.getBorrower.bind(api.wallet)
export const getCredentials = api.wallet.getCredentials.bind(api.wallet)
export const getMandates = api.wallet.getMandates.bind(api.wallet)

// mandate group
export const proposeMandate = api.mandate.proposeMandate.bind(api.mandate)
export const createMandate = api.mandate.createMandate.bind(api.mandate)
export const revokeMandate = api.mandate.revokeMandate.bind(api.mandate)

// runs group
export const startRun = api.runs.startRun.bind(api.runs)
export const subscribeRun = api.runs.subscribeRun.bind(api.runs)
export const acceptOffer = api.runs.acceptOffer.bind(api.runs)
export const getOffers = api.runs.getOffers.bind(api.runs)

// activity group
export const getActivity = api.activity.getActivity.bind(api.activity)
export const addMockReceipt = api.activity.addMockReceipt.bind(api.activity)

// lender group
export const getLenders = api.lender.getLenders.bind(api.lender)
export const getLenderRequests = api.lender.getLenderRequests.bind(api.lender)
export const getPolicies = api.lender.getPolicies.bind(api.lender)

// admin group
export const getAdminOverview = api.admin.getAdminOverview.bind(api.admin)
export const getIssuers = api.admin.getIssuers.bind(api.admin)
export const getAuditLog = api.admin.getAuditLog.bind(api.admin)
export const verifyAuditChain = api.admin.verifyAuditChain.bind(api.admin)
export const getAttackScenarios = api.admin.getAttackScenarios.bind(api.admin)

// chain group
export const getChainEvents = api.chain.getChainEvents.bind(api.chain)

// re-export types
export type { AgentRun, Offer } from '@/types'
export type {
  SanadApi,
  ApiGroupName,
  CredentialApi,
  WalletApi,
  MandateApi,
  RunsApi,
  ActivityApi,
  LenderApi,
  AdminApi,
  ChainApi,
  MandateProposal,
  CreateMandateInput,
  MockReceiptInput,
  ConsentReceipt,
  AdminOverview,
  AuditVerifyResult,
} from './types'
export { ApiError, PolicyDenied, NetworkError, TimeoutError } from './http'

