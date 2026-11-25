/**
 * Live implementation — activity group.
 * Calls the core service at NEXT_PUBLIC_CORE_URL.
 */

import type { ActivityEntry } from '@/types'
import type { ActivityApi, ConsentReceipt, MockReceiptInput } from '../types'
import type { HttpClient } from '../http'
import {
  activityListResponseSchema,
  mockReceiptResponseSchema,
} from '@/lib/schemas'

export function createLiveActivityApi(http: HttpClient): ActivityApi {
  return {
    async getActivity(borrowerId) {
      return http.get<ActivityEntry[]>('/activity', {
        query: { borrower: borrowerId },
        schema: activityListResponseSchema,
      })
    },

    /** POST /disclosure-receipts (NEEDS BACKEND) */
    async addMockReceipt(input: MockReceiptInput) {
      return http.post<ConsentReceipt>('/disclosure-receipts', input, {
        schema: mockReceiptResponseSchema,
      })
    },
  }
}

