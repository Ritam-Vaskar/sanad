import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ActivityEntry, AdminData, AgentRun, AttackScenario, AuditEntry, Borrower, ChainEvent, Credential, DemoSpeed, Issuer, Lender, LenderPolicyDocument, LenderRequest, Mandate, Offer, RunStep, StatusList } from '@/types'
import { seedData } from './seed-data'

type ActivityItem = ActivityEntry

type DemoState = {
  hasHydrated: boolean
  walletCreated: boolean
  walletUnlocked: boolean
  personaId: string
  speed: DemoSpeed
  showTechnical: boolean
  liveFeed: boolean
  language: 'en' | 'hi'
  activeRunId: string | null
  runEvents: Record<string, RunStep[]>
  borrowers: Borrower[]
  credentials: Credential[]
  issuers: Issuer[]
  lenders: Lender[]
  mandates: Mandate[]
  runs: AgentRun[]
  offers: Offer[]
  activity: ActivityItem[]
  lenderRequests: LenderRequest[]
  chainEvents: ChainEvent[]
  statusLists: StatusList[]
  policies: LenderPolicyDocument[]
  auditLog: AuditEntry[]
  attackScenarios: AttackScenario[]
  admin: AdminData
  setHasHydrated: (value: boolean) => void
  createWallet: () => void
  unlockWallet: () => void
  lockWallet: () => void
  setPersona: (id: string) => void
  setSpeed: (speed: DemoSpeed) => void
  setShowTechnical: (value: boolean) => void
  setLiveFeed: (value: boolean) => void
  setLanguage: (language: 'en' | 'hi') => void
  setActiveRun: (id: string | null) => void
  setRunStatus: (id: string, status: string) => void
  appendRunEvent: (id: string, event: RunStep) => void
  setSimulateTampering: (value: boolean) => void
  addCredential: (credential: Credential) => void
  revokeCredential: (id: string) => void
  addMandate: (mandate: Mandate) => void
  revokeMandate: (id: string) => void
  addActivity: (item: ActivityItem) => void
  addChainEvent: (event: ChainEvent) => void
  addLenderRequest: (request: LenderRequest) => void
  updateIssuerStatus: (id: string, status: Issuer['registryStatus']) => void
  updateLenderStatus: (id: string, status: Lender['status']) => void
  approveRegistration: (id: string, kind: 'issuer' | 'lender') => void
  rejectRegistration: (id: string, kind: 'issuer' | 'lender', reason: string) => void
  saveLenderPolicy: (lenderId: string, values: { foirLimit?: number; feePercent?: number; minIncome?: number }) => void
  updateLenderSettings: (lenderId: string, values: Partial<Pick<Lender, 'apiKeyMasked' | 'webhookUrl' | 'notifications'>>) => void
  setOfferOutcome: (offerId: string, outcome: Offer['outcome']) => void
  acceptOffer: (runId: string, offerId: string) => void
  resetDemo: () => void
}

