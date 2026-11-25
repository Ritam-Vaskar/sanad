'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Activity, ArrowRight, BadgeCheck, Bell, Check, CircleDollarSign, FileCheck2, FileText, RefreshCw, ShieldCheck, SlidersHorizontal, Webhook, X } from 'lucide-react'
import type { Lender, LenderRequest, OfferOutcome } from '@/types'
import { getAuditLog, getBorrowers, getCredentials, getIssuers, getLenderRequests, getPolicies } from '@/lib/api'
import { buildVerificationChecklist } from '@/lib/verification'
import { formatDate, formatINR } from '@/lib/format'
import { useDemoStore } from '@/lib/store/demo-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Gauge, HashChip, StatCard, StatusBadge, EmptyState } from '@/components/shared/primitives'
import { DataTable } from '@/components/shared/overlays'
import { PortalHeading, PortalQueryState, SectionHeading } from './portal-shared'
import { FunnelChart, RequestsAreaChart } from './portal-charts'

const legacySections: Record<string, string> = { '/requests': 'requests', '/policy': 'policy', '/issuers': 'issuers', '/offers': 'offers', '/compliance': 'compliance', '/settings': 'settings' }
const subjectAliases: Record<string, string> = { '4821': 'robin-das', '4752': 'priya-nair', '4741': 'robin-das', '4680': 'kavita-rao', '4632': 'suresh-patil', '4519': 'imran-sheikh', '4402': 'suresh-patil', '4322': 'robin-das', '4267': 'imran-sheikh', '4111': 'priya-nair', '3994': 'suresh-patil' }

function lenderRoute(path: string) {
  if (legacySections[path] || path.startsWith('/requests/')) return { lenderId: 'lender-a', section: path.startsWith('/requests/') ? 'request-detail' : legacySections[path], requestId: path.startsWith('/requests/') ? path.slice('/requests/'.length) : undefined }
  const [, , lenderId, routeSection = 'overview', requestId] = path.split('/')
  const section = routeSection === 'requests' && requestId ? 'request-detail' : routeSection
  return { lenderId: lenderId || 'lender-a', section, requestId }
}

function subjectIdFor(request: LenderRequest) {
  if (request.subjectId) return request.subjectId
  const suffix = request.id.match(/(\d{4})$/)?.[1]
  return suffix ? subjectAliases[suffix] : undefined
}

function requestOutcome(request: LenderRequest): OfferOutcome {
  if (request.status === 'accepted') return 'accepted'
  if (request.status === 'expired') return 'expired'
  if (request.status === 'rejected' || request.status === 'revoked') return 'declined'
  if (request.status === 'offered' || request.status === 'verified') return 'viewed'
  return 'sent'
}

function requestResult(request: LenderRequest) {
  if (request.result) return request.result
  const failed = request.checks.find((check) => !check.passed)
  return failed ? failed.reason : request.status === 'offered' ? 'Offer sent' : 'Verification passed'
}

