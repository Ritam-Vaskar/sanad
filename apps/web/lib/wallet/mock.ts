/**
 * MockWalletProvider — wraps the existing crypto/wallet helpers and
 * Zustand store. Behaviour is identical to what the UI did before C6.
 */

import type { WalletProvider, WalletIdentity, WalletCredential, SignKind } from './types'
import {
  createWalletVault,
  unlockWalletVault,
  lockWalletSession,
  signWalletMessage,
  mandateSigningMessage,
  offerAcceptanceMessage,
} from '@/lib/crypto/wallet'
import { useDemoStore } from '@/lib/store/demo-store'

export class MockWalletProvider implements WalletProvider {
  async createWallet(passphrase: string): Promise<void> {
    const vault = await createWalletVault(passphrase)
    const { personaId, createWallet } = useDemoStore.getState()
    createWallet(vault, personaId)
  }

  async unlock(passphrase: string): Promise<void> {
    const { walletVault, unlockWallet } = useDemoStore.getState()
    if (!walletVault) throw new Error('No wallet found. Create one first.')
    await unlockWalletVault(passphrase, walletVault)
    unlockWallet()
  }

  lock(): void {
    lockWalletSession()
    useDemoStore.getState().lockWallet()
  }

  getIdentity(): WalletIdentity | null {
    const { walletVault, walletUnlocked, personaId, borrowers } = useDemoStore.getState()
    if (!walletVault || !walletUnlocked) return null
    const borrower = borrowers.find((b) => b.id === personaId)
    return {
      did: borrower?.did ?? `did:key:${personaId}`,
      address: borrower?.ethAddress ?? '0x0000',
      publicKey: walletVault.publicKey,
    }
  }

  async listCredentials(borrowerId: string): Promise<WalletCredential[]> {
    const { credentials } = useDemoStore.getState()
    return credentials
      .filter((c) => c.subjectId === borrowerId)
      .map(
        (c): WalletCredential => ({
          id: c.id,
          type: c.type,
          issuerId: c.issuerId,
          status: c.status,
          issuedAt: c.issuedAt,
          validUntil: c.validUntil,
          claims: c.claims,
        }),
      )
  }

  async addCredential(_sdjwt: string): Promise<WalletCredential> {
    // In mock mode there is no real SD-JWT to parse; callers use
    // issueCredential() from lib/api directly and this path is a stub.
    throw new Error('addCredential is not supported in mock mode. Use the issuer portal to add credentials.')
  }

  async present(
    credentialId: string,
    requestedClaims: string[],
    _options: { nonce: string; aud: string },
  ): Promise<string> {
    const { credentials } = useDemoStore.getState()
    const cred = credentials.find((c) => c.id === credentialId)
    if (!cred) throw new Error('Credential not found in wallet.')
    // Return a synthetic presentation token with the requested claims.
    const disclosed = cred.claims.filter((claim) => requestedClaims.includes(claim.key))
    return JSON.stringify({
      credentialId,
      type: cred.type,
      disclosedClaims: disclosed.map((c) => ({ key: c.key, value: c.value })),
      nonce: _options.nonce,
      aud: _options.aud,
      iat: Date.now(),
    })
  }

  async signTypedData(kind: SignKind, payload: unknown): Promise<string> {
    const message =
      kind === 'Mandate'
        ? mandateSigningMessage(payload as Parameters<typeof mandateSigningMessage>[0])
        : offerAcceptanceMessage(
            (payload as { runId: string }).runId,
            payload as Parameters<typeof offerAcceptanceMessage>[1],
          )
    return signWalletMessage(message)
  }
}

/** Singleton for the app lifetime. */
export const mockWallet = new MockWalletProvider()
