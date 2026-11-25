/**
 * Mock implementation — wallet-facing group.
 */

import type { WalletApi } from '../types'
import { getBorrowers, getBorrower, getCredentials, getMandates } from '../mock-api'

export const mockWalletApi: WalletApi = {
  getBorrowers,
  getBorrower,
  getCredentials,
  getMandates,
}

