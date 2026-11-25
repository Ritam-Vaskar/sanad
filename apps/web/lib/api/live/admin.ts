/**
 * Live implementation — admin group.
 * Calls the core service at NEXT_PUBLIC_CORE_URL.
 */

import type { AttackScenario, AuditEntry, Issuer } from '@/types'
import type { AdminApi, AdminOverview, AuditVerifyResult } from '../types'
import type { HttpClient } from '../http'
import {
  adminOverviewResponseSchema,
  issuerListResponseSchema,
  auditLogResponseSchema,
  auditVerifyResponseSchema,
  attackScenarioListResponseSchema,
} from '@/lib/schemas'

export function createLiveAdminApi(http: HttpClient): AdminApi {
  return {
    /** GET /admin/overview (NEEDS BACKEND) */
    async getAdminOverview() {
      return http.get<AdminOverview>('/admin/overview', {
        schema: adminOverviewResponseSchema,
      })
    },

    /** GET /issuers (NEEDS BACKEND) */
    async getIssuers() {
      return http.get<Issuer[]>('/issuers', {
        schema: issuerListResponseSchema,
      })
    },

    async getAuditLog() {
      return http.get<AuditEntry[]>('/audit', {
        schema: auditLogResponseSchema,
      })
    },

    async verifyAuditChain() {
      return http.get<AuditVerifyResult>('/audit/verify', {
        schema: auditVerifyResponseSchema,
      })
    },

    /** GET /lab/attack-scenarios (NEEDS BACKEND) */
    async getAttackScenarios() {
      return http.get<AttackScenario[]>('/lab/attack-scenarios', {
        schema: attackScenarioListResponseSchema,
      })
    },
  }
}

