import { beforeEach, describe, expect, it } from 'vitest'
import { verifyAuditChain } from '../../lib/api/mock-api'
import { seedData } from '../../lib/api/seed-data'
import { useDemoStore } from '../../lib/store/demo-store'

describe('audit hash chain', () => {
  beforeEach(() => {
    useDemoStore.setState({
      auditLog: structuredClone(seedData.auditLog),
      admin: { ...structuredClone(seedData.admin), simulateTampering: false },
    })
  })

  it('verifies an intact chain', async () => {
    await expect(verifyAuditChain()).resolves.toMatchObject({
      valid: true,
      brokenIndex: -1,
      entries: seedData.auditLog.length,
    })
  })

  it('reports the index of the first tampered link', async () => {
    useDemoStore.setState((state) => ({
      admin: { ...state.admin, simulateTampering: true },
    }))

    await expect(verifyAuditChain()).resolves.toMatchObject({
      valid: false,
      brokenIndex: seedData.admin.auditTamperEntry,
      entries: seedData.auditLog.length,
    })
  })
})
