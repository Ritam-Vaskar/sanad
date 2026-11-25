/**
 * Live implementation — runs group.
 * Calls the core service at NEXT_PUBLIC_CORE_URL.
 * SSE for /runs/:id/events is handled by the RunEventsSource seam (lib/runs);
 * startRun here initiates the run and returns the initial state.
 */

import type { AgentRun, Offer } from '@/types'
import type { RunsApi } from '../types'
import type { HttpClient } from '../http'
import {
  agentRunResponseSchema,
  acceptOfferResponseSchema,
  offerListResponseSchema,
} from '@/lib/schemas'

export function createLiveRunsApi(http: HttpClient): RunsApi {
  return {
    /** POST /runs (NEEDS BACKEND — start a run from a mandate) */
    async startRun(mandateId) {
      return http.post<AgentRun>('/runs', { mandateId }, {
        schema: agentRunResponseSchema.unwrap(),
      })
    },

    async subscribeRun(runId) {
      return http.get<AgentRun | null>(`/runs/${runId}`, {
        schema: agentRunResponseSchema,
      })
    },

    async acceptOffer(runId, offerId, signature) {
      return http.post<{ runId: string; offerId: string; accepted: true; txHash?: string }>(
        `/runs/${runId}/accept`,
        { offerId, signature },
        { schema: acceptOfferResponseSchema },
      )
    },

    /** GET /runs/:id/offers (NEEDS BACKEND) */
    async getOffers(runId) {
      return http.get<Offer[]>(`/runs/${runId}/offers`, {
        schema: offerListResponseSchema,
      })
    },
  }
}

