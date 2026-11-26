/**
 * MockRunEvents — wraps simulateRun with the RunEventsSource interface.
 * Behaviour is identical to what RunScreen did before C6.
 */

import type { RunEventsSource, RunEvent } from './types'
import { simulateRun } from '@/lib/sim/runSimulator'

export class MockRunEvents implements RunEventsSource {
  subscribe(
    runId: string,
    onEvent: (event: RunEvent) => void,
    onComplete?: () => void,
  ): () => void {
    return simulateRun(runId, onEvent as Parameters<typeof simulateRun>[1], onComplete)
  }
}

/** Singleton for the app lifetime. */
export const mockRunEvents = new MockRunEvents()
