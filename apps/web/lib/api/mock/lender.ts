/**
 * Mock implementation — lender group.
 */

import type { LenderApi } from '../types'
import { getLenders, getLenderRequests, getPolicies } from '../mock-api'

export const mockLenderApi: LenderApi = {
  getLenders,
  getLenderRequests,
  getPolicies,
}

