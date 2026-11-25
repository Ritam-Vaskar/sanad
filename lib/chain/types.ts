import type { ChainEvent, Issuer, Lender } from '@/types'

export type ChainMandate = {
  id: string
  expiry: number
  revoked: boolean
  txHash: string
}

/**
 * ChainReader — seam interface for on-chain data.
 * MockChainReader   reads from the Zustand demo store (current behaviour).
 * EthersChainReader calls on-chain contracts via ethers v6 + NEXT_PUBLIC_RPC_URL.
 */
export interface ChainReader {
  /** Return chain events, optionally filtered. */
  getEvents(filter?: { type?: string; limit?: number }): Promise<ChainEvent[]>
  /** Return mandate liveness data from the ledger, or null if not found. */
  getMandate(id: string): Promise<ChainMandate | null>
  /** Return all registered issuers. */
  getIssuers(): Promise<Issuer[]>
  /** Return all registered lenders. */
  getLenders(): Promise<Lender[]>
}
