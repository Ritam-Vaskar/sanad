import { simulateRun } from '@/lib/sim/runSimulator'
import type { RunEvent, RunEventsSource } from './types'

/**
 * MockRunEvents
 * Wraps the existing simulateRun simulator unchanged.
 * subscribe(runId, onEvent) mirrors the pre-C6 useEffect call in RunScreen.
 */
export class MockRunEvents implements RunEventsSource {
  subscribe(runId: string, onEvent: (event: RunEvent) => void, onComplete?: () => void): () => void {
    const cancel = simulateRun(runId, (step) => {
      onEvent(step)
    }, onComplete)
    return cancel
  }
}
