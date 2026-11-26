import type { ChainEvent } from '@/types'
import { useDemoStore } from '@/lib/store/demo-store'

export function startChainFeed() {
  const timer = setInterval(() => {
    const store = useDemoStore.getState()
    if (!store.liveFeed) return
    const previous = store.chainEvents[0]
    const event: ChainEvent = {
      id: `chain-live-${Date.now()}`,
      type: 'StatusRootUpdated',
      txHash: `0x${Math.random().toString(16).slice(2, 18)}…test`,
      block: (previous?.block ?? 19845024) + 1,
      timestamp: new Date().toISOString(),
      decoded: { issuerId: 'issuer-gig', root: `0x${crypto.randomUUID().slice(0, 12)}…` },
    }
    store.addChainEvent(event)
  }, 8000)
  return () => clearInterval(timer)
}
