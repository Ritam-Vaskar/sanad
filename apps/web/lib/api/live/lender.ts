/**
 * Live implementation — lender group.
 * Calls the core service at NEXT_PUBLIC_CORE_URL.
 */

import type { Lender, LenderPolicyDocument, LenderRequest } from '@/types'
import type { LenderApi } from '../types'
import type { HttpClient } from '../http'
import {
  lenderListResponseSchema,
  lenderRequestListResponseSchema,
  policyListResponseSchema,
} from '@/lib/schemas'

export function createLiveLenderApi(http: HttpClient): LenderApi {
  return {
    /** GET /lenders (NEEDS BACKEND) */
    async getLenders() {
      return http.get<Lender[]>('/lenders', {
        schema: lenderListResponseSchema,
      })
    },

    async getLenderRequests(lenderId) {
      return http.get<LenderRequest[]>(`/lenders/${lenderId}/requests`, {
        schema: lenderRequestListResponseSchema,
      })
    },

    /** GET /lenders/:id/policy (NEEDS BACKEND) */
    async getPolicies(lenderId?) {
      const path = lenderId ? `/lenders/${lenderId}/policy` : '/policies'
      return http.get<LenderPolicyDocument[]>(path, {
        schema: policyListResponseSchema,
      })
    },
  }
}

