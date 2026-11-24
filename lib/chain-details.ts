import type { ChainEvent } from '@/types'

export function openChainDetail(event: ChainEvent) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ChainEvent>('sanad:chain-detail', { detail: event }))
}
