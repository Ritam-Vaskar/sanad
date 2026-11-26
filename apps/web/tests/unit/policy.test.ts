import { describe, expect, it } from 'vitest'
import { buildVerificationChecklist } from '../../lib/verification'
import { seedData } from '../../lib/api/seed-data'
import type { LenderRequest } from '../../types'

const borrower = seedData.borrowers.find((item) => item.id === 'rahul-das')
const credential = seedData.credentials.find((item) => item.id === 'cred-rahul-kyc')

if (!borrower || !credential) {
  throw new Error('The Rahul borrower and KYC credential fixtures are required.')
}

const request: LenderRequest = {
  id: 'req-policy-test',
  lenderId: 'lender-a',
  borrowerAlias: 'Borrower #TEST',
  receivedAt: '2026-11-24T09:40:00.000Z',
  status: 'verified',
  checks: [],
  disclosedClaims: [],
  withheldClaims: [],
  underwriting: { foir: 0, riskScore: 0, riskSegment: 'LOW', riskBreakdown: [], policyChecks: [] },
  subjectId: borrower.id,
  credentialIds: [credential.id],
}

describe('shared lender verification policy', () => {
  it('passes a current credential from an active issuer', () => {
    const checks = buildVerificationChecklist(request, borrower, [credential], seedData.issuers)

    expect(checks).toHaveLength(6)
    expect(checks.every((check) => check.passed)).toBe(true)
  })

  it('fails the status-list check for a revoked credential', () => {
    const revokedCredential = { ...credential, status: 'revoked' as const }
    const checks = buildVerificationChecklist(request, borrower, [revokedCredential], seedData.issuers)

    expect(checks.find((check) => check.label === 'Not revoked')).toMatchObject({
      passed: false,
      detail: 'This proof is marked revoked in its issuer status list.',
    })
  })
})
