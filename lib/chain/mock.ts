import type { ChainEvent, Issuer, Lender } from '@/types'
import { useDemoStore } from '@/lib/store/demo-store'
import type { ChainMandate, ChainReader } from './types'

/**
 * MockChainReader
 * Reads chain data directly from the Zustand demo store — identical to what
 * the Explorer portal currently reads.  No behaviour change in mock mode.
 */
export class MockChainReader implements ChainReader {
  async getEvents(filter?: { type?: string; limit?: number }): Promise<ChainEvent[]> {
    let events = useDemoStore.getState().chainEvents
    if (filter?.type) {
      events = events.filter((e) => e.type === filter.type)
    }
    if (filter?.limit && filter.limit > 0) {
      events = events.slice(0, filter.limit)
    }
    return events
  }

  async getMandate(id: string): Promise<ChainMandate | null> {
    const mandate = useDemoStore.getState().mandates.find((m) => m.id === id)
    if (!mandate) return null
    return {
      id: mandate.id,
      expiry: new Date(mandate.expiresAt).getTime(),
      revoked: mandate.status === 'revoked',
      txHash: mandate.txHash,
    }
  }

  async getIssuers(): Promise<Issuer[]> {
    return useDemoStore.getState().issuers
  }

  async getLenders(): Promise<Lender[]> {
    return useDemoStore.getState().lenders
  }
}