export function LenderPortal({ path }: { path: string }) {
  const { lenderId, section, requestId } = lenderRoute(path)
  const personaId = useDemoStore((state) => state.personaId)
  const lenders = useDemoStore((state) => state.lenders)
  const issuers = useDemoStore((state) => state.issuers)
  const borrowers = useDemoStore((state) => state.borrowers)
  const credentials = useDemoStore((state) => state.credentials)
  const lenderRequests = useDemoStore((state) => state.lenderRequests)
  const offers = useDemoStore((state) => state.offers)
  const activity = useDemoStore((state) => state.activity)
  const policies = useDemoStore((state) => state.policies)
  const query = useQuery({ queryKey: ['lender-portal', lenderId, personaId], queryFn: async () => {
    const [requests, policy, registry, people, audit, proofs] = await Promise.all([getLenderRequests(lenderId), getPolicies(lenderId), getIssuers(), getBorrowers(), getAuditLog(), getCredentials(personaId)])
    return { requests, policy, registry, people, audit, proofs }
  } })
  const lender = lenders.find((item) => item.id === lenderId)
  const requests = lenderRequests.filter((request) => request.lenderId === lenderId)
  const heading = section === 'overview' ? 'Lending overview' : section === 'requests' ? 'Borrower requests' : section === 'request-detail' ? 'Request review' : section === 'policy' ? 'Underwriting policy' : section === 'issuers' ? 'Trusted issuers' : section === 'offers' ? 'Loan offers' : section === 'compliance' ? 'Compliance controls' : 'Workspace settings'
  return <PortalQueryState loading={query.isLoading} error={query.isError} retry={() => { void query.refetch() }}>
    {!lender ? <EmptyState title="Lender not found" description="Choose Lender A or Lender B from the entity selector to open its workspace." /> : <div className="grid gap-6">
      <PortalHeading eyebrow={`${lender.name} · ${lender.id}`} title={heading} description={section === 'request-detail' ? 'Review the exact proofs and checks attached to this borrower request.' : 'Make decisions from verifiable evidence while retaining only the claims disclosed for underwriting.'} />
      {section === 'overview' && <LenderOverview lender={lender} requests={requests} offers={offers} />}
      {section === 'requests' && <RequestsPage lender={lender} requests={requests} />}
      {section === 'request-detail' && <RequestDetail lender={lender} request={requests.find((request) => request.id === requestId)} allRequests={lenderRequests} borrowers={borrowers} credentials={credentials} issuers={issuers} offers={offers} />}
      {section === 'policy' && <PolicyPage lender={lender} policy={policies.find((item) => item.lenderId === lenderId)} />}
      {section === 'issuers' && <TrustedIssuersPage issuers={issuers} />}
      {section === 'offers' && <OffersPage lender={lender} requests={requests} offers={offers} />}
      {section === 'compliance' && <CompliancePage lender={lender} activity={activity} requests={requests} />}
      {section === 'settings' && <SettingsPage key={lenderId} lender={lender} />}
    </div>}
  </PortalQueryState>
}

function LenderOverview({ lender, requests, offers }: { lender: Lender; requests: LenderRequest[]; offers: ReturnType<typeof useDemoStore.getState>['offers'] }) {
  const verified = requests.filter((request) => ['verified', 'offered', 'accepted'].includes(request.status)).length
  const rejected = requests.filter((request) => request.status === 'rejected' || request.status === 'revoked').length
  const sent = requests.filter((request) => request.status === 'offered' || request.status === 'accepted').length
  const accepted = requests.filter((request) => request.status === 'accepted').length
  const rows = [...requests].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).map((request) => ({ id: request.id, borrower: request.borrowerAlias, received: formatDate(request.receivedAt, 'd MMM, HH:mm'), status: request.status, result: requestResult(request) }))
  const columns = [{ key: 'borrower' as const, label: 'Borrower' }, { key: 'received' as const, label: 'Received' }, { key: 'status' as const, label: 'Status', render: (row: (typeof rows)[number]) => <StatusBadge status={row.status} /> }, { key: 'result' as const, label: 'Result' }, { key: 'id' as const, label: 'Review', render: (row: (typeof rows)[number]) => <Button size="xs" variant="ghost" nativeButton={false} render={<Link href={`/lender/${lender.id}/requests/${row.id}`} />}>Open <ArrowRight data-icon="inline-end" /></Button> }]
  return <div className="grid gap-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Requests" value={requests.length} icon={<FileText />} /><StatCard label="Verified" value={verified} icon={<BadgeCheck />} accent="teal" /><StatCard label="Rejected" value={rejected} icon={<X />} accent="amber" /><StatCard label="Offers sent" value={sent} icon={<CircleDollarSign />} accent="violet" /><StatCard label="Accepted" value={accepted} icon={<Check />} /></div><div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]"><Card><CardHeader><CardTitle className="text-sm">Request funnel</CardTitle><CardDescription>Verification to offer acceptance.</CardDescription></CardHeader><CardContent><FunnelChart verified={verified} offered={sent} accepted={accepted} /></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Requests over time</CardTitle><CardDescription>Daily application volume across the last seven days.</CardDescription></CardHeader><CardContent><RequestsAreaChart /></CardContent></Card></div><Card><CardHeader><SectionHeading title="Recent requests" description="New borrower-run requests are added to this shared request queue." /></CardHeader><CardContent><DataTable rows={rows} columns={columns} pageSize={10} /></CardContent></Card><div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" />Policy profile · {lender.policy.foirLimit}% FOIR ceiling · {offers.filter((offer) => offer.lenderId === lender.id).length} offer templates</div></div>
}

