/**
 * ChainReader interface — C6 seam.
 *
 * Read-only access to on-chain state: events, mandates, issuers, lenders.
 * Two implementations: MockChainReader (Zustand store) and EthersChainReader
 * (ethers v6 stub — requires NEXT_PUBLIC_RPC_URL and deployments.json).
 */

import type { ChainEvent, Issuer, Lender } from '@/types'

/** Filter accepted by getEvents(). */
export type ChainEventFilter = {
  type?: string
  limit?: number
}

/** On-chain mandate record (subset — no personal data). */
export interface ChainMandate {
  id: string
  mandateHash: string
  expiry: string
  revoked: boolean
  txHash: string
}

export interface ChainReader {
  /** Read chain events, optionally filtered by type and limited in count. */
  getEvents(filter?: ChainEventFilter): Promise<ChainEvent[]>

  /** Look up a single mandate by its on-chain id. */
  getMandate(id: string): Promise<ChainMandate | null>

  /** Return all registered issuers from the trust registry. */
  getIssuers(): Promise<Issuer[]>

  /** Return all registered lenders from the trust registry. */
  getLenders(): Promise<Lender[]>
}
