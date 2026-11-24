import type { AgentRun, ChainEvent, Credential, Mandate, Offer } from '@/types'
import { useDemoStore } from '@/lib/store/demo-store'
import { z } from 'zod'
import { formatINR } from '@/lib/format'
import { mandateSigningMessage, offerAcceptanceMessage, verifyWalletMessage } from '@/lib/crypto/wallet'

const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 300 + Math.floor(Math.random() * 601)))
const makeHash = () => `0x${Math.random().toString(16).slice(2, 18)}…${Math.random().toString(16).slice(2, 6)}`
const proposalInput = z.string().trim().min(1).max(500)

// Replaces POST /issue/:type.
export async function issueCredential(type: Credential['type'], subjectId: string, selectedIssuerId?: string) {
  await delay()
  const state = useDemoStore.getState()
  const borrower = state.borrowers.find((item) => item.id === subjectId)
  if (!borrower) throw new Error('This Sanad ID could not be found.')
  if (type === 'GigIncomeCredential' && borrower.monthlyIncome < 25000) throw new Error('Verified income is below the 25,000 threshold. The issuer cannot sign this claim.')
  if (type === 'CashFlowCredential' && borrower.riskFlag) throw new Error('Cash-flow indicators require provider review. The issuer cannot sign this claim yet.')
  const issuerId = selectedIssuerId ?? (type === 'KycCredential' ? 'issuer-kyc' : type === 'GigIncomeCredential' ? 'issuer-gig' : 'issuer-aa')
  const issuer = state.issuers.find((item) => item.id === issuerId)
  if (!issuer || issuer.registryStatus !== 'active') throw new Error('This issuer is not active in the SanadTrustRegistry.')
  const issuerTypes: Record<string, Credential['type']> = { 'issuer-kyc': 'KycCredential', 'issuer-gig': 'GigIncomeCredential', 'issuer-aa': 'CashFlowCredential' }
  if (issuerTypes[issuerId] !== type) throw new Error('The selected issuer cannot issue this credential type.')
  const statusList = state.statusLists.find((item) => item.issuerId === issuerId)
  const usedIndices = new Set(state.credentials.filter((item) => item.issuerId === issuerId).map((item) => item.statusListIndex))
  const statusListIndex = Array.from({ length: 256 }, (_, index) => index).find((index) => !usedIndices.has(index) && !statusList?.bits[index])
  if (statusListIndex === undefined) throw new Error('No unused status-list index is available.')
  const claims: Credential['claims'] = type === 'KycCredential'
    ? [{ key: 'kycStatus', label: 'Identity check', value: 'Verified', disclosable: true, sharedByDefault: true, sensitive: false }, { key: 'ageOver21', label: 'Age 21+', value: borrower.age >= 21, disclosable: true, sharedByDefault: true, sensitive: false }, { key: 'verificationLevel', label: 'Verification level', value: 'Document and selfie check', disclosable: true, sharedByDefault: false, sensitive: false }]
    : type === 'GigIncomeCredential'
      ? [{ key: 'incomeThreshold', label: 'Income at least ₹25,000', value: true, disclosable: true, sharedByDefault: true, sensitive: false }, { key: 'consecutiveMonths', label: 'Verified earning months', value: borrower.id === 'imran-sheikh' ? 4 : 6, disclosable: true, sharedByDefault: false, sensitive: false }, { key: 'employerName', label: 'Employer name', value: 'Demo Gig Platform', disclosable: false, sharedByDefault: false, sensitive: true }]
      : (() => {
        const incomeBand = borrower.monthlyIncome < 25000 ? 'Below ₹25,000' : borrower.monthlyIncome >= 35000 ? '₹35,000+' : '₹25,000–₹35,000'
        const activeMonths = Number(borrower.notes.match(/(\d+)\s+(?:active\s+)?months/i)?.[1] ?? (/seasonal/i.test(borrower.notes) ? 4 : 6))
        const consistency = borrower.riskFlag ? 'Review needed' : /seasonal/i.test(borrower.notes) ? 'Variable' : 'Stable'
        return [{ key: 'incomeBand', label: 'Income band', value: incomeBand, disclosable: true, sharedByDefault: false, sensitive: false }, { key: 'activeMonths', label: 'Active income months', value: activeMonths, disclosable: true, sharedByDefault: false, sensitive: false }, { key: 'consistency', label: 'Income consistency', value: consistency, disclosable: true, sharedByDefault: true, sensitive: false }, { key: 'obligations', label: 'Existing monthly obligations', value: borrower.monthlyObligations ?? 0, disclosable: true, sharedByDefault: false, sensitive: false }, { key: 'riskIndicators', label: 'High-risk indicators', value: Boolean(borrower.riskFlag), disclosable: true, sharedByDefault: false, sensitive: false }, { key: 'inflows', label: 'Average monthly inflows', value: formatINR(borrower.monthlyIncome), disclosable: true, sharedByDefault: false, sensitive: true }]
      })()
  const credential: Credential = { id: `cred-${subjectId}-${Date.now()}`, subjectId, type, issuerId, status: 'active', issuedAt: new Date().toISOString(), validUntil: new Date(Date.now() + 90 * 86400000).toISOString(), statusListIndex, claims }
  state.addCredential(credential)
  state.addActivity({ id: `proof-event-${Date.now()}`, type: 'credential_issued', credentialId: credential.id, timestamp: credential.issuedAt, description: `${type} added to the borrower passport` })
  state.addChainEvent({ id: `chain-credential-${Date.now()}`, type: 'CredentialIssued', txHash: makeHash(), block: state.admin.chainStatus.blockHeight + 1, timestamp: credential.issuedAt, decoded: { issuerId, statusListIndex } })
  return credential
}

