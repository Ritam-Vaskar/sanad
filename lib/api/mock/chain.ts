/**
 * Mock implementation — chain group.
 */

import type { ChainApi } from '../types'
import { getChainEvents } from '../mock-api'

export const mockChainApi: ChainApi = {
  getChainEvents,
}

