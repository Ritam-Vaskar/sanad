import type { RunStep } from '@/types'
import { useDemoStore } from '@/lib/store/demo-store'

export function simulateRun(runId: string, onStep: (step: RunStep, index: number) => void, onComplete?: () => void) {
  const run = useDemoStore.getState().runs.find((item) => item.id === runId)
  if (!run) throw new Error(`Run ${runId} was not found.`)
  const speed = useDemoStore.getState().speed
  const timers: ReturnType<typeof setTimeout>[] = []
  let cancelled = false
  run.steps.forEach((step, index) => {
    const timer = setTimeout(() => {
      if (cancelled) return
      const current = useDemoStore.getState()
      const mandate = current.mandates.find((item) => item.id === run.mandateId)
      if (run.status !== 'rejected' && (!mandate || mandate.status !== 'active')) {
        cancelled = true
        timers.forEach(clearTimeout)
        onStep({ offsetSeconds: step.offsetSeconds, type: 'blocked', title: 'Blocked: mandate revoked', detail: 'The agent stopped before sharing another proof.', decision: 'deny', pepRule: 'mandate_revoked' }, index)
        return
      }
      if (run.rejection && step.type === 'claims') {
        cancelled = true
        timers.forEach(clearTimeout)
        const pepRule = run.rejection.reason.includes('registry') ? 'issuer_not_in_registry' : run.rejection.reason.includes('status list') ? 'credential_revoked' : run.rejection.reason.includes('expired') ? 'credential_expired' : 'credential_verification_failed'
        onStep({ offsetSeconds: step.offsetSeconds, type: 'rejected', title: 'Credential verification failed', detail: run.rejection.reason, decision: 'deny', pepRule }, index)
        onComplete?.()
        return
      }
      onStep(step, index)
      if (index === run.steps.length - 1) onComplete?.()
    }, step.offsetSeconds * 1000 / speed)
    timers.push(timer)
  })
  return () => { cancelled = true; timers.forEach(clearTimeout) }
}