function RequestsPage({ lender, requests }: { lender: Lender; requests: LenderRequest[] }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const filtered = requests.filter((request) => statusFilter === 'all' || request.status === statusFilter)
  const rows = [...filtered].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).map((request) => ({ id: request.id, status: request.status, borrower: request.borrowerAlias, received: formatDate(request.receivedAt, 'd MMM yyyy, HH:mm'), result: requestResult(request) }))
  const columns = [{ key: 'status' as const, label: 'Status', render: (row: (typeof rows)[number]) => <StatusBadge status={row.status} /> }, { key: 'borrower' as const, label: 'Borrower alias' }, { key: 'received' as const, label: 'Received' }, { key: 'result' as const, label: 'Verification result' }, { key: 'id' as const, label: 'Details', render: (row: (typeof rows)[number]) => <Button size="xs" variant="outline" nativeButton={false} render={<Link href={`/lender/${lender.id}/requests/${row.id}`} />}>Review</Button> }]
  return <Card><CardHeader><SectionHeading title="Request queue" description="Search, sort, and filter every incoming presentation by its current review status." action={<label className="grid gap-1 text-[10px] text-muted-foreground">Status filter<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 min-w-36 rounded-lg border border-border bg-background px-3 text-xs text-foreground"><option value="all">All statuses</option><option value="offered">Offered</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="revoked">Revoked</option><option value="accepted">Accepted</option><option value="expired">Expired</option></select></label>} /></CardHeader><CardContent><DataTable rows={rows} columns={columns} pageSize={10} /></CardContent></Card>
}