// Replaces POST /revoke.
export async function revokeCredential(id: string) {
  await delay()
  const credential = useDemoStore.getState().credentials.find((item) => item.id === id)
  if (!credential || credential.status === 'revoked') throw new Error('This credential is not active and cannot be revoked.')
  useDemoStore.getState().revokeCredential(id)
  return { id, status: 'revoked' as const }
}

// Replaces GET /status/:issuer/:listId.
export async function getStatusList(issuerId: string, listId?: string) {
  await delay()
  return useDemoStore.getState().statusLists.find((list) => list.issuerId === issuerId && (!listId || list.listId === listId)) ?? null
}

// Replaces POST /mandates/proposal.
export async function proposeMandate(text: string) {
  await delay()
  const validatedText = proposalInput.parse(text)
  const amount = Number(validatedText.match(/(?:₹|rs\.?\s*)?([\d,]{4,})/i)?.[1]?.replaceAll(',', '')) || 50000
  return { purpose: /repair|vehicle|bike/i.test(validatedText) ? 'vehicle_repair' : 'working_capital', maxAmount: Math.min(amount, 100000), maxEmi: 3000, allowedLenders: ['lender-a', 'lender-b'], sourceText: validatedText }
}

// Replaces POST /mandates.
export async function createMandate(input: Omit<Mandate, 'id' | 'mandateHash' | 'txHash' | 'status'> & { signature: string }) {
  if (input.maxAmount > 100000 || input.maxAmount <= 0) throw new Error('The requested amount is outside the demo limit.')
  if (input.maxEmi <= 0 || input.maxEmi > input.maxAmount) throw new Error('The EMI must be positive and no greater than the requested amount.')
  if (input.disclosures.employerName || input.disclosures.rawStatements || input.disclosures.exactIncome) throw new Error('Protected information cannot be included in a permission.')
  const state = useDemoStore.getState()
  if (!state.walletUnlocked || !state.walletVault || state.walletOwnerId !== input.borrowerId) throw new Error('Unlock the matching borrower wallet before signing a permission.')
  if (Date.parse(input.expiresAt) <= Date.now()) throw new Error('A permission must expire in the future.')
  if (!input.allowedLenders.length || input.allowedLenders.length > 2 || input.allowedLenders.some((id) => !state.lenders.some((lender) => lender.id === id && lender.status === 'active'))) {
    throw new Error('Choose up to two active lenders for this permission.')
  }
  const { signature, ...unsignedInput } = input
  const signatureValid = await verifyWalletMessage(mandateSigningMessage(unsignedInput), signature, state.walletVault.publicKey)
  if (!signatureValid) throw new Error('The wallet signature could not be verified.')
  await delay()
  const mandate: Mandate = { ...unsignedInput, id: `mandate-${Date.now()}`, status: 'active', mandateHash: makeHash(), txHash: makeHash() }
  state.addMandate(mandate)
  state.addActivity({ id: `permission-event-${Date.now()}`, type: 'permission_created', mandateId: mandate.id, timestamp: new Date().toISOString(), description: 'Borrower signed a limited permission' })
  const block = state.admin.chainStatus.blockHeight + 1
  const timestamp = new Date().toISOString()
  state.addChainEvent({ id: `chain-mandate-${Date.now()}`, type: 'MandateCreated', txHash: mandate.txHash, block, timestamp, decoded: { mandateId: mandate.id, mandateHash: mandate.mandateHash } })
  useDemoStore.setState((current) => ({ admin: { ...current.admin, chainStatus: { ...current.admin.chainStatus, blockHeight: block, dailyTransactionsUsed: current.admin.chainStatus.dailyTransactionsUsed + 1 } } }))
  return mandate
}

