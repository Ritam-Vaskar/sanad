import type { Credential } from '@/types'

export type WalletIdentity = {
  did: string
  ethAddress: string
  shortId: string
}

/**
 * WalletProvider — seam interface for the local signing wallet.
 * MockWalletProvider wraps lib/crypto/wallet.ts + Zustand store (current behaviour).
 * LiveWalletProvider can be swapped in via NEXT_PUBLIC_LIVE_GROUPS=wallet.
 */
export interface WalletProvider {
  /** True when a vault has been created for the current persona. */
  readonly isCreated: boolean
  /** True when the vault has been decrypted this session. */
  readonly isUnlocked: boolean
  /** Create and persist a new vault, encrypted with passphrase. */
  createWallet(passphrase: string): Promise<void>
  /** Decrypt the vault and load the signing key into memory. */
  unlock(passphrase: string): Promise<void>
  /** Drop the in-memory signing key (session lock). */
  lock(): void
  /** Return the identity derived from the current persona, or null if not ready. */
  getIdentity(): WalletIdentity | null
  /** List credentials held in the wallet for the active persona. */
  listCredentials(): Promise<Credential[]>
  /** Add a credential (SD-JWT string) to the wallet. */
  addCredential(sdjwt: string): Promise<Credential>
  /**
   * Build a minimal selective-disclosure presentation.
   * Returns a signed JSON string suitable for a verifier.
   */
  present(
    credentialId: string,
    requestedClaims: string[],
    opts: { nonce: string; aud: string },
  ): Promise<string>
  /**
   * Sign typed data.
   * kind='Mandate'    → mandateSigningMessage payload
   * kind='Acceptance' → offerAcceptanceMessage payload
   */
  signTypedData(kind: 'Mandate' | 'Acceptance', payload: unknown): Promise<string>
}
