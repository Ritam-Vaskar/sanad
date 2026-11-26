/**
 * useRunEvents() — returns the active RunEventsSource implementation.
 *
 * Selection (same env flags as lib/api/index.ts):
 *   NEXT_PUBLIC_API_MODE=live  AND  NEXT_PUBLIC_LIVE_GROUPS contains 'runs'
 *   → SseRunEvents
 *   otherwise → MockRunEvents
 */

import { useMemo } from 'react'
import type { RunEventsSource } from './types'
import { mockRunEvents } from './mock'
import { SseRunEvents } from './sse'

function isLiveRuns(): boolean {
  if (process.env.NEXT_PUBLIC_API_MODE !== 'live') return false
  const groups = (process.env.NEXT_PUBLIC_LIVE_GROUPS ?? '')
    .split(',')
    .map((s) => s.trim())
  return groups.includes('runs')
}

const liveRunEvents = new SseRunEvents()

export function useRunEvents(): RunEventsSource {
  return useMemo<RunEventsSource>(() => (isLiveRuns() ? liveRunEvents : mockRunEvents), [])
}