// Replaces POST /mandates/:id/revoke.
export async function revokeMandate(id: string) {
  const state = useDemoStore.getState()
  const mandate = state.mandates.find((item) => item.id === id)
  if (!mandate || mandate.status !== 'active') throw new Error('This permission is no longer active.')
  const activeRuns = state.runs.filter((run) => run.mandateId === id && run.status === 'running')
  state.revokeMandate(id)
  for (const run of activeRuns) {
    state.appendRunEvent(run.id, { offsetSeconds: 0, type: 'blocked', title: 'Blocked: permission revoked', detail: 'The agent stopped. Starting again needs a new permission.', decision: 'deny', pepRule: 'mandate_revoked' })
    state.setRunStatus(run.id, 'stopped')
  }
  const timestamp = new Date().toISOString()
  const block = useDemoStore.getState().admin.chainStatus.blockHeight + 1
  const txHash = makeHash()
  state.addActivity({ id: `permission-revoked-${Date.now()}`, type: 'permission_revoked', mandateId: id, timestamp, description: 'Borrower revoked this permission' })
  state.addChainEvent({ id: `chain-revoke-${Date.now()}`, type: 'MandateRevoked', txHash, block, timestamp, decoded: { mandateId: id } })
  useDemoStore.setState((current) => ({ admin: { ...current.admin, chainStatus: { ...current.admin.chainStatus, blockHeight: block, dailyTransactionsUsed: current.admin.chainStatus.dailyTransactionsUsed + 1 } } }))
  await delay()
  return { id, status: 'revoked' as const }
}

