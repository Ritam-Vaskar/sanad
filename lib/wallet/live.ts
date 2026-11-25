'use client'

import type { Credential } from '@/types'
import type { WalletIdentity, WalletProvider } from './types'

/**
 * LiveWalletProvider — stub for future real implementation.
 *
 * When NEXT_PUBLIC_LIVE_GROUPS includes 'wallet', this provider is selected.
 * Replace each method body with real wallet-service calls (e.g. a hardware
 * wallet, a custodial backend, or a browser extension like MetaMask).
 *
 * NEEDS BACKEND: All methods currently throw NotImplemented to signal the
 * integration point clearly rather than silently misbehaving.
 */
export class LiveWalletProvider implements WalletProvider {
  get isCreated(): boolean {
    throw new Error('[LiveWalletProvider] NEEDS BACKEND: isCreated not implemented.')
  }

  get isUnlocked(): boolean {
    throw new Error('[LiveWalletProvider] NEEDS BACKEND: isUnlocked not implemented.')
  }

  async createWallet(_passphrase: string): Promise<void> {
    throw new Error('[LiveWalletProvider] NEEDS BACKEND: createWallet not implemented.')
  }

  async unlock(_passphrase: string): Promise<void> {
    throw new Error('[LiveWalletProvider] NEEDS BACKEND: unlock not implemented.')
  }

  lock(): void {
    throw new Error('[LiveWalletProvider] NEEDS BACKEND: lock not implemented.')
  }

  getIdentity(): WalletIdentity | null {
    throw new Error('[LiveWalletProvider] NEEDS BACKEND: getIdentity not implemented.')
  }

  async listCredentials(): Promise<Credential[]> {
    throw new Error('[LiveWalletProvider] NEEDS BACKEND: listCredentials not implemented.')
  }

  async addCredential(_sdjwt: string): Promise<Credential> {
    throw new Error('[LiveWalletProvider] NEEDS BACKEND: addCredential not implemented.')
  }

  async present(
    _credentialId: string,
    _requestedClaims: string[],
    _opts: { nonce: string; aud: string },
  ): Promise<string> {
    throw new Error('[LiveWalletProvider] NEEDS BACKEND: present not implemented.')
  }

  async signTypedData(_kind: 'Mandate' | 'Acceptance', _payload: unknown): Promise<string> {
    throw new Error('[LiveWalletProvider] NEEDS BACKEND: signTypedData not implemented.')
  }
}
