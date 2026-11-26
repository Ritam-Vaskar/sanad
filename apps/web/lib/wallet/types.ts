/**
 * WalletProvider interface — C6 seam.
 *
 * The UI uses only this interface through useWallet().
 * Two implementations exist: MockWalletProvider (current behaviour, unchanged)
 * and LiveWalletProvider (stub — throws NEEDS BACKEND until wired).
 */

export interface WalletIdentity {
  did: string
  address: string
  publicKey: JsonWebKey
}

/** A decoded credential entry returned by listCredentials(). */
export interface WalletCredential {
  id: string
  type: string
  issuerId: string
  status: string
  issuedAt: string
  validUntil: string
  claims: Array<{ key: string; label: string; value: unknown; disclosable: boolean; sharedByDefault: boolean; sensitive: boolean }>
}

/** Canonical payload shapes for signTypedData. */
export type SignKind = 'Mandate' | 'Acceptance'

export interface WalletProvider {
  /**
   * Create a new wallet vault encrypted with the passphrase.
   * Persists the vault and marks the wallet as unlocked in the store.
   */
  createWallet(passphrase: string): Promise<void>

  /** Decrypt the vault and load the signing key into memory. */
  unlock(passphrase: string): Promise<void>

  /** Clear the in-memory signing key. */
  lock(): void

  /** Return the current identity, or null if no wallet exists. */
  getIdentity(): WalletIdentity | null

  /**
   * List credentials currently stored in the wallet.
   * In mock mode these come from the Zustand store.
   */
  listCredentials(borrowerId: string): Promise<WalletCredential[]>

  /**
   * Store a raw SD-JWT string as a new credential.
   * In mock mode this delegates to issueCredential from the mock API.
   */
  addCredential(sdjwt: string): Promise<WalletCredential>

  /**
   * Build a selective-disclosure presentation for the given credential,
   * disclosing only requestedClaims, bound to nonce and aud.
   */
  present(
    credentialId: string,
    requestedClaims: string[],
    options: { nonce: string; aud: string },
  ): Promise<string>

  /**
   * EIP-712–style typed data signing.
   * kind='Mandate' → mandateSigningMessage(payload)
   * kind='Acceptance' → offerAcceptanceMessage(payload)
   */
  signTypedData(kind: SignKind, payload: unknown): Promise<string>
}