// Replaces GET /runs/:id/events (SSE).
export async function startRun(mandateId: string) {
  await delay()
  const state = useDemoStore.getState()
  const mandate = state.mandates.find((item) => item.id === mandateId)
  if (mandate?.borrowerId !== state.personaId) throw new Error('This permission does not belong to the selected borrower.')
  const templateRun = state.runs.find((item) => item.borrowerId === state.personaId) ?? state.runs[0]
  if (!mandate || mandate.status !== 'active' || Date.parse(mandate.expiresAt) <= Date.now()) throw new Error('An active, unexpired permission is required to start this search.')
  if (mandate.allowedLenders.some((lenderId) => !state.lenders.some((lender) => lender.id === lenderId && lender.status === 'active'))) {
    throw new Error('A lender in this permission is no longer active.')
  }
  if (!templateRun) throw new Error('A loan search is not available for this borrower.')
  const startedAt = Date.now()
  const startedId = `run-${state.personaId}-${startedAt}`
  const runTemplate = { ...templateRun, borrowerId: state.personaId, rejection: undefined }
  const offerTemplates = state.offers.filter((offer) => offer.runId === templateRun.id)
  const selectedCredentials = state.credentials.filter((credential) => credential.subjectId === state.personaId && ['KycCredential', 'GigIncomeCredential', 'CashFlowCredential'].includes(credential.type))
  const borrower = state.borrowers.find((item) => item.id === state.personaId)
  const hasIncomeCredential = selectedCredentials.some((credential) => credential.type === 'GigIncomeCredential' && credential.status === 'active' && Date.parse(credential.validUntil) > Date.now())
  const hasRiskFlag = Boolean(borrower?.riskFlag)
  const trustedIssuers = new Set(state.issuers.filter((issuer) => issuer.registryStatus === 'active').map((issuer) => issuer.id))
  const hasExpiredCredential = selectedCredentials.some((credential) => credential.status === 'expired' || Date.parse(credential.validUntil) <= Date.now())
  const hasRevokedCredential = selectedCredentials.some((credential) => credential.status === 'revoked')
  const issuerTrustPasses = selectedCredentials.length > 0 && selectedCredentials.every((credential) => trustedIssuers.has(credential.issuerId))
  const checks = [
    { name: 'Issuer signature valid', passed: selectedCredentials.length > 0, reason: selectedCredentials.length > 0 ? 'Credential signatures verified against issuer keys.' : 'No signed credential is available.' },
    { name: 'Issuer trusted in registry', passed: issuerTrustPasses, reason: issuerTrustPasses ? 'Every proof issuer is active in SanadTrustRegistry.' : 'At least one proof issuer is not trusted in the registry.' },
    { name: 'Credential not expired', passed: !hasExpiredCredential, reason: hasExpiredCredential ? 'An included credential has expired.' : 'All included credentials are within their validity period.' },
    { name: 'Not revoked', passed: !hasRevokedCredential, reason: hasRevokedCredential ? 'A proof is present on its issuer status list.' : 'No included proof is marked revoked.' },
    { name: 'Holder key binding', passed: Boolean(borrower?.did), reason: 'Holder DID is bound to the presentation.' },
    { name: 'Nonce unused and audience matches', passed: true, reason: 'The request nonce is fresh and addressed to this lender.' },
  ]
  const firstFailedCheck = checks.find((check) => !check.passed)
  const inactiveLenderId = mandate.allowedLenders.find((lenderId) => state.lenders.find((item) => item.id === lenderId)?.status !== 'active')
  const personaRejection = !hasIncomeCredential && templateRun.rejection?.reason.toLowerCase().includes('income')
    ? templateRun.rejection
    : hasRiskFlag && templateRun.rejection?.reason.toLowerCase().includes('risk')
      ? templateRun.rejection
      : !hasIncomeCredential
        ? { reason: 'Income credential missing', lenderId: 'lender-a' }
        : hasRiskFlag
          ? { reason: 'Risk indicator flagged', lenderId: 'lender-a' }
          : undefined
  const rejection = firstFailedCheck
    ? { reason: firstFailedCheck.reason, lenderId: mandate.allowedLenders[0] ?? 'lender-a' }
    : personaRejection ?? (inactiveLenderId ? { reason: 'This lender is no longer active in the trust registry.', lenderId: inactiveLenderId } : state.personaId !== 'robin-das' ? { reason: 'No eligible offers are available for this synthetic persona.', lenderId: mandate.allowedLenders[0] ?? 'lender-a' } : undefined)
  const newOffers = rejection ? [] : offerTemplates.map((offer): Offer => ({ ...offer, id: `${offer.id}-${startedId}`, runId: startedId, outcome: 'sent' }))
  const started: AgentRun = { ...runTemplate, id: startedId, mandateId, status: 'running', steps: structuredClone(templateRun.steps), rejection }
  const requestTime = new Date().toISOString()
  const newRequests = (mandate.allowedLenders.length ? mandate.allowedLenders : ['lender-a', 'lender-b']).map((lenderId) => {
    const lender = state.lenders.find((item) => item.id === lenderId)
    const offer = newOffers.find((item) => item.lenderId === lenderId)
    const rejected = Boolean(rejection) || checks.some((check) => !check.passed) || lender?.status !== 'active'
    const requestId = `req-${started.id}-${lenderId}`
    return {
      id: requestId,
      lenderId,
      borrowerAlias: `Borrower #${state.personaId.toUpperCase().slice(0, 4)}`,
      subjectId: state.personaId,
      receivedAt: requestTime,
      status: rejected ? 'rejected' : offer ? 'offered' : 'verified',
      checks: lender?.status === 'active' ? checks : [{ name: 'Lender registry status', passed: false, reason: 'This lender is no longer active in the trust registry.' }, ...checks],
      disclosedClaims: !rejected && selectedCredentials.length ? ['KYC verified', `Income ≥ ₹${lender?.policy.minIncome.toLocaleString('en-IN') ?? '20,000'}`, 'Stable cashflow'] : [],
      withheldClaims: ['Employer name', 'Exact income', 'Raw statements'],
      underwriting: { foir: 31, riskScore: state.borrowers.find((item) => item.id === state.personaId)?.riskFlag ? 58 : 22, riskSegment: state.borrowers.find((item) => item.id === state.personaId)?.riskFlag ? 'MEDIUM' : 'LOW', riskBreakdown: [{ label: 'Income consistency', score: 8 }, { label: 'Active months', score: 7 }, { label: 'FOIR', score: 4 }, { label: 'Risk flags', score: 3 }], policyChecks: [{ rule: 'Minimum income', threshold: `₹${lender?.policy.minIncome.toLocaleString('en-IN') ?? '20,000'}`, value: (state.borrowers.find((item) => item.id === state.personaId)?.monthlyIncome ?? 0) >= (lender?.policy.minIncome ?? 20000) ? 'Met' : 'Below threshold', passed: (state.borrowers.find((item) => item.id === state.personaId)?.monthlyIncome ?? 0) >= (lender?.policy.minIncome ?? 20000) }, { rule: 'FOIR ceiling', threshold: `${lender?.policy.foirLimit ?? 50}%`, value: '31%', passed: (lender?.policy.foirLimit ?? 50) >= 31 }] },
      offerId: rejected ? undefined : offer?.id,
      credentialIds: selectedCredentials.map((credential) => credential.id),
      auditHash: makeHash(),
      result: rejected ? checks.find((check) => !check.passed)?.reason ?? rejection?.reason ?? 'Lender is not active.' : 'Verification passed',
    }
  })
  useDemoStore.setState((current) => ({ runs: [started, ...current.runs], offers: [...current.offers, ...newOffers], lenderRequests: [...newRequests, ...current.lenderRequests], runEvents: { ...current.runEvents, [started.id]: [] }, activeRunId: started.id }))
  return started
}

