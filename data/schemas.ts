import { z } from 'zod'

const text = z.string().min(1)
const timestamp = z.string().datetime()
const registryStatus = z.enum(['active', 'pending', 'suspended'])
const credentialStatus = z.enum(['active', 'revoked', 'expired'])
const claimSchema = z.object({ key: text, label: text, value: z.union([z.string(), z.number(), z.boolean()]), disclosable: z.boolean(), sharedByDefault: z.boolean(), sensitive: z.boolean() })
const policySchema = z.object({ minAmount: z.number().nonnegative(), maxAmount: z.number().positive(), minTenure: z.number().positive(), maxTenure: z.number().positive(), foirLimit: z.number().min(0).max(100), minIncome: z.number().nonnegative(), feePercent: z.number().nonnegative() })

export const borrowersSchema = z.array(z.object({ id: text, name: text, age: z.number().int().positive(), city: text, did: text, ethAddress: text, occupation: text, monthlyIncome: z.number().nonnegative(), monthlyObligations: z.number().nonnegative().optional(), kycStatus: text, notes: text, riskFlag: z.boolean().optional() }))
export const credentialsSchema = z.array(z.object({ id: text, subjectId: text, type: z.enum(['KycCredential', 'GigIncomeCredential', 'CashFlowCredential']), issuerId: text, status: credentialStatus, issuedAt: timestamp, validUntil: timestamp, statusListIndex: z.number().int().nonnegative(), claims: z.array(claimSchema) }))
export const issuersSchema = z.array(z.object({ id: text, name: text, did: text, keyHash: text, registryStatus, schemas: z.array(text), statusListSize: z.number().int().positive(), issuedCount: z.number().int().nonnegative(), revokedCount: z.number().int().nonnegative(), address: text }))
export const lendersSchema = z.array(z.object({ id: text, name: text, did: text, address: text, status: registryStatus, summary: text, policy: policySchema, apiKeyMasked: text, webhookUrl: text.optional(), notifications: z.object({ email: z.boolean(), webhook: z.boolean() }).optional() }))
export const mandatesSchema = z.array(z.object({ id: text, borrowerId: text, purpose: text, maxAmount: z.number().positive(), maxEmi: z.number().positive(), allowedLenders: z.array(text), disclosures: z.record(z.string(), z.boolean()), allowAccept: z.boolean(), expiresAt: timestamp, status: z.enum(['active', 'expired', 'revoked']), mandateHash: text, txHash: text }))
export const runsSchema = z.array(z.object({ id: text, borrowerId: text, mandateId: text, status: text, assistantExplanation: text, steps: z.array(z.object({ offsetSeconds: z.number().nonnegative(), type: text, lenderId: text.optional(), title: text, detail: text, pepRule: text.optional(), decision: text.optional(), claims: z.array(text).optional() })), rejection: z.object({ reason: text, lenderId: text }).optional() }))
export const offersSchema = z.array(z.object({ id: text, runId: text, lenderId: text, principal: z.number().positive(), rate: z.number().nonnegative(), tenure: z.number().positive(), emi: z.number().nonnegative(), processingFee: z.number().nonnegative(), gst: z.number().nonnegative(), totalInterest: z.number().nonnegative(), totalRepayment: z.number().nonnegative(), totalCost: z.number().nonnegative(), fitsEmiLimit: z.boolean(), offerHash: text, assistantExplanation: text, outcome: z.enum(['sent', 'viewed', 'accepted', 'expired', 'declined']).optional() }))
const activityEntrySchema = z.object({ id: text, timestamp, type: text.optional(), mandateId: text.optional(), lenderId: text.optional(), categories: z.array(text).optional(), requestId: text.optional(), commitmentHash: text.optional(), txHash: text.optional(), block: z.number().int().nonnegative().optional(), credentialId: text.optional(), description: text.optional() })
const disclosureReceiptSchema = z.object({ id: text, mandateId: text, lenderId: text, categories: z.array(text), requestId: text, timestamp, commitmentHash: text, txHash: text, block: z.number().int().nonnegative() })
export const activitySchema = z.array(z.union([activityEntrySchema, disclosureReceiptSchema]))
export const lenderRequestsSchema = z.array(z.object({ id: text, lenderId: text, borrowerAlias: text, receivedAt: timestamp, status: text, checks: z.array(z.object({ name: text, passed: z.boolean(), reason: text })), disclosedClaims: z.array(text), withheldClaims: z.array(text), underwriting: z.object({ foir: z.number().nonnegative(), riskScore: z.number().nonnegative(), riskSegment: text, riskBreakdown: z.array(z.object({ label: text, score: z.number() })), policyChecks: z.array(z.object({ rule: text, threshold: text, value: text, passed: z.boolean() })) }), offerId: text.optional(), subjectId: text.optional(), credentialIds: z.array(text).optional(), auditHash: text.optional(), result: text.optional() }))
export const chainEventsSchema = z.array(z.object({ id: text, type: text, txHash: text, block: z.number().int().nonnegative(), timestamp, decoded: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])) }))
export const statusListsSchema = z.array(z.object({ issuerId: text, listId: text, bitLength: z.number().int().positive(), bits: z.array(z.union([z.literal(0), z.literal(1)])).length(256), revokedIndices: z.array(z.number().int().nonnegative()), listHash: text, lastOnChainRootTx: text }))
export const policiesSchema = z.array(z.object({ id: text, lenderId: text, version: z.number().int().positive(), revisionLabel: text.optional(), effectiveAt: timestamp, eligibility: z.array(text), amountRange: z.tuple([z.number().nonnegative(), z.number().positive()]), tenureMonths: z.tuple([z.number().positive(), z.number().positive()]), foirLimit: z.number().min(0).max(100), rateByRisk: z.object({ LOW: z.number().nonnegative().nullable(), MEDIUM: z.number().nonnegative().nullable(), HIGH: z.number().nonnegative().nullable() }), feePercent: z.number().nonnegative(), gstPercent: z.number().nonnegative(), allowedEmployment: z.array(text) }))
export const auditLogSchema = z.array(z.object({ index: z.number().int().nonnegative(), prevHash: text, hash: text, actor: text, action: text, decision: text, rule: text, timestamp }))
export const attackScenariosSchema = z.array(z.object({ id: text, title: text, description: text, whyItMatters: text, stage: text, rule: text }))
export const adminSchema = z.object({ schemaVersions: z.array(z.object({ name: text, version: text, status: text })), governanceLog: z.array(z.object({ id: text, action: text, actor: text, timestamp })), chainStatus: z.object({ network: text, blockHeight: z.number().int().nonnegative(), relayerBalance: z.number().nonnegative(), dailyTransactionCap: z.number().int().positive(), dailyTransactionsUsed: z.number().int().nonnegative() }), queue: z.object({ issuers: z.array(text), lenders: z.array(text) }), auditTamperEntry: z.number().int().nonnegative(), simulateTampering: z.boolean() })

export const dataFileSchemas = {
  'activity.json': activitySchema,
  'admin.json': adminSchema,
  'attack-scenarios.json': attackScenariosSchema,
  'audit-log.json': auditLogSchema,
  'borrowers.json': borrowersSchema,
  'chain-events.json': chainEventsSchema,
  'credentials.json': credentialsSchema,
  'issuers.json': issuersSchema,
  'lender-requests.json': lenderRequestsSchema,
  'lenders.json': lendersSchema,
  'mandates.json': mandatesSchema,
  'offers.json': offersSchema,
  'policies.json': policiesSchema,
  'runs.json': runsSchema,
  'status-lists.json': statusListsSchema,
} as const
