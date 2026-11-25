/**
 * Mock implementation — credential group.
 * Extracted from the original mock-api.ts without behavioural changes.
 */

import type { CredentialApi } from '../types'
import { issueCredential, revokeCredential, getStatusList } from '../mock-api'

export const mockCredentialApi: CredentialApi = {
  issueCredential,
  revokeCredential,
  getStatusList,
}

