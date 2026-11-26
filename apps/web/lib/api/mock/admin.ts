/**
 * Mock implementation — admin group.
 */

import type { AdminApi } from '../types'
import { getAdminOverview, getIssuers, getAuditLog, verifyAuditChain, getAttackScenarios } from '../mock-api'

export const mockAdminApi: AdminApi = {
  getAdminOverview,
  getIssuers,
  getAuditLog,
  verifyAuditChain,
  getAttackScenarios,
}

