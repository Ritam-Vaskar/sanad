/**
 * Mock implementation — runs group.
 */

import type { RunsApi } from '../types'
import { startRun, subscribeRun, acceptOffer, getOffers } from '../mock-api'

export const mockRunsApi: RunsApi = {
  startRun,
  subscribeRun,
  acceptOffer,
  getOffers,
}

