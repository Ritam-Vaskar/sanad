import type { Borrower, Credential, Issuer, LenderRequest } from '@/types'

export type VerificationCheck = { label: string; passed: boolean; detail: string }

export function buildVerificationChecklist(request: LenderRequest, borrower: Borrower | undefined, credentials: Credential[], issuers: Issuer[]): VerificationCheck[] {
  const usedCredentials = request.credentialIds?.length
    ? credentials.filter((credential) => request.credentialIds?.includes(credential.id))
    : credentials.filter((credential) => credential.subjectId === (request.subjectId ?? borrower?.id))
  const relevant = usedCredentials.filter((credential) => credential.type === 'KycCredential' || credential.type === 'GigIncomeCredential' || credential.type === 'CashFlowCredential')
  const authoredFailure = request.checks.find((check) => !check.passed)
  const failingName = authoredFailure?.name.toLowerCase() ?? ''
  const failingReason = authoredFailure?.reason.toLowerCase() ?? ''
  const signaturePasses = !failingName.includes('signature') && !failingReason.includes('signature invalid')
  const registryPasses = relevant.length > 0 && relevant.every((credential) => issuers.find((issuer) => issuer.id === credential.issuerId)?.registryStatus === 'active') && !failingName.includes('issuer trusted')
  const expired = relevant.some((credential) => credential.status === 'expired' || Date.parse(credential.validUntil) <= Date.now())
  const revoked = relevant.some((credential) => credential.status === 'revoked')
  const expirationFailure = failingName.includes('expired') || failingName.includes('expiry') || failingReason.includes('expired') || failingReason.includes('expiry')
  const revocationFailure = failingName.includes('revoked') || failingReason.includes('revoked') || (failingName.includes('credential status') && !expirationFailure)
  const expirationPasses = !expired && !expirationFailure
  const revocationPasses = !revoked && !revocationFailure
  const holderPasses = Boolean(borrower?.did) && !failingName.includes('holder key')
  const noncePasses = !failingName.includes('nonce') && !failingName.includes('replay')
  const authoredReason = authoredFailure?.reason
  return [
    { label: 'Issuer signature valid', passed: signaturePasses, detail: !signaturePasses ? authoredReason ?? 'Issuer signature could not be verified.' : 'The signature matches the issuer public key.' },
    { label: 'Issuer trusted in registry', passed: registryPasses, detail: registryPasses ? 'Every proof issuer is active in SanadTrustRegistry.' : 'The issuer is inactive or not present in the trusted registry.' },
    { label: 'Credential not expired', passed: expirationPasses, detail: expirationPasses ? 'The proof is within its validity period.' : authoredReason ?? 'At least one proof has expired.' },
    { label: 'Not revoked', passed: revocationPasses, detail: revocationPasses ? 'The status-list index is clear.' : authoredReason ?? 'This proof is marked revoked in its issuer status list.' },
    { label: 'Holder key binding', passed: holderPasses, detail: holderPasses ? 'The presentation is bound to the borrower DID.' : 'The holder key could not be matched to the credential subject.' },
    { label: 'Nonce unused and audience matches', passed: noncePasses, detail: noncePasses ? 'The nonce is unused and the presentation targets this lender.' : authoredReason ?? 'The request nonce has already been used or the audience does not match.' },
  ]
}
