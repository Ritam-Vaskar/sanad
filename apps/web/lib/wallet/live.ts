/**
 * LiveWalletProvider — stub for the real wallet service.
 *
 * Every method throws NEEDS BACKEND until the backend is wired and
 * NEXT_PUBLIC_API_MODE=live (or NEXT_PUBLIC_LIVE_GROUPS includes 'wallet').
 *
 * To implement: replace each throw with a fetch/IndexedDB call, then set
 * the env flag and remove the stub warning.
 */

import type { WalletProvider, WalletIdentity, WalletCredential, SignKind } from './types'

const STUB = 'NEEDS BACKEND: LiveWalletProvider is not yet implemented.'

export class LiveWalletProvider implements WalletProvider {
  async createWallet(_passphrase: string): Promise<void> {
    throw new Error(STUB)
  }

  async unlock(_passphrase: string): Promise<void> {
    throw new Error(STUB)
  }

  lock(): void {
    throw new Error(STUB)
  }

  getIdentity(): WalletIdentity | null {
    throw new Error(STUB)
  }

  async listCredentials(_borrowerId: string): Promise<WalletCredential[]> {
    throw new Error(STUB)
  }

  async addCredential(_sdjwt: string): Promise<WalletCredential> {
    throw new Error(STUB)
  }

  async present(
    _credentialId: string,
    _requestedClaims: string[],
    _options: { nonce: string; aud: string },
  ): Promise<string> {
    throw new Error(STUB)
  }

  async signTypedData(_kind: SignKind, _payload: unknown): Promise<string> {
    throw new Error(STUB)
  }
}
