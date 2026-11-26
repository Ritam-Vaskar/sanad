/**
 * Zod schemas for all data files and API responses.
 * Re-exports the data-file schemas from data/schemas.ts and adds
 * response schemas for every API function so live implementations
 * can validate backend payloads at the boundary.
 */

import { z } from 'zod'

// ── re-export data-file schemas ──────────────────────────────────────────────
export {
  borrowersSchema,
  credentialsSchema,
  issuersSchema,
  lendersSchema,
  mandatesSchema,
  runsSchema,
  offersSchema,
  activitySchema,
  lenderRequestsSchema,
  chainEventsSchema,
  statusListsSchema,
  policiesSchema,
  auditLogSchema,
  attackScenariosSchema,
  adminSchema,
  dataFileSchemas,
} from '@/data/schemas'

// ── reusable atoms ───────────────────────────────────────────────────────────
const text = z.string().min(1)
const timestamp = z.string()

// ── API response schemas ─────────────────────────────────────────────────────

// credential group
export const credentialResponseSchema = z.object({
  id: text, subjectId: text,
  type: z.enum(['KycCredential', 'GigIncomeCredential', 'CashFlowCredential']),
  issuerId: text, status: z.enum(['active', 'revoked', 'expired']),
  issuedAt: timestamp, validUntil: timestamp,
  statusListIndex: z.number().int().nonnegative(),
  claims: z.array(z.object({
    key: text, label: text,
    value: z.union([z.string(), z.number(), z.boolean()]),
    disclosable: z.boolean(), sharedByDefault: z.boolean(), sensitive: z.boolean(),
  })),
})

export const revokeResponseSchema = z.object({
  id: text,
  status: z.literal('revoked'),
})

export const statusListResponseSchema = z.object({
  issuerId: text, listId: text,
  bitLength: z.number().int().positive(),
  bits: z.array(z.union([z.literal(0), z.literal(1)])),
  revokedIndices: z.array(z.number().int().nonnegative()),
  listHash: text, lastOnChainRootTx: text,
}).nullable()

// wallet-facing group
export const borrowerResponseSchema = z.object({
  id: text, name: text, age: z.number().int().positive(),
  city: text, did: text, ethAddress: text, occupation: text,
  monthlyIncome: z.number().nonnegative(),
  monthlyObligations: z.number().nonnegative().optional(),
  kycStatus: text, notes: text, riskFlag: z.boolean().optional(),
}).nullable()

export const borrowerListResponseSchema = z.array(borrowerResponseSchema.unwrap())

export const credentialListResponseSchema = z.array(credentialResponseSchema)

export const mandateListResponseSchema = z.array(z.object({
  id: text, borrowerId: text, purpose: text,
  maxAmount: z.number().positive(), maxEmi: z.number().positive(),
  allowedLenders: z.array(text),
  disclosures: z.record(z.string(), z.boolean()),
  allowAccept: z.boolean(), expiresAt: timestamp,
  status: z.enum(['active', 'expired', 'revoked']),
  mandateHash: text, txHash: text,
}))

// mandate group
export const mandateProposalResponseSchema = z.object({
  purpose: text,
  maxAmount: z.number().positive(),
  maxEmi: z.number().positive(),
  allowedLenders: z.array(text),
  sourceText: text,
})

export const mandateResponseSchema = z.object({
  id: text, borrowerId: text, purpose: text,
  maxAmount: z.number().positive(), maxEmi: z.number().positive(),
  allowedLenders: z.array(text),
  disclosures: z.record(z.string(), z.boolean()),
  allowAccept: z.boolean(), expiresAt: timestamp,
  status: z.enum(['active', 'expired', 'revoked']),
  mandateHash: text, txHash: text,
})

// runs group
export const agentRunResponseSchema = z.object({
  id: text, borrowerId: text, mandateId: text, status: text,
  assistantExplanation: text,
  steps: z.array(z.object({
    offsetSeconds: z.number().nonnegative(), type: text,
    lenderId: text.optional(), title: text, detail: text,
    pepRule: text.optional(), decision: text.optional(),
    claims: z.array(text).optional(),
  })),
  rejection: z.object({ reason: text, lenderId: text }).optional(),
}).nullable()

export const acceptOfferResponseSchema = z.object({
  runId: text, offerId: text, accepted: z.literal(true), txHash: text.optional(),
})

// activity group
export const activityEntryResponseSchema = z.object({
  id: text, timestamp,
  type: text.optional(),
  mandateId: text.optional(), lenderId: text.optional(),
  categories: z.array(text).optional(),
  requestId: text.optional(),
  commitmentHash: text.optional(),
  txHash: text.optional(),
  block: z.number().int().nonnegative().optional(),
  credentialId: text.optional(),
  description: text.optional(),
})

export const activityListResponseSchema = z.array(activityEntryResponseSchema)

export const mockReceiptResponseSchema = z.object({
  id: text, mandateId: text, lenderId: text,
  categories: z.array(text), requestId: text,
  timestamp, commitmentHash: text, txHash: text,
  block: z.number().int().nonnegative(),
})

