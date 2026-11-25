'use client'

import type { Credential } from '@/types'
import { createWalletVault, unlockWalletVault, lockWalletSession, signWalletMessage, mandateSigningMessage, offerAcceptanceMessage } from '@/lib/crypto/wallet'
import { useDemoStore } from '@/lib/store/demo-store'
import type { WalletIdentity, WalletProvider } from './types'

/**
 * MockWalletProvider
 * Wraps the existing lib/crypto/wallet.ts primitives + Zustand store.
 * Behaviour is identical to the pre-C6 component code.
 */
export class MockWalletProvider implements WalletProvider {
  get isCreated(): boolean {
    return useDemoStore.getState().walletCreated
  }

  get isUnlocked(): boolean {
    return useDemoStore.getState().walletUnlocked
  }

  async createWallet(passphrase: string): Promise<void> {
    const state = useDemoStore.getState()
    const vault = await createWalletVault(passphrase)
    state.createWallet(vault, state.personaId)
  }

  async unlock(passphrase: string): Promise<void> {
    const state = useDemoStore.getState()
    const vault = state.walletVault
    if (!vault) throw new Error('No wallet vault found. Create a wallet first.')
    await unlockWalletVault(passphrase, vault)
    state.unlockWallet()
  }

  lock(): void {
    lockWalletSession()
    useDemoStore.getState().lockWallet()
  }

  getIdentity(): WalletIdentity | null {
    const state = useDemoStore.getState()
    const borrower = state.borrowers.find((b) => b.id === state.personaId)
    if (!borrower) return null
    return {
      did: borrower.did,
      ethAddress: borrower.ethAddress,
      shortId: `SND-${borrower.ethAddress.slice(2, 6).toUpperCase()}-${borrower.ethAddress.slice(-4).toUpperCase()}`,
    }
  }

  async listCredentials(): Promise<Credential[]> {
    const state = useDemoStore.getState()
    return state.credentials.filter((c) => c.subjectId === state.personaId)
  }

  async addCredential(_sdjwt: string): Promise<Credential> {
    // In mock mode there is no real SD-JWT parsing; the credential store is
    // managed via issueCredential() in lib/api. Return the most recently added
    // credential for the persona as a convenience.
    const state = useDemoStore.getState()
    const owned = state.credentials.filter((c) => c.subjectId === state.personaId)
    const last = owned[owned.length - 1]
    if (!last) throw new Error('No credentials found after addCredential.')
    return last
  }

  async present(
    credentialId: string,
    requestedClaims: string[],
    opts: { nonce: string; aud: string },
  ): Promise<string> {
    const state = useDemoStore.getState()
    const credential = state.credentials.find((c) => c.id === credentialId)
    if (!credential) throw new Error(`Credential ${credentialId} not found.`)
    const disclosed = credential.claims.filter((cl) => requestedClaims.includes(cl.key))
    const payload = JSON.stringify({
      credentialId,
      claims: Object.fromEntries(disclosed.map((cl) => [cl.key, cl.value])),
      nonce: opts.nonce,
      aud: opts.aud,
    })
    const signature = await signWalletMessage(payload)
    return JSON.stringify({ payload, signature })
  }

  async signTypedData(kind: 'Mandate' | 'Acceptance', payload: unknown): Promise<string> {
    let message: string
    if (kind === 'Mandate') {
      message = mandateSigningMessage(payload as Parameters<typeof mandateSigningMessage>[0])
    } else {
      const p = payload as Parameters<typeof offerAcceptanceMessage>[1]
      const runId = (payload as { runId: string }).runId
      message = offerAcceptanceMessage(runId, p)
    }
    return signWalletMessage(message)
  }
}
