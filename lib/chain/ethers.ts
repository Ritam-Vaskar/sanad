import type { ChainEvent, Issuer, Lender } from '@/types'
import type { ChainMandate, ChainReader } from './types'

/**
 * EthersChainReader — stub for ethers v6 on-chain integration.
 *
 * Requires:
 *   • ethers v6 installed (`pnpm add ethers`)
 *   • NEXT_PUBLIC_RPC_URL set to a JSON-RPC endpoint (e.g. Base Sepolia)
 *   • public/deployments.json with SanadTrustRegistry and SanadMandateLedger addresses
 *
 * NEEDS BACKEND: All methods throw until ethers is installed and env vars are set.
 * Replace each method body with real contract calls, for example:
 *
 *   import { ethers } from 'ethers'
 *   import deployments from '@/../public/deployments.json'
 *   const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL)
 *   const registry  = new ethers.Contract(deployments.SanadTrustRegistry,  REGISTRY_ABI,  provider)
 *   const ledger    = new ethers.Contract(deployments.SanadMandateLedger,   LEDGER_ABI,    provider)
 */
export class EthersChainReader implements ChainReader {
  async getEvents(_filter?: { type?: string; limit?: number }): Promise<ChainEvent[]> {
    throw new Error(
      '[EthersChainReader] NEEDS BACKEND: install ethers v6 and set NEXT_PUBLIC_RPC_URL.',
    )
  }

  async getMandate(_id: string): Promise<ChainMandate | null> {
    throw new Error(
      '[EthersChainReader] NEEDS BACKEND: install ethers v6 and set NEXT_PUBLIC_RPC_URL.',
    )
  }

  async getIssuers(): Promise<Issuer[]> {
    throw new Error(
      '[EthersChainReader] NEEDS BACKEND: install ethers v6 and set NEXT_PUBLIC_RPC_URL.',
    )
  }

  async getLenders(): Promise<Lender[]> {
    throw new Error(
      '[EthersChainReader] NEEDS BACKEND: install ethers v6 and set NEXT_PUBLIC_RPC_URL.',
    )
  }
}