// lender group
export const lenderResponseSchema = z.object({
  id: text, name: text, did: text, address: text,
  status: z.enum(['active', 'pending', 'suspended']),
  summary: text,
  policy: z.object({
    minAmount: z.number().nonnegative(), maxAmount: z.number().positive(),
    minTenure: z.number().positive(), maxTenure: z.number().positive(),
    foirLimit: z.number(), minIncome: z.number().nonnegative(),
    feePercent: z.number().nonnegative(),
  }),
  apiKeyMasked: text,
  webhookUrl: text.optional(),
  notifications: z.object({ email: z.boolean(), webhook: z.boolean() }).optional(),
})

export const lenderListResponseSchema = z.array(lenderResponseSchema)

export const lenderRequestResponseSchema = z.object({
  id: text, lenderId: text, borrowerAlias: text,
  receivedAt: timestamp, status: text,
  checks: z.array(z.object({ name: text, passed: z.boolean(), reason: text })),
  disclosedClaims: z.array(text), withheldClaims: z.array(text),
  underwriting: z.object({
    foir: z.number().nonnegative(), riskScore: z.number().nonnegative(),
    riskSegment: text,
    riskBreakdown: z.array(z.object({ label: text, score: z.number() })),
    policyChecks: z.array(z.object({
      rule: text, threshold: text, value: text, passed: z.boolean(),
    })),
  }),
  offerId: text.optional(), subjectId: text.optional(),
  credentialIds: z.array(text).optional(),
  auditHash: text.optional(), result: text.optional(),
})

export const lenderRequestListResponseSchema = z.array(lenderRequestResponseSchema)

export const offerResponseSchema = z.object({
  id: text, runId: text, lenderId: text,
  principal: z.number().positive(), rate: z.number().nonnegative(),
  tenure: z.number().positive(), emi: z.number().nonnegative(),
  processingFee: z.number().nonnegative(), gst: z.number().nonnegative(),
  totalInterest: z.number().nonnegative(),
  totalRepayment: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  fitsEmiLimit: z.boolean(), offerHash: text,
  assistantExplanation: text,
  outcome: z.enum(['sent', 'viewed', 'accepted', 'expired', 'declined']).optional(),
})

export const offerListResponseSchema = z.array(offerResponseSchema)

export const policyDocumentResponseSchema = z.object({
  id: text, lenderId: text,
  version: z.number().int().positive(),
  revisionLabel: text.optional(),
  effectiveAt: timestamp,
  eligibility: z.array(text),
  amountRange: z.tuple([z.number().nonnegative(), z.number().positive()]),
  tenureMonths: z.tuple([z.number().positive(), z.number().positive()]),
  foirLimit: z.number(), rateByRisk: z.object({
    LOW: z.number().nonnegative().nullable(),
    MEDIUM: z.number().nonnegative().nullable(),
    HIGH: z.number().nonnegative().nullable(),
  }),
  feePercent: z.number().nonnegative(),
  gstPercent: z.number().nonnegative(),
  allowedEmployment: z.array(text),
})

export const policyListResponseSchema = z.array(policyDocumentResponseSchema)

// admin group
export const adminOverviewResponseSchema = z.object({
  schemaVersions: z.array(z.object({ name: text, version: text, status: text })),
  governanceLog: z.array(z.object({ id: text, action: text, actor: text, timestamp: text })),
  chainStatus: z.object({
    network: text,
    blockHeight: z.number().int().nonnegative(),
    relayerBalance: z.number().nonnegative(),
    dailyTransactionCap: z.number().int().positive(),
    dailyTransactionsUsed: z.number().int().nonnegative(),
  }),
  queue: z.object({ issuers: z.array(text), lenders: z.array(text) }),
  auditTamperEntry: z.number().int().nonnegative(),
  simulateTampering: z.boolean(),
  issuers: z.array(z.object({
    id: text, name: text, did: text, keyHash: text,
    registryStatus: z.enum(['active', 'pending', 'suspended']),
    schemas: z.array(text),
    statusListSize: z.number().int().positive(),
    issuedCount: z.number().int().nonnegative(),
    revokedCount: z.number().int().nonnegative(),
    address: text,
  })),
  lenders: lenderListResponseSchema,
})

export const issuerResponseSchema = z.object({
  id: text, name: text, did: text, keyHash: text,
  registryStatus: z.enum(['active', 'pending', 'suspended']),
  schemas: z.array(text),
  statusListSize: z.number().int().positive(),
  issuedCount: z.number().int().nonnegative(),
  revokedCount: z.number().int().nonnegative(),
  address: text,
})

export const issuerListResponseSchema = z.array(issuerResponseSchema)

export const auditEntryResponseSchema = z.object({
  index: z.number().int().nonnegative(),
  prevHash: text, hash: text,
  actor: text, action: text, decision: text, rule: text,
  timestamp,
})

export const auditLogResponseSchema = z.array(auditEntryResponseSchema)

export const auditVerifyResponseSchema = z.object({
  valid: z.boolean(),
  brokenIndex: z.number().int(),
  entries: z.number().int().nonnegative(),
})

export const attackScenarioResponseSchema = z.object({
  id: text, title: text, description: text,
  whyItMatters: text, stage: text, rule: text,
})

export const attackScenarioListResponseSchema = z.array(attackScenarioResponseSchema)

// chain group
export const chainEventResponseSchema = z.object({
  id: text, type: text, txHash: text,
  block: z.number().int().nonnegative(), timestamp,
  decoded: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
})

export const chainEventListResponseSchema = z.array(chainEventResponseSchema)

