import { z } from 'zod'
import type { RunStep } from '@/types'

/**
 * Zod schema for a single run event coming from the wire (SSE) or the simulator.
 * All fields are made optional so the simulator's RunStep objects also validate.
 */
export const runEventSchema = z.object({
  offsetSeconds: z.number().default(0),
  type: z.string(),
  lenderId: z.string().optional(),
  title: z.string(),
  detail: z.string().default(''),
  pepRule: z.string().optional(),
  decision: z.string().optional(),
  claims: z.array(z.string()).optional(),
})

export type RunEvent = RunStep

/**
 * RunEventsSource — seam interface for run event delivery.
 * MockRunEvents   wraps the existing simulateRun simulator.
 * SseRunEvents    connects to NEXT_PUBLIC_CORE_URL/runs/:id/events.
 */
export interface RunEventsSource {
  /**
   * Subscribe to events for a run.
   * @param onComplete Called when the run finishes (all steps delivered or terminal event received).
   * @returns An unsubscribe / cancel function.
   */
  subscribe(runId: string, onEvent: (event: RunEvent) => void, onComplete?: () => void): () => void
}
