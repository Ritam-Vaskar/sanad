/**
 * MockChainReader — reads from the Zustand store.
 * Behaviour is identical to what the UI did before C6.
 */

import type { ChainReader, ChainEventFilter, ChainMandate } from './types'
import type { ChainEvent, Issuer, Lender } from '@/types'
import { useDemoStore } from '@/lib/store/demo-store'

export class MockChainReader implements ChainReader {
  async getEvents(filter?: ChainEventFilter): Promise<ChainEvent[]> {
    const events = useDemoStore.getState().chainEvents.filter(
      (event) => !filter?.type || event.type === filter.type,
    )
    return events.slice(0, filter?.limit ?? events.length)
  }

  async getMandate(id: string): Promise<ChainMandate | null> {
    const mandate = useDemoStore.getState().mandates.find((m) => m.id === id)
    if (!mandate) return null
    return {
      id: mandate.id,
      mandateHash: mandate.mandateHash,
      expiry: mandate.expiresAt,
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

/** Singleton for the app lifetime. */
export const mockChainReader = new MockChainReader()
