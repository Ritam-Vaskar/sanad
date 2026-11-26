/**
 * SseRunEvents — live implementation of RunEventsSource.
 *
 * Opens an EventSource to NEXT_PUBLIC_CORE_URL/runs/:id/events.
 * Each SSE message is JSON-parsed and validated with runEventSchema.
 *
 * presentation_request events trigger wallet.present() and POST the result
 * back to NEXT_PUBLIC_CORE_URL/runs/:id/presentation.
 *
 * STUB: requires NEXT_PUBLIC_CORE_URL and a live backend.
 */

import type { RunEventsSource, RunEvent } from './types'
import { runEventSchema } from './types'

const CORE_URL = process.env.NEXT_PUBLIC_CORE_URL ?? ''

/** Lazily-imported wallet so we avoid a circular import at module level. */
async function getWallet() {
  const { mockWallet } = await import('@/lib/wallet/mock')
  return mockWallet
}

export class SseRunEvents implements RunEventsSource {
  subscribe(
    runId: string,
    onEvent: (event: RunEvent) => void,
    onComplete?: () => void,
  ): () => void {
    if (!CORE_URL) {
      throw new Error(
        'SseRunEvents requires NEXT_PUBLIC_CORE_URL. Set it or use MockRunEvents.',
      )
    }

    const url = `${CORE_URL}/runs/${encodeURIComponent(runId)}/events`
    const es = new EventSource(url)

    es.onmessage = (msg) => {
      let raw: unknown
      try {
        raw = JSON.parse(msg.data as string)
      } catch {
        console.warn('[SseRunEvents] non-JSON message', msg.data)
        return
      }

      const result = runEventSchema.safeParse(raw)
      if (!result.success) {
        console.warn('[SseRunEvents] schema mismatch', result.error.flatten())
        return
      }

      const event = result.data

      if (event.type === 'presentation_request' && event.presentationRequest) {
        const { credentialId, requestedClaims, nonce, aud } = event.presentationRequest
        void (async () => {
          try {
            const wallet = await getWallet()
            const presentation = await wallet.present(credentialId, requestedClaims, { nonce, aud })
            await fetch(`${CORE_URL}/runs/${encodeURIComponent(runId)}/presentation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ presentation, nonce }),
            })
          } catch (err) {
            console.error('[SseRunEvents] presentation flow failed', err)
          }
        })()
        return
      }

      onEvent(event)

      if (event.type === 'complete') {
        es.close()
        onComplete?.()
      }
    }

    es.onerror = (err) => {
      console.error('[SseRunEvents] EventSource error', err)
      es.close()
    }

    return () => es.close()
  }
}
