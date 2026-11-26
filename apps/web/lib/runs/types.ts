/**
 * RunEventsSource interface — C6 seam.
 *
 * Provides a push-based subscription to agent run events, validated with Zod.
 * subscribe() returns an unsubscribe function.
 */

import { z } from 'zod'

// ── Zod schema for a single run event ────────────────────────────────────────

export const runEventSchema = z.object({
  /** Seconds from run start when this event fires. */
  offsetSeconds: z.number(),
  /** Event category. */
  type: z.enum([
    'intent', 'validate', 'mandate', 'discover', 'check',
    'request', 'claims', 'proof', 'verify', 'offer',
    'compare', 'decision', 'blocked', 'rejected', 'complete',
    'presentation_request',
  ]),
  /** Short human-readable title. */
  title: z.string(),
  /** Longer detail text. */
  detail: z.string().optional(),
  /** Lender this step concerns. */
  lenderId: z.string().optional(),
  /** PEP rule that was evaluated. */
  pepRule: z.string().optional(),
  /** PEP decision. */
  decision: z.enum(['allow', 'deny']).optional(),
  /** Disclosed claim labels (for 'proof' events). */
  claims: z.array(z.string()).optional(),
  /**
   * Presentation request payload (for 'presentation_request' events in SSE
   * mode — the SseRunEvents handler calls wallet.present and POSTs the result).
   */
  presentationRequest: z
    .object({
      credentialId: z.string(),
      requestedClaims: z.array(z.string()),
      nonce: z.string(),
      aud: z.string(),
    })
    .optional(),
})

export type RunEvent = z.infer<typeof runEventSchema>

// ── Interface ─────────────────────────────────────────────────────────────────

export interface RunEventsSource {
  /**
   * Subscribe to events for a run.
   *
   * @param runId     The agent run to subscribe to.
   * @param onEvent   Called with each validated RunEvent as it arrives.
   * @param onComplete Called once the run finishes (all events delivered).
   * @returns An unsubscribe function; call it to cancel.
   */
  subscribe(
    runId: string,
    onEvent: (event: RunEvent) => void,
    onComplete?: () => void,
  ): () => void
}
