/**
 * Live implementation — mandate group.
 * Calls the core service at NEXT_PUBLIC_CORE_URL.
 */

import type { Mandate } from '@/types'
import type { CreateMandateInput, MandateApi, MandateProposal } from '../types'
import type { HttpClient } from '../http'
import {
  mandateProposalResponseSchema,
  mandateResponseSchema,
  revokeResponseSchema,
} from '@/lib/schemas'

export function createLiveMandateApi(http: HttpClient): MandateApi {
  return {
    async proposeMandate(text) {
      return http.post<MandateProposal>('/mandates/proposal', { text }, {
        schema: mandateProposalResponseSchema,
      })
    },

    async createMandate(input: CreateMandateInput) {
      return http.post<Mandate>('/mandates', input, {
        schema: mandateResponseSchema,
      })
    },

    async revokeMandate(id) {
      return http.post<{ id: string; status: 'revoked' }>(
        `/mandates/${id}/revoke`, {}, { schema: revokeResponseSchema },
      )
    },
  }
}