// Replaces GET /runs/:id/events (SSE).
export async function subscribeRun(runId: string) {
  await delay()
  return useDemoStore.getState().runs.find((run) => run.id === runId) ?? null
}

// Replaces POST /runs/:id/accept.
export async function acceptOffer(runId: string, offerId: string, signature: string) {
  await delay()
  const state = useDemoStore.getState()
  const run = state.runs.find((item) => item.id === runId)
  const offer = state.offers.find((item) => item.id === offerId)
  if (!run || run.status === 'stopped' || run.status === 'rejected') throw new Error('This run is not eligible for offer acceptance.')
  if (!offer || offer.runId !== runId) throw new Error('Offer does not belong to this run.')
  if (!state.walletUnlocked || !state.walletVault || state.walletOwnerId !== run.borrowerId) throw new Error('Unlock the matching borrower wallet before accepting an offer.')
  if (!await verifyWalletMessage(offerAcceptanceMessage(runId, offer), signature, state.walletVault.publicKey)) {
    throw new Error('The borrower signature could not be verified.')
  }
  if (offer.outcome === 'accepted') throw new Error('This offer has already been accepted.')
  state.acceptOffer(runId, offerId)
  const timestamp = new Date().toISOString()
  const block = useDemoStore.getState().admin.chainStatus.blockHeight + 1
  const txHash = makeHash()
  state.addActivity({ id: `offer-accepted-${Date.now()}`, type: 'offer_accepted', mandateId: run.mandateId, lenderId: offer.lenderId, requestId: `req-${runId}-${offer.lenderId}`, timestamp, description: 'Borrower accepted the final offer terms', txHash, block })
  state.addChainEvent({ id: `chain-offer-accepted-${Date.now()}`, type: 'OfferAccepted', txHash, block, timestamp, decoded: { offerId, lenderId: offer.lenderId, runId } })
  useDemoStore.setState((current) => ({ admin: { ...current.admin, chainStatus: { ...current.admin.chainStatus, blockHeight: block, dailyTransactionsUsed: current.admin.chainStatus.dailyTransactionsUsed + 1 } } }))
  return { runId, offerId, accepted: true, txHash }
}

// Replaces GET /activity.
export async function getActivity(borrowerId: string) {
  await delay()
  const state = useDemoStore.getState()
  const mandateIds = new Set(state.mandates.filter((item) => item.borrowerId === borrowerId).map((item) => item.id))
  return state.activity.filter((item) => !item.mandateId || mandateIds.has(String(item.mandateId)))
}

// Replaces GET /lenders/:id/requests.
export async function getLenderRequests(lenderId: string) {
  await delay()
  return useDemoStore.getState().lenderRequests.filter((request) => request.lenderId === lenderId)
}

