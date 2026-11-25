/**
 * Live implementation — wallet-facing group.
 * NEEDS BACKEND: GET /borrowers, GET /borrowers/:id,
 * GET /borrowers/:id/credentials, GET /borrowers/:id/mandates
 */

import type { Borrower, Credential, Mandate } from '@/types'
import type { WalletApi } from '../types'
import type { HttpClient } from '../http'
import {
  borrowerListResponseSchema,
  borrowerResponseSchema,
  credentialListResponseSchema,
  mandateListResponseSchema,
} from '@/lib/schemas'

export function createLiveWalletApi(http: HttpClient): WalletApi {
  return {
    async getBorrowers() {
      return http.get<Borrower[]>('/borrowers', {
        schema: borrowerListResponseSchema,
      })
    },

    async getBorrower(id) {
      return http.get<Borrower | null>(`/borrowers/${id}`, {
        schema: borrowerResponseSchema,
      })
    },

    async getCredentials(borrowerId) {
      return http.get<Credential[]>(`/borrowers/${borrowerId}/credentials`, {
        schema: credentialListResponseSchema,
      })
    },

    async getMandates(borrowerId) {
      return http.get<Mandate[]>(`/borrowers/${borrowerId}/mandates`, {
        schema: mandateListResponseSchema,
      })
    },
  }
}

