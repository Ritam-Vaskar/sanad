/**
 * Live implementation — credential group.
 * Calls the credential service at NEXT_PUBLIC_CREDENTIAL_URL.
 */

import type { Credential, StatusList } from '@/types'
import type { CredentialApi } from '../types'
import type { HttpClient } from '../http'
import {
  credentialResponseSchema,
  revokeResponseSchema,
  statusListResponseSchema,
} from '@/lib/schemas'

export function createLiveCredentialApi(http: HttpClient): CredentialApi {
  return {
    async issueCredential(type, subjectId, selectedIssuerId?) {
      return http.post<Credential>(`/issue/${type}`, {
        subjectId,
        ...(selectedIssuerId ? { issuerId: selectedIssuerId } : {}),
      }, { schema: credentialResponseSchema })
    },

    async revokeCredential(id) {
      return http.post<{ id: string; status: 'revoked' }>('/revoke', { id }, {
        schema: revokeResponseSchema,
      })
    },

    async getStatusList(issuerId, listId?) {
      const path = listId
        ? `/status/${issuerId}/${listId}`
        : `/status/${issuerId}/default`
      return http.get<StatusList | null>(path, {
        schema: statusListResponseSchema,
      })
    },
  }
}

