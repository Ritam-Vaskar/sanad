'use client'

import { useMemo } from 'react'
import { MockRunEvents } from './mock'
import { SseRunEvents } from './sse'
import type { RunEventsSource } from './types'

function isLiveRuns(): boolean {
  const mode = process.env.NEXT_PUBLIC_API_MODE
  const groups = process.env.NEXT_PUBLIC_LIVE_GROUPS ?? ''
  return mode === 'live' || groups.split(',').map((g) => g.trim()).includes('runs')
}

/**
 * useRunEvents() — returns the active RunEventsSource implementation.
 * Default: MockRunEvents (wraps the simulateRun simulator, unchanged behaviour).
 * Live:    SseRunEvents when NEXT_PUBLIC_LIVE_GROUPS includes 'runs'.
 */
export function useRunEvents(): RunEventsSource {
  return useMemo<RunEventsSource>(
    () => (isLiveRuns() ? new SseRunEvents() : new MockRunEvents()),
    [],
  )
}