const initialData = () => ({
  walletCreated: false,
  walletUnlocked: false,
  personaId: 'robin-das' as const,
  speed: 1 as DemoSpeed,
  showTechnical: false,
  liveFeed: false,
  language: 'en' as const,
  activeRunId: null,
  runEvents: {} as Record<string, RunStep[]>,
  borrowers: structuredClone(seedData.borrowers),
  credentials: structuredClone(seedData.credentials),
  issuers: structuredClone(seedData.issuers),
  lenders: structuredClone(seedData.lenders),
  mandates: structuredClone(seedData.mandates),
  runs: structuredClone(seedData.runs),
  offers: structuredClone(seedData.offers),
  activity: structuredClone(seedData.activity) as ActivityItem[],
  lenderRequests: structuredClone(seedData.lenderRequests),
  chainEvents: structuredClone(seedData.chainEvents),
  statusLists: structuredClone(seedData.statusLists),
  policies: structuredClone(seedData.policies),
  auditLog: structuredClone(seedData.auditLog),
  attackScenarios: structuredClone(seedData.attackScenarios),
  admin: structuredClone(seedData.admin),
})

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      ...initialData(),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      createWallet: () => set({ walletCreated: true, walletUnlocked: true }),
      unlockWallet: () => set({ walletUnlocked: true }),
      lockWallet: () => set({ walletUnlocked: false }),
      setPersona: (personaId) => set({ personaId }),
      setSpeed: (speed) => set({ speed }),
      setShowTechnical: (showTechnical) => set({ showTechnical }),
      setLiveFeed: (liveFeed) => set({ liveFeed }),
      setLanguage: (language) => set({ language }),
      setActiveRun: (activeRunId) => set({ activeRunId }),
      setRunStatus: (id, status) => set((state) => ({ runs: state.runs.map((run) => run.id === id ? { ...run, status } : run) })),
      appendRunEvent: (id, event) => set((state) => ({ runEvents: { ...state.runEvents, [id]: [...(state.runEvents[id] ?? []), event] } })),
      setSimulateTampering: (simulateTampering) => set((state) => ({ admin: { ...state.admin, simulateTampering } })),

      addCredential: (credential) => set((state) => ({
        credentials: [credential, ...state.credentials],
        issuers: state.issuers.map((issuer) => issuer.id === credential.issuerId ? { ...issuer, issuedCount: issuer.issuedCount + 1 } : issuer),
      })),
      revokeCredential: (id) => set((state) => {
        const credential = state.credentials.find((item) => item.id === id)
        if (!credential || credential.status === 'revoked') return {}
        const timestamp = new Date().toISOString()
        const txHash = `0x${Math.random().toString(16).slice(2, 12)}…${Date.now().toString(16).slice(-4)}`
        const listHash = `0x${Math.random().toString(16).slice(2, 14)}…${Date.now().toString(16).slice(-4)}`
        const statusLists = state.statusLists.map((list) => {
          if (list.issuerId !== credential.issuerId) return list
          const bits = [...list.bits]
          bits[credential.statusListIndex] = 1
          return { ...list, bits, revokedIndices: Array.from(new Set([...list.revokedIndices, credential.statusListIndex])).sort((a, b) => a - b), listHash, lastOnChainRootTx: txHash }
        })
        const block = state.admin.chainStatus.blockHeight + 1
        return {
          credentials: state.credentials.map((item) => item.id === id ? { ...item, status: 'revoked' } : item),
          issuers: state.issuers.map((issuer) => issuer.id === credential.issuerId ? { ...issuer, revokedCount: issuer.revokedCount + 1 } : issuer),
          statusLists,
          activity: [{ id: `revoke-${Date.now()}`, type: 'credential_revoked', credentialId: id, timestamp, description: 'Credential revoked and added to the issuer status list' }, ...state.activity],
          chainEvents: [{ id: `chain-status-${Date.now()}`, type: 'StatusRootUpdated', txHash, block, timestamp, decoded: { issuerId: credential.issuerId, listHash } }, { id: `chain-credential-revoked-${Date.now()}`, type: 'CredentialRevoked', txHash, block, timestamp, decoded: { credentialId: id, issuerId: credential.issuerId } }, ...state.chainEvents],
          admin: { ...state.admin, chainStatus: { ...state.admin.chainStatus, blockHeight: block, dailyTransactionsUsed: state.admin.chainStatus.dailyTransactionsUsed + 1 } },
        }
      }),
      addMandate: (mandate) => set((state) => ({ mandates: [mandate, ...state.mandates] })),
      revokeMandate: (id) => set((state) => ({ mandates: state.mandates.map((item) => item.id === id ? { ...item, status: 'revoked' } : item) })), 
      addActivity: (item) => set((state) => ({ activity: [item, ...state.activity] })),
      addChainEvent: (event) => set((state) => ({ chainEvents: [event, ...state.chainEvents] })),
      addLenderRequest: (request) => set((state) => ({ lenderRequests: [request, ...state.lenderRequests] })),
      updateIssuerStatus: (id, status) => set((state) => {
        const timestamp = new Date().toISOString()
        const txHash = `0x${Math.random().toString(16).slice(2, 12)}…${Date.now().toString(16).slice(-4)}`
        const block = state.admin.chainStatus.blockHeight + 1
        const issuer = state.issuers.find((item) => item.id === id)
        if (!issuer) return {}
        return {
          issuers: state.issuers.map((item) => item.id === id ? { ...item, registryStatus: status } : item),
          admin: { ...state.admin, governanceLog: [{ id: `gov-${Date.now()}`, action: `Issuer ${status === 'active' ? 'activated' : 'deactivated'}: ${issuer.name}`, actor: 'Trust Admin', timestamp }, ...state.admin.governanceLog], chainStatus: { ...state.admin.chainStatus, blockHeight: block, dailyTransactionsUsed: state.admin.chainStatus.dailyTransactionsUsed + 1 } },
          chainEvents: [{ id: `chain-registry-${Date.now()}`, type: status === 'active' ? 'IssuerActivated' : 'IssuerDeactivated', txHash, block, timestamp, decoded: { issuerId: id, registryStatus: status } }, ...state.chainEvents],
        }
      }),
      updateLenderStatus: (id, status) => set((state) => {
        const timestamp = new Date().toISOString()
        const txHash = `0x${Math.random().toString(16).slice(2, 12)}…${Date.now().toString(16).slice(-4)}`
        const block = state.admin.chainStatus.blockHeight + 1
        const lender = state.lenders.find((item) => item.id === id)
        if (!lender) return {}
        return {
          lenders: state.lenders.map((item) => item.id === id ? { ...item, status } : item),
          admin: { ...state.admin, governanceLog: [{ id: `gov-${Date.now()}`, action: `Lender ${status === 'active' ? 'activated' : 'deactivated'}: ${lender.name}`, actor: 'Trust Admin', timestamp }, ...state.admin.governanceLog], chainStatus: { ...state.admin.chainStatus, blockHeight: block, dailyTransactionsUsed: state.admin.chainStatus.dailyTransactionsUsed + 1 } },
          chainEvents: [{ id: `chain-registry-${Date.now()}`, type: status === 'active' ? 'LenderActivated' : 'LenderDeactivated', txHash, block, timestamp, decoded: { lenderId: id, status } }, ...state.chainEvents],
        }
      }),
      approveRegistration: (id, kind) => set((state) => {
        const timestamp = new Date().toISOString()
        const txHash = `0x${Math.random().toString(16).slice(2, 12)}…${Date.now().toString(16).slice(-4)}`
        const block = state.admin.chainStatus.blockHeight + 1
        const name = kind === 'issuer' ? state.issuers.find((item) => item.id === id)?.name : state.lenders.find((item) => item.id === id)?.name
        return {
          issuers: kind === 'issuer' ? state.issuers.map((item) => item.id === id ? { ...item, registryStatus: 'active' } : item) : state.issuers,
          lenders: kind === 'lender' ? state.lenders.map((item) => item.id === id ? { ...item, status: 'active' } : item) : state.lenders,
          admin: { ...state.admin, queue: { issuers: kind === 'issuer' ? state.admin.queue.issuers.filter((item) => item !== id) : state.admin.queue.issuers, lenders: kind === 'lender' ? state.admin.queue.lenders.filter((item) => item !== id) : state.admin.queue.lenders }, governanceLog: [{ id: `gov-${Date.now()}`, action: `${kind === 'issuer' ? 'Issuer' : 'Lender'} approved: ${name ?? id}`, actor: 'Trust Admin', timestamp }, ...state.admin.governanceLog], chainStatus: { ...state.admin.chainStatus, blockHeight: block, dailyTransactionsUsed: state.admin.chainStatus.dailyTransactionsUsed + 1 } },
          chainEvents: [{ id: `chain-approve-${Date.now()}`, type: kind === 'issuer' ? 'IssuerRegistered' : 'LenderRegistered', txHash, block, timestamp, decoded: kind === 'issuer' ? { issuerId: id, status: 'active' } : { lenderId: id, status: 'active' } }, ...state.chainEvents],
        }
      }),
      rejectRegistration: (id, kind, reason) => set((state) => {
        const timestamp = new Date().toISOString()
        const txHash = `0x${Math.random().toString(16).slice(2, 12)}…${Date.now().toString(16).slice(-4)}`
        const block = state.admin.chainStatus.blockHeight + 1
        return {
          issuers: kind === 'issuer' ? state.issuers.map((item) => item.id === id ? { ...item, registryStatus: 'suspended' } : item) : state.issuers,
          lenders: kind === 'lender' ? state.lenders.map((item) => item.id === id ? { ...item, status: 'suspended' } : item) : state.lenders,
          admin: { ...state.admin, queue: { issuers: kind === 'issuer' ? state.admin.queue.issuers.filter((item) => item !== id) : state.admin.queue.issuers, lenders: kind === 'lender' ? state.admin.queue.lenders.filter((item) => item !== id) : state.admin.queue.lenders }, governanceLog: [{ id: `gov-${Date.now()}`, action: `${kind === 'issuer' ? 'Issuer' : 'Lender'} rejected: ${reason}`, actor: 'Trust Admin', timestamp }, ...state.admin.governanceLog], chainStatus: { ...state.admin.chainStatus, blockHeight: block, dailyTransactionsUsed: state.admin.chainStatus.dailyTransactionsUsed + 1 } },
          chainEvents: [{ id: `chain-reject-${Date.now()}`, type: 'RegistrationRejected', txHash, block, timestamp, decoded: { entityId: id, kind, reason } }, ...state.chainEvents],
        }
      }),
      saveLenderPolicy: (lenderId, values) => set((state) => {
        const current = state.policies.find((policy) => policy.lenderId === lenderId)
        if (!current) return {}
        const policy = { ...current, ...values, revisionLabel: 'v1.0.1', version: current.version + 1, effectiveAt: new Date().toISOString() }
        return { policies: state.policies.map((item) => item.lenderId === lenderId ? policy : item), lenders: state.lenders.map((item) => item.id === lenderId ? { ...item, policy: { ...item.policy, ...(values.foirLimit !== undefined ? { foirLimit: values.foirLimit } : {}), ...(values.feePercent !== undefined ? { feePercent: values.feePercent } : {}), ...(values.minIncome !== undefined ? { minIncome: values.minIncome } : {}) } } : item) }
      }),
      updateLenderSettings: (lenderId, values) => set((state) => ({ lenders: state.lenders.map((item) => item.id === lenderId ? { ...item, ...values } : item) })),
      setOfferOutcome: (offerId, outcome) => set((state) => ({ offers: state.offers.map((offer) => offer.id === offerId ? { ...offer, outcome } : offer) })),
      acceptOffer: (runId, offerId) => set((state) => ({
        offers: state.offers.map((offer) => offer.id === offerId ? { ...offer, accepted: true } as Offer : offer),
        runs: state.runs.map((run) => run.id === runId ? { ...run, status: 'accepted' } : run),
      })),
      resetDemo: () => set({ hasHydrated: true, ...initialData() }),
    }),
    {
      name: 'sanad-demo-v1',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ ...state, hasHydrated: false }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
)

export type { DemoState, ActivityItem, AuditEntry, StatusList }
