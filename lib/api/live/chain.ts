/**
 * Live implementation — chain group.
 * Calls the core service or chain indexer at NEXT_PUBLIC_CORE_URL.
 */

import type { ChainEvent } from '@/types'
import type { ChainApi } from '../types'
import type { HttpClient } from '../http'
import { chainEventListResponseSchema } from '@/lib/schemas'

export function createLiveChainApi(http: HttpClient): ChainApi {
  return {
    /** GET /chain/events (NEEDS BACKEND — chain indexer or RPC) */
    async getChainEvents(filter?) {
      return http.get<ChainEvent[]>('/chain/events', {
        query: {
          ...(filter?.type ? { type: filter.type } : {}),
          ...(filter?.limit ? { limit: filter.limit } : {}),
        },
        schema: chainEventListResponseSchema,
      })
    },
  }
}

