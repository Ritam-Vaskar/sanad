'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, Circle, Download, Pause, Play, StopCircle, Table2, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import type { Borrower, Lender, Offer, RunStep } from '@/types'
import { acceptOffer as acceptOfferApi, addMockReceipt, revokeMandate as revokeMandateApi, startRun } from '@/lib/api'
import { downloadJsonFile } from '@/lib/download'
import { buildAmortizationSchedule } from '@/lib/emi'
import { formatDate, formatINR } from '@/lib/format'
import { useDemoStore } from '@/lib/store/demo-store'
import { useRunEvents } from '@/lib/runs'
import { useWallet } from '@/lib/wallet'
import { ConfirmDialog } from '@/components/shared/overlays'
import { StatusBadge } from '@/components/shared/primitives'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PermissionSlip } from './assistant'
import { BorrowerEmpty, BorrowerTxChip, SectionHeading, ValueChip } from './borrower-ui'
import { t, type BorrowerLanguage } from './copy'

const emptyRunEvents: RunStep[] = []

type MandateDetailProps = { mandateId: string; borrower: Borrower; lenders: Lender[]; language: BorrowerLanguage }

export function MandateDetail({ mandateId, borrower, lenders, language }: MandateDetailProps) {
  const mandate = useDemoStore((state) => state.mandates.find((item) => item.id === mandateId))
  const activity = useDemoStore((state) => state.activity)
  const [now, setNow] = useState(0)
  useEffect(() => {
    const update = () => setNow(Date.now())
    update()
    const timer = window.setInterval(update, 60000)
    return () => window.clearInterval(timer)
  }, [])
  if (!mandate) return <BorrowerEmpty title="Permission not found" description="This permission may have been removed from the demo." action={<Button nativeButton={false} role="link" render={<Link href="/borrower/activity" />} size="sm" variant="outline">View activity</Button>} />
  const expiry = Math.max(0, Math.ceil((new Date(mandate.expiresAt).getTime() - now) / 3600000))
  const relatedActivity = activity.filter((item) => item.mandateId === mandate.id)
  const draft = { amount: mandate.maxAmount, emi: mandate.maxEmi, incomeBand: Boolean(mandate.disclosures.incomeBand), cashflow: Boolean(mandate.disclosures.cashflowStability), blocked: [], capped: false }
  return <div className="grid gap-4"><SectionHeading eyebrow="Your permissions" title="Permission details" description="A plain-language record of what your agent may do." action={<Button nativeButton={false} role="link" render={<Link href="/borrower/activity" aria-label="Back to activity" />} size="icon-sm" variant="ghost"><ArrowLeft /></Button>} /><Card><CardHeader className="flex-row items-start justify-between gap-2"><div><CardTitle className="text-sm">Loan search permission</CardTitle><p className="mt-1 text-[10px] text-muted-foreground">For {borrower.name}</p></div><StatusBadge status={mandate.status} label={mandate.status === 'active' ? 'Active' : mandate.status} /></CardHeader><CardContent className="grid gap-3"><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-border bg-background/60 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Loan up to</p><p className="mt-1 text-sm font-semibold">{formatINR(mandate.maxAmount)}</p></div><div className="rounded-xl border border-border bg-background/60 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">EMI up to</p><p className="mt-1 text-sm font-semibold">{formatINR(mandate.maxEmi)}</p></div></div><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Expires</span><span>{formatDate(mandate.expiresAt, 'd MMM yyyy, HH:mm')}</span></div><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Time left</span><span className={expiry === 0 ? 'text-warning' : 'text-foreground'}>{expiry === 0 ? 'Expired' : `${expiry} hours`}</span></div><div><p className="mb-2 text-[10px] font-semibold">Approved lenders</p><div className="flex flex-wrap gap-1.5">{mandate.allowedLenders.map((id) => <ValueChip key={id} tone="violet">{lenders.find((item) => item.id === id)?.name ?? id}</ValueChip>)}</div></div></CardContent></Card><PermissionSlip draft={draft} lenders={lenders.filter((item) => mandate.allowedLenders.includes(item.id))} language={language} /><Card><CardHeader><CardTitle className="text-sm">Activity under this permission</CardTitle></CardHeader><CardContent className="grid gap-2">{relatedActivity.length === 0 ? <BorrowerEmpty title="No activity yet" description="Your agent has not used this permission." /> : relatedActivity.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background/60 p-3"><div><p className="text-xs font-medium">{entry.description ?? entry.type?.replaceAll('_', ' ') ?? 'Permission activity'}</p><p className="mt-1 text-[10px] text-muted-foreground">{formatDate(entry.timestamp, 'd MMM, HH:mm')}</p></div>{entry.txHash && <BorrowerTxChip value={entry.txHash} block={entry.block} />}</div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Recorded permission</CardTitle><p className="text-[10px] text-muted-foreground">The public record contains no personal proof data.</p></CardHeader><CardContent><BorrowerTxChip value={mandate.txHash} /></CardContent></Card>{mandate.status === 'active' && <ConfirmDialog title="Revoke this permission?" description="Stops your agent from doing anything new. Lenders keep what they already received." confirmLabel="Revoke permission" trigger={<Button variant="destructive" className="w-full">{t(language, 'Revoke permission')}</Button>} onConfirm={() => { void revokeMandateApi(mandate.id).then(() => toast.success('Permission revoked.')) }} />}</div>
}

export function RunScreen({ runId, lenders, language }: { runId: string; lenders: Lender[]; language: BorrowerLanguage }) {
  const router = useRouter()
  const runEvents_source = useRunEvents()
  const run = useDemoStore((state) => state.runs.find((item) => item.id === runId))
  const allRunEvents = useDemoStore((state) => state.runEvents)
  const runEvents = allRunEvents[runId] ?? emptyRunEvents
  const runStatus = useDemoStore((state) => state.runs.find((item) => item.id === runId)?.status ?? 'missing')
  const mandate = useDemoStore((state) => state.mandates.find((item) => item.id === run?.mandateId))
  const cancelSimulation = useRef<(() => void) | null>(null)
  const [busy, setBusy] = useState(false)
  const activeLenders = lenders.filter((item) => item.status === 'active' && mandate?.allowedLenders.includes(item.id))
  const appendRunEvent = useDemoStore((state) => state.appendRunEvent)
  const setRunStatus = useDemoStore((state) => state.setRunStatus)

  useEffect(() => {
    const initial = useDemoStore.getState()
    const currentRun = initial.runs.find((item) => item.id === runId)
    const existingEvents = initial.runEvents[runId] ?? []
    if (!currentRun) return
    if (runStatus === 'ready_for_decision' && existingEvents.length === 0) {
      initial.setRunStatus(runId, 'running')
      return
    }
    if (!['running', 'rejected', 'ready_for_decision'].includes(runStatus) || (runStatus === 'ready_for_decision' && existingEvents.length > 0)) return
    if (existingEvents.length > 0 && runStatus !== 'running' && runStatus !== 'rejected') return
    const cancel = runEvents_source.subscribe(runId, (step) => {
      const current = useDemoStore.getState()
      const alreadySeen = (current.runEvents[runId] ?? []).some((event) => event.title === step.title && event.type === step.type && event.lenderId === step.lenderId)
      if (!alreadySeen) current.appendRunEvent(runId, step as RunStep)
      const activeMandate = current.mandates.find((item) => item.id === currentRun.mandateId)
      if (!alreadySeen && step.type === 'proof' && step.lenderId && activeMandate) {
        const categories = (step.claims ?? []).map((claim) => claim.toLowerCase().includes('kyc') ? 'kycStatus' : claim.toLowerCase().includes('income') ? 'incomeThreshold' : claim.toLowerCase().includes('cashflow') ? 'cashflowStability' : 'ageOver21')
        void addMockReceipt({ mandateId: activeMandate.id, lenderId: step.lenderId, categories, requestId: `req-${runId}-${step.lenderId}` }).catch((error: unknown) => {
          const currentMandate = useDemoStore.getState().mandates.find((item) => item.id === activeMandate.id)
          if (currentMandate?.status === 'active') toast.error(error instanceof Error ? error.message : 'Could not record the disclosure receipt.')
        })
      }
    }, () => useDemoStore.getState().setRunStatus(runId, currentRun.rejection ? 'rejected' : 'ready_for_decision'))
    cancelSimulation.current = cancel
    return () => { cancel(); cancelSimulation.current = null }
  }, [runId, runStatus, runEvents_source])

  if (!run) return <BorrowerEmpty title="Agent run not found" description="Create a permission with the assistant to begin a loan search." action={<Button nativeButton={false} role="link" render={<Link href="/borrower/assistant" />} size="sm">Open assistant</Button>} />
  const hasFinished = ['ready_for_decision', 'rejected', 'stopped', 'accepted'].includes(runStatus)

  async function stopAgent() {
    if (busy || !run || ['stopped', 'accepted'].includes(runStatus)) return
    setBusy(true)
    cancelSimulation.current?.()
    cancelSimulation.current = null
    const blocked: RunStep = { offsetSeconds: 0, type: 'blocked', title: 'Blocked: permission revoked', detail: 'The agent stopped. Starting again needs a new permission.', decision: 'deny', pepRule: 'mandate_revoked' }
    const latestEvents = useDemoStore.getState().runEvents[runId] ?? []
    if (!latestEvents.some((event) => event.title === blocked.title)) appendRunEvent(runId, blocked)
    setRunStatus(runId, 'stopped')
    try {
      if (mandate?.status === 'active') await revokeMandateApi(mandate.id)
      toast.success('The agent has stopped. A new permission is needed to continue.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The agent stopped, but mandate revocation failed.')
    } finally {
      setBusy(false)
    }
  }

  const startAgain = async () => {
    if (!mandate || busy) return
    setBusy(true)
    try {
      const newRun = await startRun(mandate.id)
      router.push(`/borrower/runs/${newRun.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The agent could not start.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="grid gap-4 pb-16"><div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur"><div className="min-w-0"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Live loan search</p><p className="truncate text-xs font-semibold">{formatINR(mandate?.maxAmount ?? 50000)} · EMI {formatINR(mandate?.maxEmi ?? 3000)}</p></div><ConfirmDialog title="Stop this agent?" description="Stopping blocks any new proof sharing. Continuing later needs a new permission." confirmLabel="Stop agent" trigger={<Button size="xs" variant="destructive" disabled={['stopped', 'accepted', 'rejected', 'ready_for_decision'].includes(runStatus)}><StopCircle data-icon="inline-start" />{runStatus === 'stopped' ? 'Agent stopped' : t(language, 'Stop agent')}</Button>} onConfirm={() => { void stopAgent() }} /></div><SectionHeading eyebrow="Agent activity" title="Your loan search" description="Watch each permission check and proof share as it happens." /><Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="text-sm">Live timeline</CardTitle><p className="mt-1 text-[10px] text-muted-foreground">Simulation speed follows the Demo Panel.</p></div><StatusBadge status={runStatus} label={runStatus === 'running' ? 'Live' : runStatus === 'ready_for_decision' ? 'Complete' : runStatus} /></CardHeader><CardContent className="grid gap-0">{runEvents.length === 0 && runStatus !== 'running' ? <div className="grid gap-3 py-2"><BorrowerEmpty title="No events yet" description="Start the agent to see its checks and lender requests." /><Button onClick={startAgain} disabled={!mandate || mandate.status !== 'active' || busy}><Play data-icon="inline-start" />Start agent</Button></div> : <ol className="grid gap-0">{runEvents.map((step, index) => <li key={`${step.title}-${index}`} className="relative flex gap-3 pb-4 last:pb-0"><span className={`relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border ${step.decision === 'deny' ? 'border-danger/30 bg-danger/10 text-danger' : 'border-primary/25 bg-surface text-primary'}`}>{step.decision === 'deny' ? <AlertTriangle /> : step.type === 'offer' ? <WalletCards /> : <CheckCircle2 />}</span>{index < runEvents.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-8 w-px bg-border" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-1"><p className="text-xs font-medium">{run.borrowerId === 'imran-sheikh' && step.type === 'rejected' ? 'Identity proof expired' : run.borrowerId === 'priya-nair' && step.type === 'rejected' ? 'Eligibility check stopped' : step.title}</p>{step.decision && <Badge variant="outline" className={`rounded-full text-[9px] ${step.decision === 'deny' ? 'border-danger/25 bg-danger/10 text-danger' : 'border-success/25 bg-success/10 text-success'}`}>{step.type === 'claims' ? 'Allowed: only permitted proofs' : step.type === 'permission' ? 'Allowed: lender in your list' : step.decision === 'deny' ? 'Blocked' : 'Allowed'}</Badge>}</div><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{run.borrowerId === 'imran-sheikh' && step.type === 'rejected' ? 'Your identity proof expired. Renew it before starting another loan search.' : run.borrowerId === 'priya-nair' && step.type === 'rejected' ? 'A verified income proof is not available yet. The issuer requires verified income of at least ₹25,000.' : step.detail}</p>{step.pepRule && <span className="mt-1 inline-flex rounded-full border border-primary/20 bg-primary/[0.05] px-2 py-0.5 font-mono text-[8px] text-primary">Rule checked</span>}{step.claims && <div className="mt-2 flex flex-wrap gap-1">{step.claims.map((claim) => <ValueChip key={claim} tone="success">{claim}</ValueChip>)}</div>}</div></li>)}</ol>}</CardContent></Card>{run.rejection && <Card className="border-warning/25 bg-warning/[0.04]"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="text-warning" />A lender could not proceed</CardTitle></CardHeader><CardContent className="grid gap-2"><p className="text-xs leading-5">{run.borrowerId === 'priya-nair' ? 'Verified income proof is not available yet.' : run.borrowerId === 'imran-sheikh' ? 'Identity proof expired.' : run.rejection.reason}</p><p className="text-[10px] leading-5 text-muted-foreground">{run.borrowerId === 'priya-nair' ? 'A verified income proof is not available yet. You can request one after the issuer threshold is met.' : run.borrowerId === 'imran-sheikh' ? 'Renew your identity proof before you make another loan request.' : 'No proof was shared because a required verification check failed. Raw statements and employer details remain private.'}</p></CardContent></Card>}<div><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Lender progress</h2><span className="text-[9px] text-muted-foreground">Only verified lenders</span></div><div className="grid gap-3">{activeLenders.map((lender) => <LenderProgress key={lender.id} lender={lender} events={runEvents.filter((item) => item.lenderId === lender.id)} rejectionReason={run.rejection?.reason} />)}</div>{activeLenders.length === 0 && <BorrowerEmpty title="No verified lenders" description="There are no lenders in your permission." />}</div>{hasFinished && <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 p-3 backdrop-blur"><Button nativeButton={false} role="link" render={<Link href={`/borrower/offers/${runId}`} />} className="w-full">{t(language, 'See offers')}<ArrowRight data-icon="inline-end" /></Button></div>}</div>
}

function LenderProgress({ lender, events, rejectionReason }: { lender: Lender; events: RunStep[]; rejectionReason?: string }) {
  const isRejected = Boolean(rejectionReason)
  const statuses = [events.some((item) => item.type === 'request') || isRejected, events.some((item) => item.type === 'proof'), events.some((item) => item.type === 'verified'), events.some((item) => item.type === 'offer')]
  const shared = events.find((item) => item.type === 'proof')?.claims ?? []
  const labels = ['Requested', 'Proof shared', 'Verified', 'Offer received']
  return <Card><CardHeader className="flex-row items-center justify-between gap-2 pb-2"><div className="min-w-0"><CardTitle className="truncate text-xs">{lender.name}</CardTitle><p className="mt-1 text-[9px] text-muted-foreground">{lender.summary}</p></div><ValueChip tone={isRejected ? 'danger' : 'success'}>{isRejected ? <AlertTriangle /> : <BadgeCheck />}{isRejected ? 'Rejected' : 'Verified'}</ValueChip></CardHeader><CardContent className="grid gap-3"><ol className="grid grid-cols-4 gap-1">{labels.map((label, index) => <li key={label} className="grid justify-items-center gap-1 text-center"><span className={`grid size-6 place-items-center rounded-full ${statuses[index] ? 'bg-success/15 text-success' : 'border border-border text-muted-foreground'}`}>{statuses[index] ? <Check /> : <Circle />}</span><span className={`text-[8px] ${statuses[index] ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span></li>)}</ol>{rejectionReason ? <p role="status" className="text-[9px] leading-4 text-danger">{rejectionReason}</p> : shared.length > 0 ? <div><p className="mb-1 text-[9px] text-muted-foreground">Exactly shared</p><div className="flex flex-wrap gap-1">{shared.map((proof) => <ValueChip key={proof} tone="success">{proof}</ValueChip>)}</div></div> : <p className="text-[9px] text-muted-foreground">No proofs have been shared yet.</p>}</CardContent></Card>
}

type OfferSheetState = 'schedule' | 'accept' | null

export function OffersScreen({ runId, lenders, language }: { runId: string; lenders: Lender[]; language: BorrowerLanguage }) {
  const router = useRouter()
  const wallet = useWallet()
  const run = useDemoStore((state) => state.runs.find((item) => item.id === runId))
  const allOffers = useDemoStore((state) => state.offers)
  const activity = useDemoStore((state) => state.activity)
  const walletVault = useDemoStore((state) => state.walletVault)
  const offers = allOffers.filter((offer) => offer.runId === runId).sort((a, b) => a.totalCost - b.totalCost)
  const accepted = offers.find((offer) => offer.outcome === 'accepted') ?? null
  const acceptedTxHash = activity.find((item) => item.type === 'offer_accepted' && item.requestId === `req-${runId}-${accepted?.lenderId}`)?.txHash ?? ''
  const [sheet, setSheet] = useState<OfferSheetState>(null)
  const [selected, setSelected] = useState<Offer | null>(null)
  const [understood, setUnderstood] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [signing, setSigning] = useState(false)
  const [declined, setDeclined] = useState(false)
  const schedule = selected ? buildAmortizationSchedule(selected.principal, selected.rate, selected.tenure) : []

  async function signAcceptance() {
    if (!selected || !run || !walletVault || !understood || passphrase.trim().length < 6 || signing) return
    setSigning(true)
    try {
      await wallet.unlock(passphrase)
      const signature = await wallet.signTypedData('Acceptance', {
        runId,
        id: selected.id,
        lenderId: selected.lenderId,
        principal: selected.principal,
        rate: selected.rate,
        tenure: selected.tenure,
        totalCost: selected.totalCost,
      })
      await acceptOfferApi(runId, selected.id, signature)
      setSheet(null)
      toast.success('Your acceptance has been recorded.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not accept this offer.')
    } finally {
      setSigning(false)
    }
  }

  if (!run) return <BorrowerEmpty title="Offers are not available" description="This loan search could not be found." action={<Button nativeButton={false} role="link" render={<Link href="/borrower/assistant" />} size="sm">Start a new search</Button>} />
  if (accepted) return <div className="grid gap-4"><div className="grid size-14 place-items-center rounded-full bg-success/10 text-success"><CheckCircle2 /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-success">Offer accepted</p><h1 className="mt-1 text-xl font-semibold">Your loan summary is ready</h1><p className="mt-1 text-xs leading-5 text-muted-foreground">Review the final terms before continuing with the lender.</p></div><Card className="border-success/20 bg-success/[0.04]"><CardHeader><CardTitle className="text-sm">{lenders.find((item) => item.id === accepted.lenderId)?.name ?? 'Lender'}</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 text-xs"><Term label="Loan amount" value={formatINR(accepted.principal)} /><Term label="Monthly EMI" value={formatINR(accepted.emi, { decimals: 2 })} /><Term label="Tenure" value={`${accepted.tenure} months`} /><Term label="Total cost" value={formatINR(accepted.totalCost, { decimals: 2 })} /></CardContent></Card><BorrowerTxChip value={acceptedTxHash || accepted.offerHash} /><Button variant="outline" onClick={() => downloadJsonFile('sanad-sanction-summary.json', { lender: lenders.find((item) => item.id === accepted.lenderId)?.name ?? 'Lender', offer: accepted, transaction: acceptedTxHash })}>Download sanction summary<Download data-icon="inline-end" /></Button><Button onClick={() => router.push('/borrower/activity')}>See who received your proofs<ArrowRight data-icon="inline-end" /></Button></div>

  if (declined || run.status === 'rejected' || run.status === 'stopped' || offers.length === 0) return <div className="grid gap-4"><SectionHeading eyebrow="Loan search result" title="No offers this time" description="Your proof details were not changed by this decision." /><Card className="border-warning/25 bg-warning/[0.04]"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="text-warning" />{run.status === 'stopped' ? 'This search is stopped.' : run.borrowerId === 'priya-nair' ? 'Verified income proof is not available yet.' : run.borrowerId === 'imran-sheikh' ? 'Identity proof expired.' : run.rejection?.reason ?? 'No lender could offer terms within this permission.'}</CardTitle></CardHeader><CardContent><p className="text-xs leading-5 text-muted-foreground">{run.status === 'stopped' ? 'No further proofs are sent from this run. Review your permission before starting another search.' : run.borrowerId === 'priya-nair' ? 'Ask your earning platform about a verified income proof after your income reaches the issuer threshold.' : run.borrowerId === 'imran-sheikh' ? 'Renew your expired identity proof, then create a new permission.' : 'Check with the provider about the risk result. Your bank statements were not shared.'}</p></CardContent></Card><Button nativeButton={false} role="link" render={<Link href="/borrower/assistant" />} variant="outline">Ask what you can do<ArrowRight data-icon="inline-end" /></Button></div>

  const bestOffer = offers[0]
  return <div className="grid gap-4 pb-2"><SectionHeading eyebrow="Offer comparison" title={t(language, 'Your best offers')} description="Ranked by total cost: interest plus all lender fees." /><div className="grid gap-3">{offers.map((offer, index) => { const lender = lenders.find((item) => item.id === offer.lenderId); return <Card key={offer.id} className={index === 0 ? 'border-primary/35 bg-gradient-to-br from-primary/[0.07] to-card' : ''}><CardHeader className="flex-row items-start justify-between gap-2"><div><CardTitle className="text-sm">{lender?.name ?? 'Verified lender'}</CardTitle><p className="mt-1 text-[10px] text-muted-foreground">{offer.rate}% annual rate · {offer.tenure} months</p></div>{index === 0 && <Badge className="rounded-full bg-primary/15 text-[9px] text-primary">{t(language, 'Lowest total cost')}</Badge>}</CardHeader><CardContent className="grid grid-cols-2 gap-3"><Term label="Loan amount" value={formatINR(offer.principal)} /><Term label={t(language, 'Monthly EMI')} value={formatINR(offer.emi, { decimals: 2 })} /><Term label="Processing fee + tax" value={formatINR(offer.processingFee + offer.gst, { decimals: 2 })} /><Term label="Total cost" value={formatINR(offer.totalCost, { decimals: 2 })} /><div className="col-span-2 flex items-center gap-1.5 rounded-lg bg-success/[0.06] p-2 text-[10px] text-success"><Check />{t(language, 'Fits your EMI limit')}</div></CardContent><CardFooter className="grid grid-cols-2 gap-2 border-t border-border/70 pt-3"><Button size="sm" variant="outline" onClick={() => { setSelected(offer); setSheet('schedule') }}>Repayment schedule</Button><Button size="sm" onClick={() => { setSelected(offer); setSheet('accept') }}>{t(language, 'Accept this offer')}</Button></CardFooter></Card> })}</div><Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Table2 className="text-primary" />Compare the terms</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Term</TableHead>{offers.map((offer) => <TableHead key={offer.id} className="min-w-28">{lenders.find((item) => item.id === offer.lenderId)?.name ?? 'Lender'}</TableHead>)}</TableRow></TableHeader><TableBody>{[['Amount', (offer: Offer) => formatINR(offer.principal)], ['Interest rate', (offer: Offer) => `${offer.rate}%`], ['Tenure', (offer: Offer) => `${offer.tenure} months`], ['Monthly EMI', (offer: Offer) => formatINR(offer.emi, { decimals: 2 })], ['Fees incl. GST', (offer: Offer) => formatINR(offer.processingFee + offer.gst, { decimals: 2 })], ['Total interest', (offer: Offer) => formatINR(offer.totalInterest, { decimals: 2 })], ['Total repayment', (offer: Offer) => formatINR(offer.totalRepayment, { decimals: 2 })], ['Total cost', (offer: Offer) => formatINR(offer.totalCost, { decimals: 2 })], ['Fits EMI limit', (offer: Offer) => offer.fitsEmiLimit ? 'Yes' : 'No']].map(([label, value]) => <TableRow key={String(label)}><TableHead className="text-[10px] font-medium">{String(label)}</TableHead>{offers.map((offer) => <TableCell key={offer.id} className="text-[10px]">{(value as (offer: Offer) => string)(offer)}</TableCell>)}</TableRow>)}</TableBody></Table></CardContent></Card><Card className="border-chain/20 bg-chain/[0.035]"><CardHeader><CardTitle className="text-sm">{t(language, 'About these numbers')}</CardTitle></CardHeader><CardContent className="grid gap-2"><p className="text-xs leading-5 text-muted-foreground">{run.assistantExplanation}</p><p className="text-[10px] leading-5 text-foreground">Numbers come from the lenders calculation engines, not from AI.</p></CardContent></Card><ConfirmDialog title="Decline all offers?" description="This will close the current offer choices. You can start a new search with a fresh permission later." confirmLabel="Decline all" trigger={<Button variant="ghost" className="w-full text-muted-foreground">{t(language, 'Decline all')}</Button>} onConfirm={() => { setDeclined(true); toast.success('All offers declined.') }} /><Sheet open={sheet !== null} onOpenChange={(open) => { if (!open) setSheet(null) }}><SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-border bg-surface"><SheetHeader><SheetTitle>{sheet === 'schedule' ? 'Repayment schedule' : 'Accept this offer'}</SheetTitle><SheetDescription>{selected ? `${lenders.find((item) => item.id === selected.lenderId)?.name ?? 'Lender'} · ${formatINR(selected.principal)} · ${selected.tenure} months` : 'Review the final terms.'}</SheetDescription></SheetHeader>{sheet === 'schedule' && selected && <div className="mx-auto grid w-full max-w-md gap-3 p-4"><p className="text-[10px] leading-5 text-muted-foreground">This is an estimate based on the lender&apos;s rate and tenure. Final figures come from the lender.</p><div className="overflow-x-auto rounded-xl border border-border"><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Principal</TableHead><TableHead>Interest</TableHead><TableHead>Payment</TableHead><TableHead>Balance</TableHead></TableRow></TableHeader><TableBody>{schedule.map((row) => <TableRow key={row.month}><TableCell>{row.month}</TableCell><TableCell>{formatINR(row.principal, { decimals: 0 })}</TableCell><TableCell>{formatINR(row.interest, { decimals: 0 })}</TableCell><TableCell>{formatINR(row.payment, { decimals: 0 })}</TableCell><TableCell>{formatINR(row.closingBalance, { decimals: 0 })}</TableCell></TableRow>)}</TableBody></Table></div></div>}{sheet === 'accept' && selected && <div className="mx-auto grid w-full max-w-md gap-3 p-4"><Card><CardHeader><CardTitle className="text-sm">Final terms</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 text-xs"><Term label="Amount" value={formatINR(selected.principal)} /><Term label="Rate" value={`${selected.rate}%`} /><Term label="Monthly EMI" value={formatINR(selected.emi, { decimals: 2 })} /><Term label="Tenure" value={`${selected.tenure} months`} /><Term label="Fees incl. GST" value={formatINR(selected.processingFee + selected.gst, { decimals: 2 })} /><Term label="Total repayment" value={formatINR(selected.totalRepayment, { decimals: 2 })} /></CardContent></Card><label className="flex items-start gap-2 rounded-xl border border-border p-3 text-[11px] leading-5"><Checkbox checked={understood} onCheckedChange={(checked) => setUnderstood(checked === true)} aria-label="I understand the final loan terms" /><span>I understand the final loan terms and the repayment obligation.</span></label><label htmlFor="offer-passphrase" className="text-xs font-medium">Passphrase</label><Input id="offer-passphrase" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="current-password" placeholder="At least 6 characters" /><Button onClick={signAcceptance} disabled={!understood || passphrase.trim().length < 6 || signing}>{signing ? <><Pause data-icon="inline-start" />Signing…</> : <>Sign to accept<ArrowRight data-icon="inline-end" /></>}</Button></div>}</SheetContent></Sheet><div className="sr-only">Best offer: {bestOffer ? lenders.find((item) => item.id === bestOffer.lenderId)?.name : 'none'}</div></div>
}

function Term({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[9px] text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-medium">{value}</p></div>
}
