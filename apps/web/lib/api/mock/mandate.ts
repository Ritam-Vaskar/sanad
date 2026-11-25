/**
 * Mock implementation — mandate group.
 */

import type { MandateApi } from '../types'
import { proposeMandate, createMandate, revokeMandate } from '../mock-api'

export const mockMandateApi: MandateApi = {
  proposeMandate,
  createMandate,
  revokeMandate,
}

