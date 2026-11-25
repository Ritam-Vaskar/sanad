import { runEventSchema } from './types'
import type { RunEvent, RunEventsSource } from './types'

const CORE_URL = process.env.NEXT_PUBLIC_CORE_URL ?? ''

/**
 * SseRunEvents
 * Connects to NEXT_PUBLIC_CORE_URL/runs/:id/events via EventSource (SSE).
 *
 * Supported server-sent event types:
 *   • Any event matching runEventSchema → forwarded to the onEvent callback.
 *   • presentation_request             → calls wallet.present() then POSTs result
 *     to NEXT_PUBLIC_CORE_URL/runs/:id/presentation (see handlePresentationRequest).
 *
 * All events are validated with Zod; malformed events are logged and skipped.
 *
 * NEEDS BACKEND: Requires a running core service at NEXT_PUBLIC_CORE_URL.
 */
export class SseRunEvents implements RunEventsSource {
  subscribe(runId: string, onEvent: (event: RunEvent) => void, onComplete?: () => void): () => void {
    const url = `${CORE_URL}/runs/${runId}/events`
    const source = new EventSource(url)

    source.onmessage = (ev: MessageEvent<string>) => {
      try {
        const raw: unknown = JSON.parse(ev.data)
        const result = runEventSchema.safeParse(raw)
        if (!result.success) {
          console.warn('[SseRunEvents] Skipping malformed event:', result.error.issues)
          return
        }
        const event = result.data as RunEvent

        if ((raw as Record<string, unknown>)['event'] === 'presentation_request') {
          void handlePresentationRequest(runId, raw as PresentationRequest)
          return
        }

        // A server-sent event with type 'complete' signals end of run
        if (event.type === 'complete') {
          onComplete?.()
          source.close()
          return
        }

        onEvent(event)
      } catch (err) {
        console.warn('[SseRunEvents] Could not parse SSE message:', err)
      }
    }

    source.onerror = (err) => {
      console.error('[SseRunEvents] SSE connection error for run', runId, err)
    }

    return () => source.close()
  }
}

type PresentationRequest = {
  credentialId: string
  requestedClaims: string[]
  nonce: string
  aud: string
}

/**
 * When the core service sends a presentation_request event, this function
 * asks the wallet to build a selective-disclosure presentation and POSTs it
 * back so the run can proceed.
 *
 * The wallet reference is obtained lazily via dynamic import to avoid a
 * circular dependency between lib/runs and lib/wallet.
 */
async function handlePresentationRequest(runId: string, req: PresentationRequest): Promise<void> {
  try {
    const { MockWalletProvider } = await import('@/lib/wallet/mock')
    const wallet = new MockWalletProvider()
    const presentation = await wallet.present(req.credentialId, req.requestedClaims, {
      nonce: req.nonce,
      aud: req.aud,
    })
    await fetch(`${CORE_URL}/runs/${runId}/presentation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presentation }),
    })
  } catch (err) {
    console.error('[SseRunEvents] Failed to handle presentation_request:', err)
  }
}