function RequestDetail({ lender, request, allRequests, borrowers, credentials, issuers, offers }: { lender: Lender; request?: LenderRequest; allRequests: LenderRequest[]; borrowers: ReturnType<typeof useDemoStore.getState>['borrowers']; credentials: ReturnType<typeof useDemoStore.getState>['credentials']; issuers: ReturnType<typeof useDemoStore.getState>['issuers']; offers: ReturnType<typeof useDemoStore.getState>['offers'] }) {
  if (!request) return <EmptyState title="Request not found" description="This request may have expired or is outside the selected lender workspace." />
  const borrowerId = subjectIdFor(request)
  const borrower = borrowers.find((item) => item.id === borrowerId)
  const checklist = buildVerificationChecklist(request, borrower, credentials, issuers)
  const rejected = request.status === 'rejected' || request.status === 'revoked' || checklist.some((check) => !check.passed)
  const offer = request.offerId ? offers.find((item) => item.id === request.offerId) : offers.find((item) => item.lenderId === lender.id)
  const policyRules = request.underwriting.policyChecks.map((rule, index) => ({ id: `${request.id}-policy-${index}`, rule: rule.rule, threshold: rule.threshold, value: rule.value, result: rule.passed ? 'Pass' : 'Fail', passed: rule.passed }))
  const policyColumns = [{ key: 'rule' as const, label: 'Policy rule' }, { key: 'threshold' as const, label: 'Threshold' }, { key: 'value' as const, label: 'Value' }, { key: 'result' as const, label: 'Result', render: (row: (typeof policyRules)[number]) => <StatusBadge status={row.passed ? 'verified' : 'failed'} label={row.result} /> }]
  const evidenceRows = [...request.disclosedClaims.map((claim, index) => ({ id: `disclosed-${index}`, claim, state: 'Disclosed to lender', disclosed: true })), ...request.withheldClaims.map((claim, index) => ({ id: `withheld-${index}`, claim, state: 'Not shared by borrower (not needed)', disclosed: false }))]
  const evidenceColumns = [{ key: 'claim' as const, label: 'Claim' }, { key: 'state' as const, label: 'Disclosure state', render: (row: (typeof evidenceRows)[number]) => <span className={row.disclosed ? 'text-success' : 'text-muted-foreground'}>{row.state}</span> }]
  const breakdownTotal = Math.max(1, request.underwriting.riskBreakdown.reduce((total, item) => total + item.score, 0))
  const eventTimeline = [{ label: 'Request received', detail: `Presentation received for ${request.borrowerAlias}`, timestamp: request.receivedAt }, { label: 'Credential checks', detail: rejected ? checklist.find((item) => !item.passed)?.detail ?? 'A verification check failed.' : 'Signature, trust, expiry, status, holder, and nonce checks completed.', timestamp: request.receivedAt }, { label: 'Underwriting decision', detail: rejected ? 'No offer issued' : request.status === 'accepted' ? 'Borrower accepted the offer' : 'Policy rules evaluated against disclosed claims.', timestamp: request.receivedAt }]
  return <div className="grid gap-4">
    <Card className={rejected ? 'border-danger/30 bg-danger/[0.025]' : ''}><CardContent className="flex flex-wrap items-start justify-between gap-3 pt-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Request {request.id}</p><h2 className="mt-1 text-lg font-semibold">{request.borrowerAlias}</h2><p className="mt-1 text-xs text-muted-foreground">Received {formatDate(request.receivedAt, 'd MMM yyyy, HH:mm')}</p></div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={rejected ? 'rejected' : request.status} /><HashChip value={request.auditHash ?? `0x${request.id.replaceAll('-', '').slice(-12)}…audit`} label="Audit" /></div></CardContent></Card>
    {rejected && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/[0.07] px-4 py-3 text-sm text-danger">No offer issued · {checklist.find((item) => !item.passed)?.detail ?? requestResult(request)}</div>}
    <div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle className="text-sm">Verification checklist</CardTitle><CardDescription>All six checks are evaluated before underwriting.</CardDescription></CardHeader><CardContent className="grid gap-3">{checklist.map((check) => <div key={check.label} className="flex items-start gap-3"><span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${check.passed ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{check.passed ? <Check className="size-3" /> : <X className="size-3" />}</span><div><p className="text-xs font-medium">{check.label}</p><p className={`mt-0.5 text-[11px] leading-4 ${check.passed ? 'text-muted-foreground' : 'text-danger'}`}>{check.detail}</p></div></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Evidence received</CardTitle><CardDescription>Only claims actively disclosed for this request are retained.</CardDescription></CardHeader><CardContent><DataTable rows={evidenceRows} columns={evidenceColumns} pageSize={10} /></CardContent></Card></div>
    <Card><CardHeader><CardTitle className="text-sm">Underwriting</CardTitle><CardDescription>Policy-based indicators are calculated from disclosed claims, not raw documents.</CardDescription></CardHeader><CardContent className="grid gap-5"><div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-border/70 bg-background/40 p-4"><Gauge value={request.underwriting.foir} label="FOIR" max={lender.policy.foirLimit} /><p className="mt-3 text-[10px] text-muted-foreground">Policy ceiling {lender.policy.foirLimit}%</p></div><div className="rounded-xl border border-border/70 bg-background/40 p-4"><div className="flex items-center justify-between gap-3"><Gauge value={request.underwriting.riskScore} label="Risk score" max={100} /><StatusBadge status={request.underwriting.riskSegment === 'LOW' ? 'verified' : request.underwriting.riskSegment === 'MEDIUM' ? 'pending' : 'failed'} label={request.underwriting.riskSegment} /></div></div></div><div><p className="mb-2 text-xs font-medium">Risk score breakdown</p>{request.underwriting.riskBreakdown.length ? <><div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-label="Stacked risk score breakdown">{request.underwriting.riskBreakdown.map((item, index) => <span key={item.label} title={`${item.label}: ${item.score}`} className={['bg-primary', 'bg-info', 'bg-accent', 'bg-chain'][index % 4]} style={{ width: `${item.score / breakdownTotal * 100}%` }} />)}</div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{request.underwriting.riskBreakdown.map((item) => <span key={item.label} className="text-[10px] text-muted-foreground">{item.label}: {item.score}</span>)}</div></> : <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] leading-5 text-muted-foreground">Risk scoring was not run because a verification check stopped this request.</p>}</div><DataTable rows={policyRules} columns={policyColumns} pageSize={6} /></CardContent></Card>
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]"><Card><CardHeader><CardTitle className="text-sm">Offer built</CardTitle></CardHeader><CardContent>{rejected ? <EmptyState title="No offer issued" description="A failing verification step prevents underwriting and offer generation." /> : offer ? <div className="grid gap-4"><div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Metric label="Amount" value={formatINR(offer.principal)} /><Metric label="Rate" value={`${offer.rate}% APR`} /><Metric label="Tenure" value={`${offer.tenure} months`} /><Metric label="EMI" value={formatINR(offer.emi, { decimals: 2 })} /><Metric label="Fees" value={formatINR(offer.processingFee + offer.gst)} /><Metric label="Total repayment" value={formatINR(offer.totalRepayment, { decimals: 2 })} /></div><HashChip value={offer.offerHash} label="Offer hash" /></div> : <EmptyState title="Offer pending" description="No matching offer is attached to this request yet." />}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Event timeline</CardTitle></CardHeader><CardContent><ol className="grid gap-4">{eventTimeline.map((event, index) => <li key={event.label} className="flex gap-3"><span className={`mt-1 size-2 shrink-0 rounded-full ${rejected && index === 1 ? 'bg-danger' : 'bg-primary'}`} /><div><p className="text-xs font-medium">{event.label}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{event.detail}</p><p className="mt-1 text-[10px] text-muted-foreground">{formatDate(event.timestamp, 'd MMM, HH:mm')}</p></div></li>)}</ol></CardContent></Card></div>
    <div className="flex flex-wrap gap-2"><Button variant="outline" nativeButton={false} render={<Link href={`/lender/${lender.id}/requests`} />}>Back to requests</Button><span className="self-center text-[10px] text-muted-foreground">{allRequests.length} requests in the shared network</span></div>
  </div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{value}</p></div>
}

function PolicyPage({ lender, policy }: { lender: Lender; policy?: ReturnType<typeof useDemoStore.getState>['policies'][number] }) {
  const saveLenderPolicy = useDemoStore((state) => state.saveLenderPolicy)
  const [editing, setEditing] = useState(false)
  const [foir, setFoir] = useState(String(policy?.foirLimit ?? lender.policy.foirLimit))
  const [fee, setFee] = useState(String(policy?.feePercent ?? lender.policy.feePercent))
  const [income, setIncome] = useState(String(lender.policy.minIncome))
  if (!policy) return <EmptyState title="Policy not found" description="This lender does not have a policy document in the mock registry." />
  const currentFoir = policy.foirLimit
  function save() {
    const nextFoir = Number(foir)
    const nextFee = Number(fee)
    const nextIncome = Number(income)
    if (![nextFoir, nextFee, nextIncome].every(Number.isFinite) || nextFoir < 1 || nextFoir > 100 || nextFee < 0 || nextFee > 10 || nextIncome < 0) {
      toast.error('Enter valid policy values before saving.')
      return
    }
    saveLenderPolicy(lender.id, { foirLimit: nextFoir, feePercent: nextFee, minIncome: nextIncome })
    toast.success(`Policy saved as v1.0.1 · FOIR ${currentFoir}% → ${nextFoir}%`)
    setEditing(false)
  }
  return <div className="grid gap-4"><Card><CardHeader><SectionHeading title="Policy profile" description={`Current version ${policy.revisionLabel ?? `v${policy.version}.0`} · effective ${formatDate(policy.effectiveAt)}`} action={<Button variant={editing ? 'secondary' : 'outline'} size="sm" onClick={() => setEditing((value) => !value)}><SlidersHorizontal data-icon="inline-start" />{editing ? 'Cancel edit' : 'Edit policy'}</Button>} /></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><PolicyCard icon={<BadgeCheck />} title="Eligibility" rows={policy.eligibility} /><PolicyCard icon={<CircleDollarSign />} title="Limits" rows={[`Amount ${formatINR(policy.amountRange[0])}–${formatINR(policy.amountRange[1])}`, `Tenure ${policy.tenureMonths[0]}–${policy.tenureMonths[1]} months`, `Minimum income ${formatINR(Number(income))}`, `FOIR limit ${Number(foir)}%`]} /><PolicyCard icon={<Activity />} title="Rate slabs" rows={Object.entries(policy.rateByRisk).map(([risk, rate]) => `${risk}: ${rate === null ? 'Not offered' : `${rate}% APR`}`)} /><PolicyCard icon={<FileCheck2 />} title="Fees" rows={[`Processing ${Number(fee)}%`, `GST ${policy.gstPercent}% on fees`, 'No hidden charges']} /></CardContent>{editing && <CardContent className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3"><label className="grid gap-1 text-xs">FOIR limit (%)<Input type="number" min="1" max="100" value={foir} onChange={(event) => setFoir(event.target.value)} /></label><label className="grid gap-1 text-xs">Processing fee (%)<Input type="number" min="0" max="10" step="0.1" value={fee} onChange={(event) => setFee(event.target.value)} /></label><label className="grid gap-1 text-xs">Minimum income (₹)<Input type="number" min="0" step="1000" value={income} onChange={(event) => setIncome(event.target.value)} /></label><div className="sm:col-span-3"><Button onClick={save}>Save policy</Button></div></CardContent>}</Card><Card><CardHeader><CardTitle className="text-sm">Decision safeguards</CardTitle></CardHeader><CardContent className="grid gap-2 text-xs text-muted-foreground"><p>Policy evaluation uses disclosed claims only; raw statements and employer details are not required.</p><p>Every edit is stored as a versioned mock document and changes the lender’s shared policy state.</p></CardContent></Card></div>
}

function PolicyCard({ icon, title, rows }: { icon: React.ReactNode; title: string; rows: string[] }) {
  return <Card className="bg-background/35"><CardHeader className="flex-row items-center gap-2 pb-2"><span className="text-primary">{icon}</span><CardTitle className="text-xs">{title}</CardTitle></CardHeader><CardContent className="grid gap-2">{rows.map((row) => <p key={row} className="text-[11px] leading-4 text-muted-foreground">{row}</p>)}</CardContent></Card>
}

function TrustedIssuersPage({ issuers }: { issuers: ReturnType<typeof useDemoStore.getState>['issuers'] }) {
  const rows = issuers.filter((issuer) => issuer.registryStatus === 'active').map((issuer) => ({ id: issuer.id, name: issuer.name, did: issuer.did, schemas: issuer.schemas.join(', '), status: issuer.registryStatus }))
  const columns = [{ key: 'name' as const, label: 'Issuer' }, { key: 'did' as const, label: 'Issuer DID' }, { key: 'schemas' as const, label: 'Accepted schemas' }, { key: 'status' as const, label: 'Registry status', render: (row: (typeof rows)[number]) => <StatusBadge status={row.status} /> }]
  return <Card><CardHeader><SectionHeading title="Trusted issuer registry" description="These issuer keys are checked before any credential claim is used for underwriting." /></CardHeader><CardContent><DataTable rows={rows} columns={columns} pageSize={10} /></CardContent></Card>
}

function OffersPage({ lender, requests, offers }: { lender: Lender; requests: LenderRequest[]; offers: ReturnType<typeof useDemoStore.getState>['offers'] }) {
  const rows = requests.map((request) => {
    const offer = request.offerId ? offers.find((item) => item.id === request.offerId) : undefined
    return { id: request.id, borrower: request.borrowerAlias, amount: offer ? formatINR(offer.principal) : ['rejected', 'revoked'].includes(request.status) ? '—' : formatINR(lender.policy.minAmount + 10000), rate: offer ? `${offer.rate}%` : ['rejected', 'revoked'].includes(request.status) ? '—' : `${lender.policy.feePercent + 20}%`, tenure: offer ? `${offer.tenure} months` : ['rejected', 'revoked'].includes(request.status) ? '—' : '18 months', outcome: requestOutcome(request), requestId: request.id }
  })
  const columns = [{ key: 'borrower' as const, label: 'Borrower' }, { key: 'amount' as const, label: 'Amount' }, { key: 'rate' as const, label: 'Rate' }, { key: 'tenure' as const, label: 'Tenure' }, { key: 'outcome' as const, label: 'Outcome', render: (row: (typeof rows)[number]) => <StatusBadge status={row.outcome} label={row.outcome} /> }, { key: 'requestId' as const, label: 'Request', render: (row: (typeof rows)[number]) => <Link href={`/lender/${lender.id}/requests/${row.requestId}`} className="text-primary hover:underline">Review</Link> }]
  return <Card><CardHeader><SectionHeading title="Offer outcomes" description="A lender view of offers associated with shared requests and their latest lifecycle outcome." /></CardHeader><CardContent><DataTable rows={rows} columns={columns} pageSize={10} /></CardContent></Card>
}

function CompliancePage({ lender, activity, requests }: { lender: Lender; activity: ReturnType<typeof useDemoStore.getState>['activity']; requests: LenderRequest[] }) {
  const requestIds = new Set(requests.map((request) => request.id))
  const [currentTime] = useState(() => Date.now())
  const rows = activity.filter((item) => item.requestId && requestIds.has(item.requestId) && item.lenderId === lender.id).map((item) => {
    const retainedUntil = new Date(Date.parse(item.timestamp) + 365 * 86400000)
    const days = Math.max(0, Math.ceil((retainedUntil.getTime() - currentTime) / 86400000))
    return { id: item.id, request: item.requestId ?? '', claims: item.categories?.join(', ') ?? 'Disclosed claims', disclosedAt: formatDate(item.timestamp, 'd MMM yyyy'), retention: `Retain until ${formatDate(retainedUntil.toISOString())} · ${days} days` }
  })
  const columns = [{ key: 'request' as const, label: 'Request' }, { key: 'claims' as const, label: 'Disclosed claims retained' }, { key: 'disclosedAt' as const, label: 'Received' }, { key: 'retention' as const, label: 'Retention countdown' }]
  return <div className="grid gap-4"><Card><CardHeader><SectionHeading title="Disclosure log" description="A record is created for the exact claim categories the borrower disclosed." /></CardHeader><CardContent><DataTable rows={rows} columns={columns} pageSize={10} /></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Data handling and responsibility</CardTitle></CardHeader><CardContent className="grid gap-3 text-xs leading-5 text-muted-foreground"><p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />Only disclosed claims are held for this request. Raw documents, exact income, and withheld claims are not retained by this mock lender portal.</p><p><strong className="text-foreground">Grievance contact:</strong> compliance@{lender.id === 'lender-a' ? 'quickrepair' : 'graminwc'}.sanad.demo · +91 80 4000 2140</p><p><strong className="text-foreground">Credit decision responsibility:</strong> the lender remains responsible for its credit decision, policy, and applicable regulatory obligations.</p></CardContent></Card></div>
}

function SettingsPage({ lender }: { lender: Lender }) {
  const updateSettings = useDemoStore((state) => state.updateLenderSettings)
  const [webhookUrl, setWebhookUrl] = useState(lender.webhookUrl ?? `https://api.${lender.id}.sanad.demo/webhooks/requests`)
  const notifications = lender.notifications ?? { email: true, webhook: true }
  function rotateKey() {
    const suffix = Math.random().toString(16).slice(2, 6).toUpperCase()
    updateSettings(lender.id, { apiKeyMasked: `sk_sanad_••••••••${suffix}` })
    toast.success('Masked API key rotated in the shared workspace')
  }
  function saveWebhook() {
    try {
      const parsed = new URL(webhookUrl)
      if (parsed.protocol !== 'https:') throw new Error('Webhook URL must use HTTPS.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enter a valid webhook URL.')
      return
    }
    updateSettings(lender.id, { webhookUrl })
    toast.success('Webhook endpoint saved')
  }
  return <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]"><Card><CardHeader><CardTitle className="text-sm">API access</CardTitle><CardDescription>The actual key is never displayed in this prototype.</CardDescription></CardHeader><CardContent className="grid gap-4"><div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><div><p className="text-[10px] text-muted-foreground">Masked API key</p><p className="mt-1 font-mono text-xs">{lender.apiKeyMasked}</p></div><Button size="sm" variant="outline" onClick={rotateKey}><RefreshCw data-icon="inline-start" />Rotate</Button></div><label className="grid gap-2 text-xs"><span className="flex items-center gap-2 font-medium"><Webhook className="size-4 text-primary" />Webhook URL</span><Input type="url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://api.example.com/webhooks" /></label><Button className="w-fit" size="sm" onClick={saveWebhook}>Save webhook URL</Button></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Notifications</CardTitle><CardDescription>Update the shared lender preferences for this workspace.</CardDescription></CardHeader><CardContent className="grid gap-4"><NotificationToggle label="Email on new requests" checked={notifications.email} icon={<Bell />} onChange={(email) => updateSettings(lender.id, { notifications: { ...notifications, email } })} /><NotificationToggle label="Webhook on request updates" checked={notifications.webhook} icon={<Webhook />} onChange={(webhook) => updateSettings(lender.id, { notifications: { ...notifications, webhook } })} /></CardContent></Card></div>
}

function NotificationToggle({ label, checked, icon, onChange }: { label: string; checked: boolean; icon: React.ReactNode; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><span className="flex items-center gap-2 text-xs">{icon}{label}</span><Switch checked={checked} onCheckedChange={onChange} aria-label={label} /></label>
}