// Replaces GET /audit/verify.
export async function verifyAuditChain() {
  await delay()
  const state = useDemoStore.getState()
  const entries = state.auditLog.map((entry) => entry.index === state.admin.auditTamperEntry && state.admin.simulateTampering ? { ...entry, prevHash: '0xtampered' } : entry)
  const brokenIndex = entries.findIndex((entry, index) => index > 0 && entry.prevHash !== entries[index - 1]?.hash)
  return { valid: brokenIndex === -1, brokenIndex: brokenIndex === -1 ? -1 : entries[brokenIndex].index, entries: entries.length }
}

// Replaces chain RPC or indexer.
export async function getChainEvents(filter?: { type?: string; limit?: number }) {
  await delay()
  const events = useDemoStore.getState().chainEvents.filter((event) => !filter?.type || event.type === filter.type)
  return events.slice(0, filter?.limit ?? events.length)
}

export async function addMockReceipt(input: { mandateId: string; lenderId: string; categories: string[]; requestId: string }) {
  const initialMandate = useDemoStore.getState().mandates.find((item) => item.id === input.mandateId)
  if (!initialMandate || initialMandate.status !== 'active') throw new Error('Disclosure was blocked because the mandate is inactive.')
  await delay()
  const state = useDemoStore.getState()
  const mandate = state.mandates.find((item) => item.id === input.mandateId)
  if (!mandate || mandate.status !== 'active' || !mandate.allowedLenders.includes(input.lenderId)) throw new Error('Disclosure was blocked because permission changed before receipt creation.')
  const block = state.admin.chainStatus.blockHeight + 1
  const receipt = { id: `receipt-${Date.now()}`, ...input, timestamp: new Date().toISOString(), commitmentHash: makeHash(), txHash: makeHash(), block }
  state.addActivity(receipt)
  const event: ChainEvent = { id: `chain-${Date.now()}`, type: 'DisclosureRecorded', txHash: receipt.txHash, block: receipt.block, timestamp: receipt.timestamp, decoded: { requestId: receipt.requestId, commitmentHash: receipt.commitmentHash } }
  state.addChainEvent(event)
  useDemoStore.setState((current) => ({ admin: { ...current.admin, chainStatus: { ...current.admin.chainStatus, blockHeight: block, dailyTransactionsUsed: current.admin.chainStatus.dailyTransactionsUsed + 1 } } }))
  return receipt
}

// Replaces GET /borrowers.
export async function getBorrowers() { await delay(); return useDemoStore.getState().borrowers }

// Replaces GET /borrowers/:id.
export async function getBorrower(id: string) { await delay(); return useDemoStore.getState().borrowers.find((item) => item.id === id) ?? null }

// Replaces GET /borrowers/:id/credentials.
export async function getCredentials(borrowerId: string) { await delay(); return useDemoStore.getState().credentials.filter((item) => item.subjectId === borrowerId) }

// Replaces GET /lenders.
export async function getLenders() { await delay(); return useDemoStore.getState().lenders }

// Replaces GET /issuers.
export async function getIssuers() { await delay(); return useDemoStore.getState().issuers }

// Replaces GET /borrowers/:id/mandates.
export async function getMandates(borrowerId: string) { await delay(); return useDemoStore.getState().mandates.filter((item) => item.borrowerId === borrowerId) }

// Replaces GET /runs/:id/offers.
export async function getOffers(runId: string) { await delay(); return useDemoStore.getState().offers.filter((item) => item.runId === runId) }

// Replaces GET /admin/overview.
export async function getAdminOverview() { await delay(); return { ...useDemoStore.getState().admin, issuers: useDemoStore.getState().issuers, lenders: useDemoStore.getState().lenders } }

// Replaces GET /lenders/:id/policy.
export async function getPolicies(lenderId?: string) {
  await delay()
  return useDemoStore.getState().policies.filter((policy) => !lenderId || policy.lenderId === lenderId)
}

// Replaces GET /lab/attack-scenarios.
export async function getAttackScenarios() { await delay(); return useDemoStore.getState().attackScenarios }

// Replaces GET /audit.
export async function getAuditLog() {
  await delay()
  const state = useDemoStore.getState()
  return state.auditLog.map((entry) => entry.index === state.admin.auditTamperEntry && state.admin.simulateTampering ? { ...entry, prevHash: '0xtampered' } : entry)
}

export type { AgentRun, Offer }
