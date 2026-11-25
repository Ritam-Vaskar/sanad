'use client'

import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownToLine, Ban, FlaskConical, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { getAttackScenarios } from '@/lib/api'
import { evaluateAttackScenario } from '@/lib/verification'
import { downloadJsonFile } from '@/lib/download'
import { useDemoStore } from '@/lib/store/demo-store'
import type { AttackScenario } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, PipelineViz, StatCard, StatusBadge } from '@/components/shared/primitives'
import { DataTable } from '@/components/shared/overlays'
import { PortalHeading, PortalQueryState, SectionHeading } from './portal-shared'

const stages = ['Request received', 'Signature', 'Issuer trust', 'Expiry', 'Revocation status', 'Key binding', 'Nonce', 'Mandate and policy rules', 'Run execution', 'Offer acceptance', 'Result']

type ScenarioResult = { id: string; scenarioId: string; title: string; stage: string; rule: string; timestamp: string; result: 'Blocked' }
type PipelineProgress = { scenarioId: string; activeIndex: number; failedIndex: number; complete: boolean }

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}

function displayTime(timestamp: string) {
  return new Date(timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function AttackLabPortal() {
  const query = useQuery({ queryKey: ['attack-scenarios'], queryFn: getAttackScenarios })
  const speed = useDemoStore((state) => state.speed)
  const [results, setResults] = useState<ScenarioResult[]>([])
  const [progress, setProgress] = useState<PipelineProgress | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const runningRef = useRef(false)
  const scenarios = query.data ?? []
  const executedIds = new Set(results.map((result) => result.scenarioId))

  async function playScenario(scenario: AttackScenario) {
    const evaluation = evaluateAttackScenario(scenario)
    const { failedIndex } = evaluation
    setProgress({ scenarioId: scenario.id, activeIndex: -1, failedIndex, complete: false })
    for (let index = 0; index <= failedIndex; index += 1) {
      await wait(Math.max(35, 125 / speed))
      setProgress({ scenarioId: scenario.id, activeIndex: index, failedIndex, complete: false })
    }
    await wait(Math.max(35, 125 / speed))
    const resultTime = new Date()
    const result: ScenarioResult = {
      id: `${scenario.id}-${resultTime.getTime()}`,
      scenarioId: scenario.id,
      title: scenario.title,
      stage: stages[failedIndex],
      rule: evaluation.rule,
      timestamp: resultTime.toISOString(),
      result: 'Blocked',
    }
    setProgress({ scenarioId: scenario.id, activeIndex: failedIndex, failedIndex, complete: true })
    setResults((current) => [result, ...current])
  }

  async function runOne(scenario: AttackScenario) {
    if (runningRef.current) return
    runningRef.current = true
    setIsRunning(true)
    try {
      await playScenario(scenario)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The scenario could not be evaluated.')
    } finally {
      runningRef.current = false
      setIsRunning(false)
    }
  }

  async function runAll() {
    if (runningRef.current) return
    runningRef.current = true
    setIsRunning(true)
    try {
      for (const scenario of scenarios) await playScenario(scenario)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The scenarios could not be evaluated.')
    } finally {
      runningRef.current = false
      setIsRunning(false)
    }
  }

  const resultRows = results.map((result) => ({ ...result, timestamp: displayTime(result.timestamp) }))
  const resultColumns = [
    { key: 'title' as const, label: 'Scenario' },
    { key: 'stage' as const, label: 'Blocked at' },
    { key: 'rule' as const, label: 'Rule' },
    { key: 'timestamp' as const, label: 'Run time' },
    { key: 'result' as const, label: 'Result', render: (row: (typeof resultRows)[number]) => <StatusBadge status="failed" label={row.result} /> },
  ]

  return <PortalQueryState loading={query.isLoading} error={query.isError} retry={() => { void query.refetch() }}>
    <div className="grid gap-6">
      <PortalHeading eyebrow="Safety verification sandbox" title="Attack Lab: watch Sanad say no" description="Replay common credit and identity attacks against the permission pipeline. Each challenge should stop at the first rule that rejects it." action={<StatusBadge status="onchain" label="Deterministic demo simulations" />} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Scenarios blocked" value={`${executedIds.size} / ${scenarios.length}`} icon={<ShieldCheck />} accent="violet" />
        <StatCard label="Runs recorded" value={results.length} icon={<FlaskConical />} accent="violet" />
        <StatCard label="Last result" value={results[0]?.result ?? 'Ready'} icon={<Ban />} accent="violet" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.8fr)]">
        <Card className="border-chain/15 bg-card/80">
          <CardHeader><SectionHeading title="Adversarial scenarios" description={`${scenarios.length} synthetic attempts exercise the proof, registry, consent and signing checks.`} action={<Button onClick={() => void runAll()} disabled={isRunning || scenarios.length === 0} className="bg-chain text-background hover:bg-chain/90"><FlaskConical data-icon="inline-start" />{isRunning ? 'Running scenarios…' : 'Run all'}</Button>} /></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {scenarios.map((scenario) => {
              const hasBlocked = results.some((result) => result.scenarioId === scenario.id)
              const isActive = progress?.scenarioId === scenario.id && !progress.complete
              return <Card key={scenario.id} className="border-border/80 bg-background/45">
                <CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><CardTitle className="text-sm leading-5">{scenario.title}</CardTitle>{hasBlocked && <StatusBadge status="failed" label="Blocked" />}</div><CardDescription className="text-xs leading-5">{scenario.description}</CardDescription></CardHeader>
                <CardContent className="grid gap-3"><div className="rounded-lg border border-chain/15 bg-chain/[0.04] p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-chain">Why it matters</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{scenario.whyItMatters}</p></div><div className="flex items-center justify-between gap-3"><code className="truncate font-mono text-[10px] text-muted-foreground">{scenario.rule}</code><Button size="sm" variant="outline" disabled={isRunning} aria-label={`Run ${scenario.title}`} onClick={() => void runOne(scenario)}>{isActive ? 'Checking…' : 'Run'}</Button></div></CardContent>
              </Card>
            })}
          </CardContent>
        </Card>
        <Card className="border-chain/15 bg-chain/[0.025]">
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-chain"><ShieldCheck className="size-4" />Verification pipeline</CardTitle><CardDescription>Stages pass in order until the configured guardrail rejects the request.</CardDescription></CardHeader>
          <CardContent className="grid gap-4">
            {progress ? <>
              <div><p className="text-xs font-semibold">{scenarios.find((scenario) => scenario.id === progress.scenarioId)?.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{progress.complete ? 'Simulation complete' : 'Evaluating request…'}</p></div>
              <PipelineViz stages={stages} activeIndex={progress.activeIndex} failedIndex={progress.failedIndex} failureRule={scenarios.find((scenario) => scenario.id === progress.scenarioId)?.rule} failureReason={scenarios.find((scenario) => scenario.id === progress.scenarioId) ? evaluateAttackScenario(scenarios.find((scenario) => scenario.id === progress.scenarioId)!).failureReason : undefined} />
              {progress.complete && <div role="status" className="flex items-center justify-between rounded-xl border border-danger/25 bg-danger/[0.06] px-3 py-2"><span className="text-xs font-semibold text-danger">Final result</span><StatusBadge status="failed" label="Blocked" /></div>}
            </> : <EmptyState title="Pipeline is ready" description="Run any scenario to watch its checks pass in order and stop at the first violated rule." />}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3"><SectionHeading title="Scenario results" description="Each completed run records the first failing stage, guardrail rule and timestamp." /><Button variant="outline" size="sm" disabled={!results.length} onClick={() => downloadJsonFile('sanad-attack-lab-results.json', results)}><ArrowDownToLine data-icon="inline-start" />Export results</Button></CardHeader>
        <CardContent>{resultRows.length ? <DataTable rows={resultRows} columns={resultColumns} pageSize={10} /> : <EmptyState title="No scenarios run yet" description="Run a scenario or use Run all. Every case should finish as Blocked at its mapped policy stage." />}</CardContent>
      </Card>
    </div>
  </PortalQueryState>
}
