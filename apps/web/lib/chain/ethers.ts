/**
 * EthersChainReader — stub for the live on-chain reader.
 *
 * Requires:
 *   NEXT_PUBLIC_RPC_URL          — EVM JSON-RPC endpoint (Base Sepolia, etc.)
 *   public/deployments.json      — { SanadTrustRegistry: "0x…", SanadMandateLedger: "0x…" }
 *
 * To activate: install ethers v6 (`pnpm add ethers`), replace each throw with
 * a real ethers call, and set NEXT_PUBLIC_LIVE_GROUPS to include 'chain'.
 *
 * STUB: every method throws NEEDS BACKEND.
 */

import type { ChainReader, ChainEventFilter, ChainMandate } from './types'
import type { ChainEvent, Issuer, Lender } from '@/types'

const STUB = 'NEEDS BACKEND: EthersChainReader requires ethers v6 and NEXT_PUBLIC_RPC_URL.'

export class EthersChainReader implements ChainReader {
  async getEvents(_filter?: ChainEventFilter): Promise<ChainEvent[]> {
    throw new Error(STUB)
  }

  async getMandate(_id: string): Promise<ChainMandate | null> {
    throw new Error(STUB)
  }

  async getIssuers(): Promise<Issuer[]> {
    throw new Error(STUB)
  }

  async getLenders(): Promise<Lender[]> {
    throw new Error(STUB)
  }
}
