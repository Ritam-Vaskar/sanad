/**
 * Mock implementation — activity group.
 */

import type { ActivityApi } from '../types'
import { getActivity, addMockReceipt } from '../mock-api'

export const mockActivityApi: ActivityApi = {
  getActivity,
  addMockReceipt,
}

